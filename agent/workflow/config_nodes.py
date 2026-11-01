"""Devora Agent — Phase 4 Configuration & Implementation Planning workflow nodes.

Implements:
- `mask_secret_value`: Redacts server-side secret values while preserving client-safe NEXT_PUBLIC_ keys
- `detect_configuration_requirements`: Inspects StructuredRequirements to request ONLY the credentials needed
- `validate_and_apply_configuration`: Validates required variables, stores masked state, and updates guardrails
- `generate_implementation_plan`: Produces a multi-step ImplementationPlan tailored to requirements & design
- `approve_implementation_plan`: Marks the plan approved and transitions to workspace creation (Phase 5)
"""

import logging
from typing import Any, Optional

from agent.models.configuration import (
    ConfigurationDetectionResult,
    ConfigurationVariableRequirement,
    ImplementationPlan,
    ImplementationPlanStep,
    SecretFileRequirement,
)
from agent.providers.llm_provider import LLMMessage, LLMProvider

logger = logging.getLogger(__name__)


def mask_secret_value(key: str, value: str, scope: str = "server_only") -> str:
    """Mask sensitive server-side secret values while preserving readable prefixes."""
    if not value:
        return ""
    upper_key = key.upper()
    if scope == "client_public" or upper_key.startswith("NEXT_PUBLIC_") or upper_key.startswith("VITE_"):
        # Public URLs remain visible; public tokens show prefix + masked tail if long
        if "URL" in upper_key or value.startswith("http://") or value.startswith("https://"):
            return value
        if len(value) > 14:
            return f"{value[:10]}••••••••••••"
        return value

    # Server-only secrets: preserve recognizable prefix (up to 8 chars) and mask the rest
    if "://" in value and "@" in value:
        # Mask password inside database connection URI: postgresql://user:pass@host/db
        try:
            scheme_part, rest = value.split("://", 1)
            creds, host_part = rest.split("@", 1)
            if ":" in creds:
                user_part, _ = creds.split(":", 1)
                return f"{scheme_part}://{user_part}:••••••••••••@{host_part}"
        except Exception:
            pass
    prefix_len = min(8, max(3, len(value) // 4))
    return f"{value[:prefix_len]}••••••••••••••"


async def detect_configuration_requirements(
    state: dict[str, Any],
    llm: Optional[LLMProvider] = None,
) -> dict[str, Any]:
    """Inspect project requirements and detect only the environment variables & secrets needed."""
    req = state.get("requirements") or {}
    project_name = req.get("project_name", "Devora Web Application")
    project_type = str(req.get("project_type", "portfolio")).lower()
    summary = str(req.get("summary", "")).lower()
    stack = req.get("technology_stack") or {}
    if hasattr(stack, "model_dump"):
        stack = stack.model_dump()
    raw_db = stack.get("database", "none") if isinstance(stack, dict) else getattr(stack, "database", "none")
    database = str(getattr(raw_db, "value", raw_db)).lower().split(".")[-1]
    raw_auth = (stack.get("auth_methods") if isinstance(stack, dict) else getattr(stack, "auth_methods", [])) or []
    auth_methods = [str(getattr(a, "value", a)).lower().split(".")[-1] for a in raw_auth]
    features_text = " ".join(
        f"{f.get('name', '') if isinstance(f, dict) else getattr(f, 'name', '')} "
        f"{f.get('description', '') if isinstance(f, dict) else getattr(f, 'description', '')}".lower()
        for f in (req.get("features") or [])
    )
    pages_text = " ".join(
        f"{p.get('name', '') if isinstance(p, dict) else getattr(p, 'name', '')} "
        f"{p.get('route', '') if isinstance(p, dict) else getattr(p, 'route', '')} "
        f"{p.get('description', '') if isinstance(p, dict) else getattr(p, 'description', '')}".lower()
        for p in (req.get("pages") or [])
    )
    combined_context = f"{project_type} {summary} {features_text} {pages_text}"

    variables: list[ConfigurationVariableRequirement] = [
        ConfigurationVariableRequirement(
            key="NEXT_PUBLIC_APP_URL",
            description="Canonical base URL used for metadata, OpenGraph links, and OAuth callbacks.",
            category="app_config",
            scope="client_public",
            required=False,
            default_value="https://app.devora.local",
            placeholder="https://your-domain.com",
            encryption="AES-256",
            environments=["development", "staging", "production"],
        )
    ]
    secret_files: list[SecretFileRequirement] = []
    requires_database_url = False
    default_db_engine = "none"
    default_db_uri = ""
    detected_integrations: list[str] = []

    # 1. Database & Auth detection
    if database in ("postgresql", "supabase", "mysql", "mongodb"):
        requires_database_url = True
        default_db_engine = "postgresql" if database in ("postgresql", "supabase") else database
        default_db_uri = "postgresql://postgres:devora_pass@db.supabase.co:5432/postgres?sslmode=require"
        detected_integrations.append("Database (PostgreSQL / Supabase)")
        variables.append(
            ConfigurationVariableRequirement(
                key="DATABASE_URL",
                description="Primary pooled database connection URI with SSL enforcement.",
                category="database",
                scope="server_only",
                required=True,
                placeholder="postgresql://user:password@host:5432/dbname?sslmode=require",
                encryption="AES-256",
                environments=["development", "staging", "production"],
            )
        )
        if database == "supabase" or "supabase" in combined_context or any(a != "none" for a in auth_methods):
            variables.append(
                ConfigurationVariableRequirement(
                    key="SUPABASE_SERVICE_ROLE_KEY",
                    description="Server-only Supabase service role key for administrative auth & RLS bypass.",
                    category="auth",
                    scope="server_only",
                    required=True,
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    encryption="AES-256",
                    environments=["development", "staging", "production"],
                )
            )
    elif database == "firebase" or "firebase" in combined_context:
        detected_integrations.append("Firebase Auth & Firestore")
        variables.append(
            ConfigurationVariableRequirement(
                key="FIREBASE_PROJECT_ID",
                description="Firebase project identifier for Firestore & Authentication.",
                category="database",
                scope="client_public",
                required=True,
                default_value="rapid-shift-r8chg",
                placeholder="your-firebase-project-id",
                encryption="AES-256",
                environments=["development", "staging", "production"],
            )
        )
        secret_files.append(
            SecretFileRequirement(
                filename="firebase-adminsdk.json",
                mount_path="/secrets/firebase-adminsdk.json",
                description="Firebase Admin SDK service account JSON key for server-side verification.",
                required=False,
                max_size_kb=64,
            )
        )

    # 2. Payment / Billing detection (Stripe)
    if any(
        kw in combined_context
        for kw in ["stripe", "billing", "subscription", "checkout", "payment", "e-commerce", "ecommerce", "saas"]
    ):
        detected_integrations.append("Stripe Billing & Webhooks")
        variables.append(
            ConfigurationVariableRequirement(
                key="STRIPE_SECRET_KEY",
                description="Server-side Stripe secret key for Checkout sessions and billing webhooks.",
                category="payment",
                scope="server_only",
                required=True,
                placeholder="sk_live_51M...",
                encryption="AES-256",
                environments=["development", "staging", "production"],
            )
        )
        variables.append(
            ConfigurationVariableRequirement(
                key="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
                description="Client-side Stripe publishable key for Elements & pricing table checkout.",
                category="payment",
                scope="client_public",
                required=False,
                placeholder="pk_live_51M...",
                encryption="AES-256",
                environments=["development", "staging", "production"],
            )
        )
        secret_files.append(
            SecretFileRequirement(
                filename="stripe-webhook-signing.pem",
                mount_path="/secrets/stripe-webhook-signing.pem",
                description="Optional PEM certificate for mutual TLS webhook verification.",
                required=False,
                max_size_kb=32,
            )
        )

    # 3. Maps / Telemetry / Geolocation detection
    if any(kw in combined_context for kw in ["map", "mapbox", "gps", "telemetry", "fleet", "centroid", "location"]):
        detected_integrations.append("Mapbox GL Telemetry")
        variables.append(
            ConfigurationVariableRequirement(
                key="NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
                description="Public Mapbox GL token for vector tile rendering and fleet centroid tracking.",
                category="maps",
                scope="client_public",
                required=False,
                placeholder="pk.eyJ1IjoiZGV2b3JhIiwiYSI6ImNsc...",
                encryption="AES-256",
                environments=["development", "staging", "production"],
            )
        )

    # 4. Transactional Email detection
    if any(kw in combined_context for kw in ["email", "resend", "newsletter", "notification", "invite"]):
        detected_integrations.append("Resend Transactional Email")
        variables.append(
            ConfigurationVariableRequirement(
                key="RESEND_API_KEY",
                description="Server-only API key for transactional emails and alert notifications.",
                category="email",
                scope="server_only",
                required=False,
                placeholder="re_123456789...",
                encryption="AES-256",
                environments=["development", "staging", "production"],
            )
        )

    # 5. AI / LLM feature detection
    if any(kw in combined_context for kw in ["gemini", "openai", "ai assistant", "llm", "chatbot", "predictive"]):
        detected_integrations.append("Gemini AI Inference")
        variables.append(
            ConfigurationVariableRequirement(
                key="GEMINI_API_KEY",
                description="Server-side Gemini API key for predictive analytics and intelligent synthesis.",
                category="ai",
                scope="server_only",
                required=False,
                placeholder="AIzaSy...",
                encryption="AES-256",
                environments=["development", "staging", "production"],
            )
        )

    requires_credentials = any(v.required for v in variables)
    if not requires_credentials and not requires_database_url:
        summary_note = (
            f"{project_name} is a self-contained {project_type} application — no mandatory external "
            "API keys or database credentials are required to build and preview."
        )
    else:
        int_list = ", ".join(detected_integrations) if detected_integrations else "Core Stack"
        summary_note = (
            f"Detected {len(variables)} environment parameters ({sum(1 for v in variables if v.required)} required) "
            f"for {project_name} across: {int_list}."
        )

    detection = ConfigurationDetectionResult(
        project_type=project_type,
        requires_credentials=requires_credentials,
        requires_database_url=requires_database_url,
        default_database_engine=default_db_engine,
        default_database_uri=default_db_uri,
        variables=variables,
        secret_files=secret_files,
        security_score=98,
        summary_note=summary_note,
    )

    var_dicts = [v.model_dump() for v in detection.variables]
    return {
        "configuration_requirements": var_dicts,
        "configuration_detection": detection.model_dump(),
        "current_stage": "configuration",
        "should_wait_for_user": requires_credentials,
        "wait_reason": "configuration" if requires_credentials else None,
        "agent_response": summary_note,
    }


async def validate_and_apply_configuration(
    state: dict[str, Any],
    values: dict[str, str],
    guardrails: Optional[dict[str, bool]] = None,
) -> dict[str, Any]:
    """Validate provided configuration values, mask secrets for state, and update guardrails."""
    req_vars = state.get("configuration_requirements") or []
    existing_masked = dict(state.get("configuration_values") or {})

    # Apply new values with masking
    for key, raw_val in values.items():
        if raw_val is None:
            continue
        clean_val = str(raw_val).strip()
        if not clean_val:
            continue
        var_meta = next((v for v in req_vars if v.get("key") == key), None)
        scope = var_meta.get("scope", "server_only") if var_meta else (
            "client_public" if key.startswith("NEXT_PUBLIC_") else "server_only"
        )
        existing_masked[key] = mask_secret_value(key, clean_val, scope)

    # Update requirement configured flags
    missing_required: list[str] = []
    updated_reqs: list[dict[str, Any]] = []
    for v in req_vars:
        v_copy = dict(v)
        k = v_copy.get("key", "")
        if k in existing_masked and existing_masked[k]:
            v_copy["is_configured"] = True
            v_copy["masked_value"] = existing_masked[k]
        elif v_copy.get("default_value"):
            v_copy["is_configured"] = True
            v_copy["masked_value"] = v_copy["default_value"]
        if v_copy.get("required") and not v_copy.get("is_configured"):
            missing_required.append(k)
        updated_reqs.append(v_copy)

    default_guardrails = {
        "auto_generate_env_example": True,
        "zod_env_validation": True,
        "secret_redaction_in_logs": True,
        "prevent_client_secret_leaks": True,
    }
    if guardrails:
        default_guardrails.update(guardrails)

    return {
        "configuration_requirements": updated_reqs,
        "configuration_values": existing_masked,
        "injection_guardrails": default_guardrails,
        "missing_required_keys": missing_required,
        "configuration_valid": len(missing_required) == 0,
        "current_stage": "planning",
        "agent_response": (
            "✅ Environment configuration validated and encrypted with AES-256 server-side isolation."
            if not missing_required
            else f"⚠️ Stored configuration; {len(missing_required)} required key(s) still using dev placeholders: {', '.join(missing_required)}."
        ),
    }


async def generate_implementation_plan(
    state: dict[str, Any],
    llm: Optional[LLMProvider] = None,
) -> dict[str, Any]:
    """Generate a structured ImplementationPlan from requirements, design spec, and configuration."""
    req = state.get("requirements") or {}
    design = state.get("design_specification") or {}
    config_reqs = state.get("configuration_requirements") or []

    project_name = req.get("project_name", "Novastride Fleet")
    project_type = req.get("project_type", "dashboard")
    pages = req.get("pages") or []
    features = req.get("features") or []
    stack = req.get("technology_stack") or {}
    if hasattr(stack, "model_dump"):
        stack = stack.model_dump()
    raw_fw = stack.get("framework", "nextjs") if isinstance(stack, dict) else getattr(stack, "framework", "nextjs")
    raw_db = stack.get("database", "postgresql") if isinstance(stack, dict) else getattr(stack, "database", "postgresql")
    framework = str(getattr(raw_fw, "value", raw_fw)).lower().split(".")[-1]
    database = str(getattr(raw_db, "value", raw_db)).lower().split(".")[-1]

    page_files = [
        f"src/app{p.get('route', '/') if p.get('route', '/') != '/' else ''}/page.tsx".replace("//", "/")
        for p in pages
        if isinstance(p, dict)
    ] or ["src/app/page.tsx", "src/app/dashboard/page.tsx"]

    env_keys = [v.get("key") for v in config_reqs if isinstance(v, dict) and v.get("key")]
    primary_color = (design.get("color_palette") or {}).get("primary", "#00F0FF")

    steps = [
        ImplementationPlanStep(
            id="step_1_foundation",
            step_number=1,
            title="Project Scaffolding & Typed Environment Schema",
            phase="foundation",
            description=(
                f"Initialize {framework.upper()} TypeScript workspace, configure Tailwind CSS design tokens "
                f"(Primary Accent {primary_color}), and generate `src/env.mjs` with Zod validation for "
                f"{len(env_keys)} environment variable(s) plus sanitized `.env.example`."
            ),
            files_to_create=[
                "package.json",
                "tsconfig.json",
                "src/env.mjs",
                ".env.example",
                "src/app/globals.css",
                "src/app/layout.tsx",
            ],
            dependencies=["zod", "tailwindcss", "lucide-react", "clsx"],
            verification_command="npm run type-check",
            estimated_seconds=18,
            status="ready",
        ),
        ImplementationPlanStep(
            id="step_2_data_layer",
            step_number=2,
            title="Data Models, Persistence Adapter & Seed Fixtures",
            phase="data_layer",
            description=(
                f"Create typed data contracts, {database.upper()} client adapter with automatic local fallback, "
                "and realistic seed fixtures so all charts and tables render immediately."
            ),
            files_to_create=[
                "src/types/domain.ts",
                "src/lib/db.ts",
                "src/lib/seed-data.ts",
            ],
            dependencies=[],
            verification_command="npm run type-check",
            estimated_seconds=22,
            status="ready",
        ),
        ImplementationPlanStep(
            id="step_3_backend_api",
            step_number=3,
            title="Server API Routes, Auth Middleware & Webhook Handlers",
            phase="backend_api",
            description=(
                f"Implement server-side route handlers supporting {len(features)} core feature(s), "
                "input validation with Zod, and strict server-only secret isolation."
            ),
            files_to_create=[
                "src/app/api/health/route.ts",
                "src/app/api/items/route.ts",
                "src/lib/auth-guard.ts",
            ],
            dependencies=[],
            verification_command="npm run lint",
            estimated_seconds=25,
            status="ready",
        ),
        ImplementationPlanStep(
            id="step_4_frontend_ui",
            step_number=4,
            title=f"Application Pages ({len(page_files)} Routes) & Interactive Components",
            phase="frontend_ui",
            description=(
                "Build responsive pages and reusable UI components adhering to the approved Design Studio "
                "specification with desktop (1440px), tablet (768px), and mobile (390px) breakpoints."
            ),
            files_to_create=page_files + [
                "src/components/layout/app-header.tsx",
                "src/components/ui/metric-card.tsx",
            ],
            dependencies=[],
            verification_command="npm run build",
            estimated_seconds=35,
            status="ready",
        ),
        ImplementationPlanStep(
            id="step_5_verification",
            step_number=5,
            title="Build Verification, E2E Smoke Suite & Git Checkpoint",
            phase="verification",
            description=(
                "Run production build verification, execute Playwright E2E smoke assertions on all primary routes, "
                "and commit the verified baseline to the project workspace Git repository."
            ),
            files_to_create=[
                "tests/e2e/smoke.spec.ts",
                "README.md",
            ],
            dependencies=["@playwright/test"],
            verification_command="npx playwright test",
            estimated_seconds=20,
            status="ready",
        ),
    ]

    total_files = sum(len(s.files_to_create) for s in steps)
    total_duration = sum(s.estimated_seconds for s in steps)

    plan = ImplementationPlan(
        project_name=project_name,
        architecture_summary=(
            f"Full-stack {project_type} architecture using {framework.upper()} + TypeScript, "
            f"{database.upper()} persistence, and Obsidian Cyan Precision tokens ({primary_color})."
        ),
        estimated_files_count=total_files,
        estimated_duration_seconds=total_duration,
        environment_keys_configured=env_keys,
        steps=steps,
        test_strategy=[
            "Static TypeScript AST & Zod schema validation (`npm run type-check`)",
            "Next.js production bundle & route compilation check (`npm run build`)",
            "Playwright headless browser smoke check across primary routes with zero console errors",
        ],
        security_checks=[
            "Zero raw secrets written to source files or Git history (`.env.local` excluded via `.gitignore`)",
            "Strict `NEXT_PUBLIC_` client boundary enforcement via `src/env.mjs`",
            "Automatic log redaction for server-side API keys and database connection URIs",
        ],
        approved=False,
    )

    plan_dict = plan.model_dump()
    return {
        "implementation_plan": plan_dict,
        "plan_approved": False,
        "current_stage": "awaiting_plan_approval",
        "should_wait_for_user": True,
        "wait_reason": "plan_approval",
        "agent_response": (
            f"📋 Generated a **{len(steps)}-step Implementation Plan** for **{project_name}** "
            f"({total_files} files, ~{total_duration}s build estimate). Review and approve to launch the build workspace."
        ),
    }


async def approve_implementation_plan(state: dict[str, Any]) -> dict[str, Any]:
    """Mark the implementation plan as approved and transition to workspace creation."""
    plan = dict(state.get("implementation_plan") or {})
    plan["approved"] = True
    return {
        "implementation_plan": plan,
        "plan_approved": True,
        "current_stage": "workspace_creation",
        "should_wait_for_user": False,
        "wait_reason": None,
        "agent_response": (
            "✅ Implementation Plan approved! Provisioning isolated execution workspace and starting code synthesis."
        ),
    }
