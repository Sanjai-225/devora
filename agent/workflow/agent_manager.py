"""Devora Agent — Agent session manager.

Manages agent workflow sessions: starting analysis, resuming after
user input, and tracking active sessions.
"""

import logging
from typing import Any, AsyncGenerator, Optional

from langchain_core.messages import AIMessage, HumanMessage

from agent.providers.gemini_provider import GeminiProvider
from agent.providers.llm_provider import LLMProvider
from agent.workflow.graph import build_requirement_graph, create_agent_workflow
from agent.workflow.state import AgentState

logger = logging.getLogger(__name__)


class AgentSession:
    """Manages a single agent session for a project."""

    def __init__(
        self,
        project_id: str,
        user_id: str,
        llm: LLMProvider,
        compiled_graph: Any,
    ):
        self.project_id = project_id
        self.user_id = user_id
        self.llm = llm
        self.graph = compiled_graph
        self.thread_id = f"{user_id}_{project_id}"

    @property
    def config(self) -> dict:
        """LangGraph config with thread ID for checkpointing."""
        return {"configurable": {"thread_id": self.thread_id}}

    async def start_analysis(self, user_request: str) -> AsyncGenerator[dict, None]:
        """Start requirement analysis for a new project.
        
        Yields events as they occur in the workflow.
        """
        logger.info(f"Starting analysis for project {self.project_id}")

        initial_state = {
            "user_id": self.user_id,
            "project_id": self.project_id,
            "user_request": user_request,
            "messages": [HumanMessage(content=user_request)],
        }

        async for event in self.graph.astream(initial_state, self.config):
            for node_name, node_output in event.items():
                if node_name == "__end__":
                    continue

                logger.info(f"Node '{node_name}' completed")

                yield {
                    "type": "node_complete",
                    "node": node_name,
                    "stage": node_output.get("current_stage", "unknown"),
                    "response": node_output.get("agent_response"),
                    "should_wait": node_output.get("should_wait_for_user", False),
                    "wait_reason": node_output.get("wait_reason"),
                    "requirements": node_output.get("requirements"),
                    "clarification_questions": node_output.get("clarification_questions"),
                    "confirmed_stack": node_output.get("confirmed_stack"),
                    "error": node_output.get("error"),
                }

    async def resume_with_input(
        self, user_input: str, input_type: str = "message"
    ) -> AsyncGenerator[dict, None]:
        """Resume the workflow after user input.
        
        Args:
            user_input: The user's response text
            input_type: Type of input ('clarification', 'stack_confirmation', 'message')
        """
        logger.info(
            f"Resuming session for project {self.project_id}, input_type={input_type}"
        )

        # Get current state
        state = await self.graph.aget_state(self.config)
        current_state = state.values if state else {}

        if input_type == "clarification":
            # User answered clarification questions
            update = {
                "clarification_answers": [{"content": user_input}],
                "should_wait_for_user": False,
                "messages": [HumanMessage(content=user_input)],
            }
            # We need to invoke process_answers then continue
            # Update state and resume from process_answers
            await self.graph.aupdate_state(self.config, update, as_node="check_clarification")
            
            # Now stream from process_answers
            async for event in self.graph.astream(None, self.config):
                for node_name, node_output in event.items():
                    if node_name == "__end__":
                        continue
                    yield {
                        "type": "node_complete",
                        "node": node_name,
                        "stage": node_output.get("current_stage", "unknown"),
                        "response": node_output.get("agent_response"),
                        "should_wait": node_output.get("should_wait_for_user", False),
                        "wait_reason": node_output.get("wait_reason"),
                        "requirements": node_output.get("requirements"),
                        "confirmed_stack": node_output.get("confirmed_stack"),
                        "error": node_output.get("error"),
                    }

        elif input_type == "stack_confirmation":
            # User confirmed/modified stack
            user_lower = user_input.lower().strip()

            if any(word in user_lower for word in ["proceed", "yes", "confirm", "go", "1", "✅"]):
                update = {
                    "stack_confirmed": True,
                    "should_wait_for_user": False,
                    "messages": [HumanMessage(content=user_input)],
                }
                await self.graph.aupdate_state(self.config, update, as_node="confirm_stack")

                # Resume — workflow will continue to next phase (or END for Phase 2)
                async for event in self.graph.astream(None, self.config):
                    for node_name, node_output in event.items():
                        if node_name == "__end__":
                            continue
                        yield {
                            "type": "node_complete",
                            "node": node_name,
                            "stage": node_output.get("current_stage", "unknown"),
                            "response": node_output.get("agent_response"),
                            "should_wait": node_output.get("should_wait_for_user", False),
                            "wait_reason": node_output.get("wait_reason"),
                            "error": node_output.get("error"),
                        }

                # Stack confirmed, emit completion for Phase 2
                yield {
                    "type": "phase_complete",
                    "stage": "stack_confirmed",
                    "response": (
                        "✅ Technology stack confirmed! Your project requirements are locked in.\n\n"
                        "In the next phase, you'll be able to choose whether to design a visual "
                        "prototype first or go straight to code generation."
                    ),
                }

            elif any(word in user_lower for word in ["design", "2", "🎨"]):
                update = {
                    "design_choice": "design_first",
                    "stack_confirmed": True,
                    "should_wait_for_user": False,
                    "messages": [HumanMessage(content=user_input)],
                }
                await self.graph.aupdate_state(self.config, update, as_node="confirm_stack")

                yield {
                    "type": "phase_complete",
                    "stage": "design_chosen",
                    "response": (
                        "🎨 Great choice! I'll create a visual prototype first.\n\n"
                        "The Design Studio will be available in the next phase."
                    ),
                }

            else:
                # User wants to modify something — re-run analysis with additional context
                yield {
                    "type": "node_complete",
                    "stage": "stack_modification",
                    "response": (
                        "I'll update the requirements based on your feedback. "
                        "Let me re-analyze with your modifications."
                    ),
                    "should_wait": False,
                }

    async def get_current_state(self) -> Optional[dict]:
        """Get the current workflow state."""
        try:
            state = await self.graph.aget_state(self.config)
            return state.values if state else None
        except Exception as e:
            logger.error(f"Failed to get state: {e}")
            return None


class AgentManager:
    """Manages all active agent sessions."""

    def __init__(self, gemini_api_key: str, checkpoint_path: str = "checkpoints/agent.db"):
        self.gemini_api_key = gemini_api_key
        self.checkpoint_path = checkpoint_path
        self._llm: Optional[LLMProvider] = None
        self._compiled_graph = None
        self._checkpointer = None
        self._sessions: dict[str, AgentSession] = {}

    async def initialize(self) -> None:
        """Initialize the LLM provider and compile the graph."""
        if self._llm is not None:
            return

        self._llm = GeminiProvider(api_key=self.gemini_api_key)
        self._compiled_graph, self._checkpointer = await create_agent_workflow(
            self._llm, self.checkpoint_path
        )
        logger.info("AgentManager initialized")

    def get_session(self, project_id: str, user_id: str) -> AgentSession:
        """Get or create an agent session for a project."""
        key = f"{user_id}_{project_id}"
        if key not in self._sessions:
            self._sessions[key] = AgentSession(
                project_id=project_id,
                user_id=user_id,
                llm=self._llm,
                compiled_graph=self._compiled_graph,
            )
        return self._sessions[key]

    async def cleanup(self) -> None:
        """Cleanup resources."""
        if self._checkpointer:
            try:
                await self._checkpointer.conn.close()
            except Exception:
                pass
        self._sessions.clear()
        logger.info("AgentManager cleaned up")

