"""Devora Agent — LangGraph workflow graph.

Builds and compiles the LangGraph StateGraph for the agent workflow.
Phase 2 implements: requirement_analysis → clarification → stack_confirmation.
"""

import logging
import os
from typing import Any, Optional

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
    """Conditional edge: route to clarification pause or stack confirmation."""
    if state.get("needs_clarification") and state.get("clarification_questions"):
        return "ask_clarification"
    return "confirm_stack"


def _after_answer(state: AgentState) -> str:
    """Conditional edge: after processing answers, go to stack confirmation."""
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
        → (needs_clarification?) → interrupt before process_answers (wait for user)
        → process_answers → confirm_stack → END (wait for user confirmation)
        → (no clarification needed) → confirm_stack → END (wait for user confirmation)
    """

    graph = StateGraph(AgentState)

    # ── Add nodes ───────────────────────────────────────────────────
    async def _analyze_node(state: AgentState) -> dict:
        return await analyze_requirements(state, llm)

    async def _clarify_node(state: AgentState) -> dict:
        return await check_clarification(state, llm)

    async def _process_answers_node(state: AgentState) -> dict:
        return await process_answers(state, llm)

    async def _confirm_stack_node(state: AgentState) -> dict:
        return await confirm_stack(state, llm)

    graph.add_node("analyze_requirements", _analyze_node)
    graph.add_node("check_clarification", _clarify_node)
    graph.add_node("process_answers", _process_answers_node)
    graph.add_node("confirm_stack", _confirm_stack_node)

    # ── Set entry point ─────────────────────────────────────────────
    graph.set_entry_point("analyze_requirements")

    # ── Add edges ───────────────────────────────────────────────────
    graph.add_edge("analyze_requirements", "check_clarification")

    graph.add_conditional_edges(
        "check_clarification",
        _should_clarify,
        {
            "ask_clarification": "process_answers",  # Interrupted before process_answers to wait for user answers
            "confirm_stack": "confirm_stack",
        },
    )

    # After user provides answers and process_answers runs, route to confirm_stack:
    graph.add_conditional_edges(
        "process_answers",
        _after_answer,
        {
            "check_clarification": "check_clarification",
            "confirm_stack": "confirm_stack",
        },
    )

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
) -> tuple[Any, Any]:
    """Create the compiled agent workflow with SQLite checkpointer (or MemorySaver fallback).

    Returns:
        tuple: (compiled_graph, checkpointer)
    """
    checkpointer = None
    try:
        from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

        if checkpoint_path != ":memory:":
            os.makedirs(os.path.dirname(checkpoint_path) or ".", exist_ok=True)
        checkpointer = AsyncSqliteSaver.from_conn_string(checkpoint_path)
        await checkpointer.setup()
        logger.info(f"Initialized AsyncSqliteSaver at {checkpoint_path}")
    except Exception as e:
        logger.warning(f"AsyncSqliteSaver unavailable ({e}), falling back to MemorySaver")
        from langgraph.checkpoint.memory import MemorySaver

        checkpointer = MemorySaver()

    graph = build_requirement_graph(llm)
    compiled = graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["process_answers"],  # Pause before processing answers when clarification is needed
    )

    logger.info("Agent workflow compiled successfully")
    return compiled, checkpointer
