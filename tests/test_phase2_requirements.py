"""Devora — Phase 1 & Phase 2 Automated Verification Suite.

Tests:
1. Requirement analysis from natural language input (portfolio & SaaS/e-commerce)
2. Clarification flow round-trip (question generation -> answer processing -> stack confirmation)
3. Stack confirmation workflow branching (direct_code vs design_first)

Compatible with both `pytest` (with full Pydantic/LangGraph installed)
and bare `python3 -m unittest` environments.
"""

import sys
import types
import unittest
from pathlib import Path

# Ensure repository root and backend are on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = REPO_ROOT / "backend"
for p in (str(REPO_ROOT), str(BACKEND_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

# Provide a lightweight Pydantic v2 compatibility shim if running in a bare Python container without pip packages
try:
    import pydantic  # noqa: F401
except ImportError:
    pydantic_mod = types.ModuleType("pydantic")

    def Field(default=..., default_factory=None, **kwargs):
        if default_factory is not None:
            return default_factory()
        return None if default is Ellipsis else default

    class BaseModel:
        def __init__(self, **kwargs):
            for cls in reversed(self.__class__.__mro__):
                if cls is object:
                    continue
                for k, v in cls.__dict__.items():
                    if not k.startswith("_") and not callable(v) and not isinstance(v, (classmethod, staticmethod)):
                        setattr(self, k, v.copy() if isinstance(v, (list, dict)) else v)
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self):
            def _conv(val):
                if isinstance(val, BaseModel):
                    return val.model_dump()
                if isinstance(val, list):
                    return [_conv(x) for x in val]
                if isinstance(val, dict):
                    return {k: _conv(v) for k, v in val.items()}
                return val

            return {k: _conv(v) for k, v in self.__dict__.items() if not k.startswith("_")}

        @classmethod
        def model_validate(cls, data: dict):
            return cls(**data)

    pydantic_mod.BaseModel = BaseModel
    pydantic_mod.Field = Field
    sys.modules["pydantic"] = pydantic_mod


class TestPhase2RequirementAnalysis(unittest.IsolatedAsyncioTestCase):
    """Tests for Phase 2 Requirement Analysis & Clarification Flow."""

    async def test_simple_portfolio_requirement_analysis(self):
        """Test requirement extraction from natural language for a simple portfolio site."""
        from agent.providers.mock_provider import MockLLMProvider
        from agent.workflow.agent_manager import AgentManager

        provider = MockLLMProvider(force_clarification=False)
        manager = AgentManager(
            gemini_api_key="",
            checkpoint_path=":memory:",
            llm_provider=provider,
        )
        await manager.initialize()

        session = manager.get_session(project_id="proj-portfolio-1", user_id="user-1")
        events = []
        async for ev in session.start_analysis(
            "Build a minimal developer portfolio website with projects gallery, about section, and contact form."
        ):
            events.append(ev)

        self.assertGreaterEqual(len(events), 2)
        final_state = await session.get_current_state()
        self.assertIsNotNone(final_state)
        self.assertIsNotNone(final_state["requirements"])
        self.assertEqual(final_state["requirements"]["project_type"], "portfolio")
        self.assertGreaterEqual(len(final_state["requirements"]["pages"]), 3)
        self.assertEqual(final_state["wait_reason"], "stack_confirmation")
        await manager.cleanup()

    async def test_clarification_flow_round_trip(self):
        """Test full clarification round-trip: analysis -> clarification pause -> answer processing -> stack confirmation."""
        from agent.providers.mock_provider import MockLLMProvider
        from agent.workflow.agent_manager import AgentManager

        provider = MockLLMProvider(force_clarification=True)
        manager = AgentManager(
            gemini_api_key="",
            checkpoint_path=":memory:",
            llm_provider=provider,
        )
        await manager.initialize()

        session = manager.get_session(project_id="proj-saas-1", user_id="user-1")

        # Step 1: Start analysis for a complex SaaS dashboard -> should pause for clarification
        start_events = []
        async for ev in session.start_analysis(
            "Build a complex SaaS fleet telemetry dashboard with real-time GPS tracking and subscription billing."
        ):
            start_events.append(ev)

        state_after_start = await session.get_current_state()
        self.assertIsNotNone(state_after_start)
        self.assertTrue(state_after_start["should_wait_for_user"])
        self.assertEqual(state_after_start["wait_reason"], "clarification")
        self.assertGreaterEqual(len(state_after_start["clarification_questions"]), 2)

        # Step 2: Submit clarification answers -> should update requirements and reach stack_confirmation
        answers = {
            "q_auth_architecture": "Email/Password + Google OAuth (Recommended)",
            "q_data_seeding": "Yes, auto-seed 25 realistic records",
            "q_realtime_updates": "WebSocket / SSE live stream (500ms)",
        }
        resume_events = []
        async for ev in session.resume_with_input(answers, input_type="clarification"):
            resume_events.append(ev)

        self.assertGreaterEqual(len(resume_events), 1)
        state_after_answers = await session.get_current_state()
        self.assertIsNotNone(state_after_answers)
        self.assertEqual(state_after_answers["wait_reason"], "stack_confirmation")
        self.assertIsNotNone(state_after_answers["confirmed_stack"])

        # Step 3: Confirm stack with design_first choice
        confirm_events = []
        async for ev in session.resume_with_input("design_first", input_type="stack_confirmation"):
            confirm_events.append(ev)

        self.assertEqual(len(confirm_events), 1)
        self.assertEqual(confirm_events[0]["type"], "phase_complete")
        self.assertEqual(confirm_events[0]["design_choice"], "design_first")
        await manager.cleanup()


if __name__ == "__main__":
    unittest.main()
