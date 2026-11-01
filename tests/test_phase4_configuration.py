"""Automated unit and integration tests for Phase 4 — Configuration & Planning.

Tests:
1. Configuration requirement detection across different project types (Portfolio static site vs SaaS/Dashboard with PostgreSQL, Stripe, and Mapbox).
2. Secret storage and masking (server-only secrets like STRIPE_SECRET_KEY and DATABASE_URL are masked while client-safe URLs remain readable).
3. Multi-step ImplementationPlan generation and approval flow.
"""

import asyncio
import sys
import types
import unittest
from enum import Enum
from typing import Any


# ── Lightweight Pydantic shim if running in minimal Python test container ──
try:
    import pydantic  # noqa: F401
except ImportError:
    pydantic_mod = types.ModuleType("pydantic")

    def Field(default: Any = None, **kwargs: Any) -> Any:
        if "default_factory" in kwargs and callable(kwargs["default_factory"]):
            return kwargs["default_factory"]
        return default

    class BaseModel:
        def __init__(self, **kwargs: Any):
            for cls in reversed(self.__class__.__mro__):
                if cls is object or cls is BaseModel:
                    continue
                for k, v in cls.__dict__.items():
                    if k.startswith("_") or callable(v):
                        continue
                    setattr(self, k, v)
                ann = getattr(cls, "__annotations__", {})
                for k in ann:
                    if not hasattr(self, k):
                        val = getattr(cls, k, None)
                        if callable(val) and not isinstance(val, type):
                            setattr(self, k, val())
                        else:
                            setattr(self, k, val)
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self) -> dict[str, Any]:
            def _conv(obj: Any) -> Any:
                if isinstance(obj, BaseModel):
                    return obj.model_dump()
                if isinstance(obj, Enum):
                    return obj.value
                if isinstance(obj, list):
                    return [_conv(x) for x in obj]
                if isinstance(obj, dict):
                    return {dk: _conv(dv) for dk, dv in obj.items()}
                return obj

            out: dict[str, Any] = {}
            all_keys = set(self.__dict__.keys())
            for cls in self.__class__.__mro__:
                if hasattr(cls, "__annotations__"):
                    all_keys.update(cls.__annotations__.keys())
            for k in all_keys:
                if not k.startswith("_"):
                    val = getattr(self, k, None)
                    if callable(val) and not isinstance(val, type):
                        val = val()
                    out[k] = _conv(val)
            return out

        @classmethod
        def model_validate(cls, data: dict[str, Any]) -> Any:
            return cls(**data)

    pydantic_mod.BaseModel = BaseModel  # type: ignore[attr-defined]
    pydantic_mod.Field = Field  # type: ignore[attr-defined]
    sys.modules["pydantic"] = pydantic_mod


from agent.providers.mock_provider import MockLLMProvider  # noqa: E402
from agent.workflow.agent_manager import AgentManager  # noqa: E402
from agent.workflow.config_nodes import (  # noqa: E402
    detect_configuration_requirements,
    mask_secret_value,
)


