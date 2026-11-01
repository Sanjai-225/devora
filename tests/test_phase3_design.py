"""Devora — Phase 3 Optional Design System Automated Verification Suite.

Tests:
1. Design generation and React/TypeScript prototype preview (`test_design_generation_and_preview`)
2. Design modification, token overrides, version history & rollback (`test_design_modification_and_versioning`)
3. Skip design workflow / Direct Code Synthesis (`test_skip_design_workflow`)

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
            if isinstance(data, cls):
                return data
            instance = cls(**data)
            # Rehydrate nested ColorPalette / TypographySpec if present as dicts
            if hasattr(instance, "color_palette") and isinstance(instance.color_palette, dict):
                from agent.models.design import ColorPalette

                instance.color_palette = ColorPalette(**instance.color_palette)
            if hasattr(instance, "typography") and isinstance(instance.typography, dict):
                from agent.models.design import TypographySpec

                instance.typography = TypographySpec(**instance.typography)
            return instance

    pydantic_mod.BaseModel = BaseModel
    pydantic_mod.Field = Field
    sys.modules["pydantic"] = pydantic_mod


class TestPhase3DesignSystem(unittest.IsolatedAsyncioTestCase):
    """Tests for Phase 3 Optional Design System (Workflow Decision, Design Studio, Version History)."""

    async def test_design_generation_and_preview(self):
        """Test selecting design_first and generating initial DesignSpecification + React/TS prototype."""
        from agent.providers.mock_provider import MockLLMProvider
        from agent.workflow.agent_manager import AgentManager

        provider = MockLLMProvider(force_clarification=False)
        manager = AgentManager(
            gemini_api_key="",
            checkpoint_path=":memory:",
            llm_provider=provider,
        )
        await manager.initialize()

        session = manager.get_session(project_id="proj-design-1", user_id="user-1")
        async for _ in session.start_analysis(
            "Build a high-contrast SaaS telemetry dashboard with subscription billing."
        ):
            pass

        choice_out = await session.set_workflow_choice("design_first")
        self.assertEqual(choice_out["design_choice"], "design_first")
        self.assertEqual(choice_out["current_stage"], "design_generation")

        gen_out = await session.generate_design()
        self.assertEqual(gen_out["current_stage"], "awaiting_design_approval")
        self.assertTrue(gen_out["should_wait_for_user"])
        self.assertEqual(gen_out["wait_reason"], "design_approval")

        spec = gen_out["design_specification"]
        self.assertIsNotNone(spec)
        self.assertIn("color_palette", spec)
        self.assertIn("typography", spec)

        prototype_code = gen_out["design_prototype_code"]
        self.assertIn("export default function PrototypeApp", prototype_code)
        self.assertIn("DESIGN_TOKENS", prototype_code)

        versions = gen_out["design_versions"]
        self.assertEqual(len(versions), 1)
        self.assertEqual(versions[0]["version_tag"], "v1.0")
        self.assertFalse(versions[0]["approved"])

        await manager.cleanup()

    async def test_design_modification_and_versioning(self):
        """Test natural language design modification, token overrides, version rollback, and design approval."""
        from agent.providers.mock_provider import MockLLMProvider
        from agent.workflow.agent_manager import AgentManager

        provider = MockLLMProvider(force_clarification=False)
        manager = AgentManager(
            gemini_api_key="",
            checkpoint_path=":memory:",
            llm_provider=provider,
        )
        await manager.initialize()

        session = manager.get_session(project_id="proj-design-2", user_id="user-1")
        async for _ in session.start_analysis("Build an AI cloud analytics platform."):
            pass

        # v1.0: Initial design
        await session.generate_design()
        state_v1 = await session.get_current_state()
        self.assertEqual(len(state_v1["design_versions"]), 1)
        v1_id = state_v1["design_versions"][0]["id"]

        # v1.1: Natural language modification -> switch to Emerald primary
        await session.modify_design("Switch primary accent to Emerald (#10B981) and compact navbar")
        state_v2 = await session.get_current_state()
        self.assertEqual(len(state_v2["design_versions"]), 2)
        v2_doc = state_v2["design_versions"][1]
        self.assertEqual(v2_doc["version_tag"], "v1.1")
        self.assertEqual(v2_doc["design_spec"]["color_palette"]["primary"], "#10B981")
        self.assertTrue(v2_doc["design_spec"]["compact_navbar"])

        # v1.2: Direct token overrides
        await session.modify_design(
            "Apply custom Indigo primary token",
            token_overrides={"colors": {"primary": "#6366F1"}},
        )
        state_v3 = await session.get_current_state()
        self.assertEqual(len(state_v3["design_versions"]), 3)
        v3_doc = state_v3["design_versions"][2]
        self.assertEqual(v3_doc["version_tag"], "v1.2")
        self.assertEqual(v3_doc["design_spec"]["color_palette"]["primary"], "#6366F1")

        # Restore v1.0
        restored = await session.restore_design_version(v1_id)
        self.assertIsNotNone(restored)
        self.assertEqual(restored["version_tag"], "v1.0")

        # Approve v1.1
        approve_out = await session.approve_design(v2_doc["id"])
        self.assertEqual(approve_out["current_stage"], "configuration")
        self.assertEqual(approve_out["approved_design_version"], v2_doc["id"])
        self.assertTrue(approve_out["approved_version"]["approved"])

        await manager.cleanup()

    async def test_skip_design_workflow(self):
        """Test selecting direct_code bypasses Design Studio and proceeds to configuration."""
        from agent.providers.mock_provider import MockLLMProvider
        from agent.workflow.agent_manager import AgentManager

        provider = MockLLMProvider(force_clarification=False)
        manager = AgentManager(
            gemini_api_key="",
            checkpoint_path=":memory:",
            llm_provider=provider,
        )
        await manager.initialize()

        session = manager.get_session(project_id="proj-direct-1", user_id="user-1")
        async for _ in session.start_analysis("Build a developer blog with markdown articles."):
            pass

        direct_out = await session.set_workflow_choice("direct_code")
        self.assertEqual(direct_out["design_choice"], "direct_code")
        self.assertEqual(direct_out["current_stage"], "configuration")
        self.assertFalse(direct_out["should_wait_for_user"])

        await manager.cleanup()


if __name__ == "__main__":
    unittest.main()
