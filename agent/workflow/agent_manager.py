"""Devora Agent — Agent session manager.

Manages agent workflow sessions: starting analysis, resuming after
user input, design generation/modification/approval, and tracking
active sessions. Supports both LangGraph runtime and direct node
execution fallback.
"""

import json
import logging
from typing import Any, AsyncGenerator, Optional

from agent.providers.llm_provider import LLMMessage, LLMProvider
from agent.providers.mock_provider import MockLLMProvider
from agent.workflow.config_nodes import (
    approve_implementation_plan,
    detect_configuration_requirements,
    generate_implementation_plan,
    validate_and_apply_configuration,
)
from agent.workflow.design_nodes import (
    generate_initial_design,
    modify_design_version,
    select_design_workflow,
)

logger = logging.getLogger(__name__)

try:
    from langchain_core.messages import AIMessage, HumanMessage
    from agent.workflow.graph import create_agent_workflow

    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False


class AgentSession:
    """Manages a single agent session for a project."""

    def __init__(
        self,
        project_id: str,
        user_id: str,
        llm: LLMProvider,
        compiled_graph: Any = None,
    ):
        self.project_id = project_id
        self.user_id = user_id
        self.llm = llm
        self.graph = compiled_graph
        self.thread_id = f"{user_id}_{project_id}"
        # Local state fallback / mirror for instant inspection
        self._state: dict[str, Any] = {
            "user_id": user_id,
            "project_id": project_id,
            "user_request": "",
            "requirements": None,
            "clarification_questions": [],
            "clarification_answers": [],
            "needs_clarification": False,
            "confirmed_stack": None,
            "stack_confirmed": False,
            "design_choice": "pending",
            "design_specification": None,
            "design_versions": [],
            "approved_design_version": None,
            "design_prototype_code": None,
            "configuration_requirements": [],
            "configuration_values": {},
            "injection_guardrails": {
                "auto_generate_env_example": True,
                "zod_env_validation": True,
                "secret_redaction_in_logs": True,
                "prevent_client_secret_leaks": True,
            },
            "implementation_plan": None,
            "plan_approved": False,
            "current_stage": "init",
            "agent_response": None,
            "should_wait_for_user": False,
            "wait_reason": None,
            "error": None,
        }

    @property
    def config(self) -> dict:
        """LangGraph config with thread ID for checkpointing."""
        return {"configurable": {"thread_id": self.thread_id}}

    async def start_analysis(self, user_request: str) -> AsyncGenerator[dict, None]:
        """Start requirement analysis for a new project."""
        logger.info(f"Starting analysis for project {self.project_id}")
        self._state["user_request"] = user_request

        if self.graph is not None and HAS_LANGGRAPH:
            initial_state = {
                "user_id": self.user_id,
                "project_id": self.project_id,
                "user_request": user_request,
                "messages": [HumanMessage(content=user_request)],
            }

            async for event in self.graph.astream(initial_state, self.config):
                for node_name, node_output in event.items():
                    if node_name == "__end__" or not isinstance(node_output, dict):
                        continue

                    logger.info(f"Node '{node_name}' completed")
                    self._merge_local_state(node_output)

                    yield {
                        "type": "node_complete",
                        "node": node_name,
                        "stage": self._state.get("current_stage", "unknown"),
                        "response": node_output.get("agent_response"),
                        "should_wait": self._state.get("should_wait_for_user", False),
                        "wait_reason": self._state.get("wait_reason"),
                        "requirements": self._state.get("requirements"),
                        "clarification_questions": self._state.get("clarification_questions"),
                        "confirmed_stack": self._state.get("confirmed_stack"),
                        "error": node_output.get("error"),
                    }
            return

        async for ev in self._run_direct_analysis(user_request):
            yield ev

    async def resume_with_input(
        self, user_input: str | dict, input_type: str = "message"
    ) -> AsyncGenerator[dict, None]:
        """Resume the workflow after user input."""
        logger.info(
            f"Resuming session for project {self.project_id}, input_type={input_type}"
        )

        normalized_input = (
            json.dumps(user_input) if isinstance(user_input, dict) else str(user_input)
        )

        if self.graph is not None and HAS_LANGGRAPH:
            if input_type == "clarification":
                answer_entry = (
                    user_input
                    if isinstance(user_input, dict)
                    else {"content": normalized_input}
                )
                update = {
                    "clarification_answers": [answer_entry],
                    "should_wait_for_user": False,
                    "messages": [HumanMessage(content=normalized_input)],
                }
                self._merge_local_state(update)
                await self.graph.aupdate_state(self.config, update)

                async for event in self.graph.astream(None, self.config):
                    for node_name, node_output in event.items():
                        if node_name == "__end__" or not isinstance(node_output, dict):
                            continue
                        self._merge_local_state(node_output)
                        yield {
                            "type": "node_complete",
                            "node": node_name,
                            "stage": self._state.get("current_stage", "unknown"),
                            "response": node_output.get("agent_response"),
                            "should_wait": self._state.get("should_wait_for_user", False),
                            "wait_reason": self._state.get("wait_reason"),
                            "requirements": self._state.get("requirements"),
                            "clarification_questions": self._state.get("clarification_questions"),
                            "confirmed_stack": self._state.get("confirmed_stack"),
                            "error": node_output.get("error"),
                        }
                return

            if input_type == "stack_confirmation":
                user_lower = normalized_input.lower().strip()
                if any(word in user_lower for word in ["proceed", "yes", "confirm", "go", "1", "direct_code", "✅"]):
                    update = {
                        "design_choice": "direct_code",
                        "stack_confirmed": True,
                        "should_wait_for_user": False,
                        "current_stage": "stack_confirmed",
                        "messages": [HumanMessage(content=normalized_input)],
                    }
                    self._merge_local_state(update)
                    await self.graph.aupdate_state(self.config, update)
                    yield {
                        "type": "phase_complete",
                        "stage": "stack_confirmed",
                        "design_choice": "direct_code",
                        "requirements": self._state.get("requirements"),
                        "confirmed_stack": self._state.get("confirmed_stack"),
                        "response": (
                            "✅ Technology stack confirmed! Your project requirements are locked in.\n\n"
                            "You can now choose whether to design a visual prototype first or go straight to code generation."
                        ),
                    }
                    return

                if any(word in user_lower for word in ["design", "2", "design_first", "🎨"]):
                    update = {
                        "design_choice": "design_first",
                        "stack_confirmed": True,
                        "should_wait_for_user": False,
                        "current_stage": "design_chosen",
                        "messages": [HumanMessage(content=normalized_input)],
                    }
                    self._merge_local_state(update)
                    await self.graph.aupdate_state(self.config, update)
                    yield {
                        "type": "phase_complete",
                        "stage": "design_chosen",
                        "design_choice": "design_first",
                        "requirements": self._state.get("requirements"),
                        "confirmed_stack": self._state.get("confirmed_stack"),
                        "response": (
                            "🎨 Great choice! Opening Design Studio to generate your visual prototype."
                        ),
                    }
                    return

            combined_request = (
                f"{self._state.get('user_request', '')}\n\n"
                f"Additional user instructions/modifications: {normalized_input}"
            )
            async for ev in self.start_analysis(combined_request):
                yield ev
            return

        async for ev in self._run_direct_resume(user_input, input_type):
            yield ev

    # ── Phase 3: Design System & Prototype Methods ──────────────────

    async def set_workflow_choice(self, choice: str) -> dict[str, Any]:
        """Set design_first or direct_code workflow decision."""
        out = await select_design_workflow(self._state, choice)
        self._merge_local_state(out)
        if self.graph is not None and HAS_LANGGRAPH:
            try:
                await self.graph.aupdate_state(self.config, out)
            except Exception:
                pass
        return out

    async def generate_design(self) -> dict[str, Any]:
        """Generate initial DesignSpecification and React/TypeScript prototype."""
        out = await generate_initial_design(self._state, self.llm)
        self._merge_local_state(out)
        if self.graph is not None and HAS_LANGGRAPH:
            try:
                await self.graph.aupdate_state(self.config, out)
            except Exception:
                pass
        return out

    async def modify_design(
        self,
        instruction: str,
        token_overrides: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """Modify the current design prototype via natural language or token overrides."""
        if not self._state.get("design_specification"):
            await self.generate_design()
        out = await modify_design_version(
            self._state,
            self.llm,
            instruction=instruction,
            token_overrides=token_overrides,
        )
        self._merge_local_state(out)
        if self.graph is not None and HAS_LANGGRAPH:
            try:
                await self.graph.aupdate_state(self.config, out)
            except Exception:
                pass
        return out

    async def approve_design(self, version_id: Optional[str] = None) -> dict[str, Any]:
        """Approve a design version and advance workflow to Phase 4 (Configuration & Planning)."""
        versions = self._state.get("design_versions") or []
        if not versions:
            await self.generate_design()
            versions = self._state.get("design_versions") or []

        target_id = version_id or (versions[-1]["id"] if versions else "ver-1")
        approved_doc = None
        for v in versions:
            if v["id"] == target_id:
                v["approved"] = True
                approved_doc = v
            else:
                v["approved"] = False

        if approved_doc is None and versions:
            versions[-1]["approved"] = True
            approved_doc = versions[-1]
            target_id = approved_doc["id"]

        update = {
            "approved_design_version": target_id,
            "design_specification": approved_doc["design_spec"] if approved_doc else self._state.get("design_specification"),
            "design_prototype_code": approved_doc["prototype_code"] if approved_doc else self._state.get("design_prototype_code"),
            "current_stage": "configuration",
            "should_wait_for_user": False,
            "wait_reason": None,
            "agent_response": f"✅ Design version **{approved_doc['version_tag'] if approved_doc else target_id}** approved and synced with codebase!",
        }
        self._state.update(update)
        if self.graph is not None and HAS_LANGGRAPH:
            try:
                await self.graph.aupdate_state(self.config, update)
            except Exception:
                pass
        return {
            **update,
            "approved_version": approved_doc,
        }

    async def restore_design_version(self, version_id: str) -> Optional[dict[str, Any]]:
        """Restore a previous design version as the active design specification & prototype."""
        versions = self._state.get("design_versions") or []
        target = next((v for v in versions if v["id"] == version_id), None)
        if not target:
            return None

        self._state["design_specification"] = target["design_spec"]
        self._state["design_prototype_code"] = target["prototype_code"]
        self._state["agent_response"] = f"Restored design version **{target['version_tag']} • {target['label']}**."
        return target

    # ── Phase 4: Configuration & Implementation Plan Methods ────────

    async def detect_configuration(self) -> dict[str, Any]:
        """Detect required environment variables and secrets from project requirements."""
        if not self._state.get("requirements"):
            # Ensure default requirements exist if called standalone
            req = self.llm._extract_requirements(
                self._state.get("user_request") or "IoT Fleet Telemetry Dashboard with PostgreSQL and Stripe billing"
            ) if hasattr(self.llm, "_extract_requirements") else None
            if req is not None:
                self._state["requirements"] = req.model_dump()
        out = await detect_configuration_requirements(self._state, self.llm)
        self._state.update(out)
        if self.graph is not None and HAS_LANGGRAPH:
            try:
                await self.graph.aupdate_state(self.config, out)
            except Exception:
                pass
        return out

    async def save_configuration(
        self,
        values: dict[str, str],
        guardrails: Optional[dict[str, bool]] = None,
    ) -> dict[str, Any]:
        """Validate and save configuration values (masked in state) and update guardrails."""
        if not self._state.get("configuration_requirements"):
            await self.detect_configuration()
        out = await validate_and_apply_configuration(self._state, values, guardrails)
        self._state.update(out)
        if self.graph is not None and HAS_LANGGRAPH:
            try:
                await self.graph.aupdate_state(self.config, out)
            except Exception:
                pass
        return out

    async def generate_plan(self) -> dict[str, Any]:
        """Generate the multi-step ImplementationPlan for the project."""
        if not self._state.get("configuration_requirements"):
            await self.detect_configuration()
        out = await generate_implementation_plan(self._state, self.llm)
        self._state.update(out)
        if self.graph is not None and HAS_LANGGRAPH:
            try:
                await self.graph.aupdate_state(self.config, out)
            except Exception:
                pass
        return out

    async def approve_plan(self) -> dict[str, Any]:
        """Approve the implementation plan and advance to Phase 5 (Workspace & Execution)."""
        if not self._state.get("implementation_plan"):
            await self.generate_plan()
        out = await approve_implementation_plan(self._state)
        self._state.update(out)
        if self.graph is not None and HAS_LANGGRAPH:
            try:
                await self.graph.aupdate_state(self.config, out)
            except Exception:
                pass
        return out

    def _merge_local_state(self, node_output: dict) -> None:
        for k, v in node_output.items():
            if k in ("clarification_questions", "clarification_answers", "design_versions") and isinstance(v, list):
                existing = self._state.get(k) or []
                existing_ids = {item.get("id") for item in existing if isinstance(item, dict) and item.get("id")}
                new_items = [
                    item for item in v
                    if not (isinstance(item, dict) and item.get("id") in existing_ids)
                ]
                self._state[k] = existing + new_items
            elif v is not None or k in ("wait_reason", "error"):
                self._state[k] = v

    async def _run_direct_analysis(self, user_request: str) -> AsyncGenerator[dict, None]:
        """Fallback direct execution of requirement nodes when langgraph package is absent."""
        from agent.models.requirements import ClarificationResult, StructuredRequirements

        req: StructuredRequirements = await self.llm.generate_structured(
            messages=[LLMMessage(role="user", content=user_request)],
            output_schema=StructuredRequirements,
            system_prompt="Extract structured website requirements.",
            temperature=0.3,
        )
        req_dict = req.model_dump()
        summary = (
            f"I've analyzed your request for **{req.project_name}** ({req.project_type}).\n\n"
            f"{req.summary}\n\n"
            f"Identified **{len(req.pages)} pages** and **{len(req.features)} core features**."
        )
        self._state.update({
            "requirements": req_dict,
            "current_stage": "requirement_analysis",
            "agent_response": summary,
        })
        yield {
            "type": "node_complete",
            "node": "analyze_requirements",
            "stage": "requirement_analysis",
            "response": summary,
            "should_wait": False,
            "wait_reason": None,
            "requirements": req_dict,
            "clarification_questions": [],
            "confirmed_stack": req_dict.get("technology_stack"),
            "error": None,
        }

        clarification: ClarificationResult = await self.llm.generate_structured(
            messages=[
                LLMMessage(
                    role="user",
                    content=f"Original request: {user_request}\n\nExtracted requirements:\n{json.dumps(req_dict, indent=2)}",
                )
            ],
            output_schema=ClarificationResult,
            system_prompt="Check if clarification is needed.",
            temperature=0.2,
        )
        if clarification.needs_clarification and clarification.questions:
            q_dicts = [q.model_dump() for q in clarification.questions]
            q_msg = "Before I finalize the architecture, please clarify a few details:\n\n"
            for idx, q in enumerate(clarification.questions, 1):
                q_msg += f"**{idx}. {q.question}**\n_{q.why}_\n"
            self._state.update({
                "needs_clarification": True,
                "clarification_questions": q_dicts,
                "current_stage": "clarification",
                "agent_response": q_msg,
                "should_wait_for_user": True,
                "wait_reason": "clarification",
            })
            yield {
                "type": "node_complete",
                "node": "check_clarification",
                "stage": "clarification",
                "response": q_msg,
                "should_wait": True,
                "wait_reason": "clarification",
                "requirements": req_dict,
                "clarification_questions": q_dicts,
                "confirmed_stack": req_dict.get("technology_stack"),
                "error": None,
            }
            return

        stack_resp = await self.llm.generate(
            messages=[LLMMessage(role="user", content=json.dumps(req_dict))],
            system_prompt="Summarize the technology stack.",
        )
        stack_dict = req_dict.get("technology_stack", {})
        self._state.update({
            "needs_clarification": False,
            "confirmed_stack": stack_dict,
            "current_stage": "stack_confirmation",
            "agent_response": stack_resp.content,
            "should_wait_for_user": True,
            "wait_reason": "stack_confirmation",
        })
        yield {
            "type": "node_complete",
            "node": "confirm_stack",
            "stage": "stack_confirmation",
            "response": stack_resp.content,
            "should_wait": True,
            "wait_reason": "stack_confirmation",
            "requirements": req_dict,
            "clarification_questions": [],
            "confirmed_stack": stack_dict,
            "error": None,
        }

    async def _run_direct_resume(
        self, user_input: str | dict, input_type: str
    ) -> AsyncGenerator[dict, None]:
        """Fallback direct execution for resuming after clarification or stack confirmation."""
        from agent.models.requirements import StructuredRequirements

        normalized_input = (
            json.dumps(user_input) if isinstance(user_input, dict) else str(user_input)
        )

        if input_type == "clarification":
            prompt = (
                f"Previous requirements:\n{json.dumps(self._state.get('requirements') or {}, indent=2)}\n\n"
                f"Clarification questions asked:\n{json.dumps(self._state.get('clarification_questions') or [], indent=2)}\n\n"
                f"User's answers:\n{normalized_input}"
            )
            updated_req: StructuredRequirements = await self.llm.generate_structured(
                messages=[LLMMessage(role="user", content=prompt)],
                output_schema=StructuredRequirements,
                system_prompt="Update requirements with user answers.",
                temperature=0.2,
            )
            updated_dict = updated_req.model_dump()
            stack_dict = updated_dict.get("technology_stack", {})
            ack_msg = "Thanks for the clarifications! I've updated the system specification and locked in your stack."
            self._state.update({
                "requirements": updated_dict,
                "confirmed_stack": stack_dict,
                "needs_clarification": False,
                "current_stage": "stack_confirmation",
                "agent_response": ack_msg,
                "should_wait_for_user": True,
                "wait_reason": "stack_confirmation",
            })
            yield {
                "type": "node_complete",
                "node": "process_answers",
                "stage": "answer_processing",
                "response": ack_msg,
                "should_wait": False,
                "wait_reason": None,
                "requirements": updated_dict,
                "clarification_questions": self._state.get("clarification_questions", []),
                "confirmed_stack": stack_dict,
                "error": None,
            }
            stack_resp = await self.llm.generate(
                messages=[LLMMessage(role="user", content=json.dumps(updated_dict))],
                system_prompt="Summarize the technology stack.",
            )
            yield {
                "type": "node_complete",
                "node": "confirm_stack",
                "stage": "stack_confirmation",
                "response": stack_resp.content,
                "should_wait": True,
                "wait_reason": "stack_confirmation",
                "requirements": updated_dict,
                "clarification_questions": self._state.get("clarification_questions", []),
                "confirmed_stack": stack_dict,
                "error": None,
            }
            return

        if input_type == "stack_confirmation":
            user_lower = normalized_input.lower().strip()
            if any(w in user_lower for w in ["design", "2", "design_first", "🎨"]):
                self._state.update({
                    "design_choice": "design_first",
                    "stack_confirmed": True,
                    "should_wait_for_user": False,
                    "current_stage": "design_chosen",
                })
                yield {
                    "type": "phase_complete",
                    "stage": "design_chosen",
                    "design_choice": "design_first",
                    "requirements": self._state.get("requirements"),
                    "confirmed_stack": self._state.get("confirmed_stack"),
                    "response": "🎨 Great choice! I'll create a visual prototype first in Design Studio.",
                }
                return

            self._state.update({
                "design_choice": "direct_code",
                "stack_confirmed": True,
                "should_wait_for_user": False,
                "current_stage": "stack_confirmed",
            })
            yield {
                "type": "phase_complete",
                "stage": "stack_confirmed",
                "design_choice": "direct_code",
                "requirements": self._state.get("requirements"),
                "confirmed_stack": self._state.get("confirmed_stack"),
                "response": "✅ Technology stack confirmed! Your project requirements are locked in.",
            }
            return

        combined = f"{self._state.get('user_request', '')}\n\nUser modification: {normalized_input}"
        async for ev in self._run_direct_analysis(combined):
            yield ev

    async def get_current_state(self) -> Optional[dict]:
        """Get the current workflow state."""
        if self.graph is not None and HAS_LANGGRAPH:
            try:
                state = await self.graph.aget_state(self.config)
                if state and state.values:
                    self._merge_local_state(dict(state.values))
            except Exception as e:
                logger.warning(f"Failed to read LangGraph checkpoint state: {e}")
        return self._state


class AgentManager:
    """Manages all active agent sessions."""

    def __init__(
        self,
        gemini_api_key: str = "",
        checkpoint_path: str = "checkpoints/agent.db",
        llm_provider: Optional[LLMProvider] = None,
    ):
        self.gemini_api_key = gemini_api_key
        self.checkpoint_path = checkpoint_path
        self._llm: Optional[LLMProvider] = llm_provider
        self._compiled_graph = None
        self._checkpointer = None
        self._sessions: dict[str, AgentSession] = {}

    async def initialize(self) -> None:
        """Initialize the LLM provider and compile the graph."""
        if self._llm is None:
            if self.gemini_api_key:
                try:
                    from agent.providers.gemini_provider import GeminiProvider

                    self._llm = GeminiProvider(api_key=self.gemini_api_key)
                    logger.info("AgentManager initialized with GeminiProvider")
                except Exception as e:
                    logger.warning(f"GeminiProvider init failed ({e}), falling back to MockLLMProvider")
                    self._llm = MockLLMProvider()
            else:
                logger.info("No GEMINI_API_KEY configured — using MockLLMProvider for dev mode")
                self._llm = MockLLMProvider()

        if HAS_LANGGRAPH and self._compiled_graph is None:
            try:
                self._compiled_graph, self._checkpointer = await create_agent_workflow(
                    self._llm, self.checkpoint_path
                )
            except Exception as e:
                logger.warning(f"LangGraph compilation skipped ({e}), using direct node execution")

        logger.info("AgentManager ready")

    def get_session(self, project_id: str, user_id: str) -> AgentSession:
        """Get or create an agent session for a project."""
        key = f"{user_id}_{project_id}"
        if key not in self._sessions:
            self._sessions[key] = AgentSession(
                project_id=project_id,
                user_id=user_id,
                llm=self._llm or MockLLMProvider(),
                compiled_graph=self._compiled_graph,
            )
        return self._sessions[key]

    async def cleanup(self) -> None:
        """Cleanup resources."""
        if self._checkpointer and hasattr(self._checkpointer, "conn") and self._checkpointer.conn:
            try:
                await self._checkpointer.conn.close()
            except Exception:
                pass
        self._sessions.clear()
        logger.info("AgentManager cleaned up")