class TestPhase4ConfigurationAndPlanning(unittest.TestCase):
    """Verify Phase 4 configuration detection, secret masking, and implementation planning."""

    def test_configuration_detection_for_different_project_types(self) -> None:
        """Verify minimal credential detection for static portfolio vs full-stack SaaS dashboard."""

        async def _run() -> None:
            llm = MockLLMProvider(force_clarification=False)

            # Case 1: Simple developer portfolio (no DB, no Stripe)
            portfolio_req = llm._extract_requirements(
                "Build a clean personal developer portfolio website with projects gallery and about page."
            )
            portfolio_state = {"requirements": portfolio_req.model_dump()}
            portfolio_out = await detect_configuration_requirements(portfolio_state, llm)
            portfolio_det = portfolio_out["configuration_detection"]

            self.assertEqual(portfolio_det["project_type"], "portfolio")
            self.assertFalse(portfolio_det["requires_credentials"])
            self.assertFalse(portfolio_det["requires_database_url"])
            portfolio_keys = [v["key"] for v in portfolio_out["configuration_requirements"]]
            self.assertIn("NEXT_PUBLIC_APP_URL", portfolio_keys)
            self.assertNotIn("STRIPE_SECRET_KEY", portfolio_keys)
            self.assertNotIn("DATABASE_URL", portfolio_keys)

            # Case 2: Complex SaaS Fleet Telemetry Dashboard with PostgreSQL, Stripe, and GPS Map
            saas_req = llm._extract_requirements(
                "Build a SaaS fleet telemetry dashboard with PostgreSQL database, Stripe subscription billing, and live GPS map tracking."
            )
            saas_state = {"requirements": saas_req.model_dump()}
            saas_out = await detect_configuration_requirements(saas_state, llm)
            saas_det = saas_out["configuration_detection"]

            self.assertTrue(saas_det["requires_credentials"])
            self.assertTrue(saas_det["requires_database_url"])
            saas_keys = [v["key"] for v in saas_out["configuration_requirements"]]
            self.assertIn("DATABASE_URL", saas_keys)
            self.assertIn("STRIPE_SECRET_KEY", saas_keys)
            self.assertIn("NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN", saas_keys)

        asyncio.run(_run())

    def test_secret_storage_and_masking(self) -> None:
        """Verify server secrets and DB URIs are masked while public URLs remain readable."""

        async def _run() -> None:
            # Direct masking checks
            masked_stripe = mask_secret_value(
                "STRIPE_SECRET_KEY",
                "stripe_secret_mock_SuperSecretBillingKey999",
                "server_only",
            )
            self.assertNotIn("SuperSecretBillingKey999", masked_stripe)
            self.assertIn("••••", masked_stripe)

            masked_db = mask_secret_value(
                "DATABASE_URL",
                "postgresql://postgres:my_ultra_secret_password@db.supabase.co:5432/postgres",
                "server_only",
            )
            self.assertNotIn("my_ultra_secret_password", masked_db)
            self.assertIn("postgresql://postgres:••••••••••••@db.supabase.co:5432/postgres", masked_db)

            public_url = mask_secret_value(
                "NEXT_PUBLIC_APP_URL",
                "https://novastride.devora.app",
                "client_public",
            )
            self.assertEqual(public_url, "https://novastride.devora.app")

            # Session configuration save & masking verification
            manager = AgentManager(llm_provider=MockLLMProvider(force_clarification=False))
            await manager.initialize()
            session = manager.get_session("proj_cfg_test", "user_test")

            async for _ in session.start_analysis(
                "Create a SaaS platform with PostgreSQL database and Stripe billing."
            ):
                pass

            saved = await session.save_configuration(
                values={
                    "DATABASE_URL": "postgresql://postgres:top_secret_pw@db.supabase.co:5432/postgres",
                    "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.raw_secret_payload",
                    "STRIPE_SECRET_KEY": "stripe_secret_mock_RawSecretStripeKey",
                    "NEXT_PUBLIC_APP_URL": "https://saas.devora.app",
                },
                guardrails={"zod_env_validation": True},
            )

            self.assertTrue(saved["configuration_valid"])
            masked_map = saved["configuration_values"]
            self.assertNotIn("top_secret_pw", masked_map["DATABASE_URL"])
            self.assertNotIn("raw_secret_payload", masked_map["SUPABASE_SERVICE_ROLE_KEY"])
            self.assertNotIn("RawSecretStripeKey", masked_map["STRIPE_SECRET_KEY"])
            self.assertEqual(masked_map["NEXT_PUBLIC_APP_URL"], "https://saas.devora.app")

        asyncio.run(_run())

    def test_implementation_plan_generation_and_approval(self) -> None:
        """Verify multi-step ImplementationPlan generation and approval state transition."""

        async def _run() -> None:
            manager = AgentManager(llm_provider=MockLLMProvider(force_clarification=False))
            await manager.initialize()
            session = manager.get_session("proj_plan_test", "user_test")

            async for _ in session.start_analysis(
                "Create an IoT Fleet Telemetry Dashboard with PostgreSQL and Stripe billing."
            ):
                pass

            plan_out = await session.generate_plan()
            self.assertEqual(plan_out["current_stage"], "awaiting_plan_approval")
            self.assertTrue(plan_out["should_wait_for_user"])
            self.assertEqual(plan_out["wait_reason"], "plan_approval")

            plan = plan_out["implementation_plan"]
            self.assertIsNotNone(plan)
            self.assertGreaterEqual(len(plan["steps"]), 5)
            self.assertFalse(plan["approved"])

            approved_out = await session.approve_plan()
            self.assertTrue(approved_out["plan_approved"])
            self.assertEqual(approved_out["current_stage"], "workspace_creation")
            self.assertFalse(approved_out["should_wait_for_user"])
            self.assertTrue(approved_out["implementation_plan"]["approved"])

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
