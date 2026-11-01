"""Devora Agent — LangGraph workflow graph.

Builds and compiles the LangGraph StateGraph for the agent workflow.
Phase 2 implements: requirement_analysis → clarification → stack_confirmation.
"""

import logging
from typing import Optional

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import END, StateGraph

from agent.providers.llm_provider import LLMProvider
from agent.workflow.nodes import (
    analyze_requirements,
    check_clarification,
    confirm_stack,
    process_answers,
)
from agent.workflow.state import AgentState

logger = logging.getLogger(__name__)


def _should_clarify(state: AgentState) -> str:
    """Conditional edge: route to clarification or stack confirmation."""
    if state.get("needs_clarification") and state.get("clarification_questions"):
        return "ask_clarification"
    return "confirm_stack"


def _after_answer(state: AgentState) -> str:
    """Conditional edge: after processing answers, go back to clarification check or confirm."""
    if state.get("needs_clarification"):
        return "check_clarification"
    return "confirm_stack"


def _after_stack(state: AgentState) -> str:
    """Conditional edge: after stack confirmation, wait for user."""
    # In Phase 2, the workflow pauses here for user input
    # Phase 3+ will continue to design_choice node
    return END


def build_requirement_graph(llm: LLMProvider) -> StateGraph:
    """Build the Phase 2 requirement analysis workflow graph.

    Flow:
    START → analyze_requirements → check_clarification
        → (needs_clarification?) → ask_clarification → INTERRUPT (wait for user)
        → process_answers → check_clarification (loop)
        → (no clarification needed) → confirm_stack → INTERRUPT (wait for user)
        → END
    """

    graph = StateGraph(AgentState)

    # ── Add nodes ───────────────────────────────────────────────────
    # Each node wraps the actual function to inject the LLM provider
    graph.add_node(
        "analyze_requirements",
        lambda state: analyze_requirements(state, llm),
    )
    graph.add_node(
        "check_clarification",
        lambda state: check_clarification(state, llm),
    )
    graph.add_node(
        "process_answers",
        lambda state: process_answers(state, llm),
    )
    graph.add_node(
        "confirm_stack",
        lambda state: confirm_stack(state, llm),
    )

    # ── Set entry point ─────────────────────────────────────────────
    graph.set_entry_point("analyze_requirements")

    # ── Add edges ───────────────────────────────────────────────────
    graph.add_edge("analyze_requirements", "check_clarification")

    graph.add_conditional_edges(
        "check_clarification",
        _should_clarify,
        {
            "ask_clarification": END,  # Pause for user input
            "confirm_stack": "confirm_stack",
        },
    )

    # After user provides answers and we resume:
    graph.add_edge("process_answers", "check_clarification")

    # After stack confirmation:
    graph.add_conditional_edges(
        "confirm_stack",
        _after_stack,
        {END: END},
    )

    return graph


async def create_agent_workflow(
    llm: LLMProvider,
    checkpoint_path: str = "checkpoints/agent.db",
) -> tuple:
    """Create the compiled agent workflow with SQLite checkpointer.
    
    Returns:
        tuple: (compiled_graph, checkpointer)
    """
    import os
    os.makedirs(os.path.dirname(checkpoint_path), exist_ok=True)

    checkpointer = AsyncSqliteSaver.from_conn_string(checkpoint_path)
    await checkpointer.setup()

    graph = build_requirement_graph(llm)
    compiled = graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["confirm_stack"],  # Pause before stack confirmation for display
    )

    logger.info("Agent workflow compiled with SQLite checkpointer")
    return compiled, checkpointer

