"""Devora Agent — Phase 4 Configuration & Implementation Plan models.

Defines structured Pydantic schemas for:
1. Dynamic credential and environment variable requirement detection
2. Secret file & certificate mount specifications
3. Step-by-step implementation plan generation and approval
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field


class ConfigurationVariableRequirement(BaseModel):
    """A single environment variable or secret detected from project requirements."""

    key: str = Field(..., description="Environment variable name, e.g. STRIPE_SECRET_KEY")
    category: str = Field(
        default="app_config",
        description="Category badge: database, auth, payment, maps, email, ai, app_config",
    )
    scope: Literal["client_safe", "client_public", "server_only"] = Field(
        default="server_only",
        description="Whether exposed to browser (NEXT_PUBLIC_) or restricted to server",
    )
    encryption: str = Field(
        default="AES-256",
        description="Encryption tier label: AES-256, AES-256 GCM",
    )
    description: str = Field(
        default="",
        description="Why this variable is required by the generated application",
    )
    required: bool = Field(
        default=True,
        description="Whether this variable is mandatory before production build",
    )
    default_value: Optional[str] = Field(
        default=None,
        description="Safe default or placeholder value if applicable",
    )
    placeholder: Optional[str] = Field(
        default=None,
        description="Example placeholder format for the UI input",
    )
    environments: list[str] = Field(
        default_factory=lambda: ["development", "staging", "production"],
        description="Deployment environments where this variable applies",
    )
    targets: list[str] = Field(
        default_factory=lambda: ["Prod", "Staging", "Dev"],
        description="Short deployment target labels",
    )
    is_configured: bool = False
    masked_value: Optional[str] = None


class SecretFileRequirement(BaseModel):
    """A secret certificate or JSON key file requirement."""

    filename: str = Field(..., description="e.g. firebase-adminsdk.json")
    mount_path: str = Field(default="/secrets/firebase-adminsdk.json", description="Runtime mount path")
    description: str = Field(default="IAM or SSL certificate file")
    size_label: str = Field(default="2.4 KB")
    max_size_kb: int = Field(default=64)
    required: bool = Field(default=False)
    uploaded: bool = Field(default=False)
    size_bytes: Optional[int] = None


class ConfigurationDetectionResult(BaseModel):
    """Complete set of required configuration items inferred from StructuredRequirements."""

    project_type: str = Field(default="saas")
    requires_credentials: bool = Field(
        default=True,
        description="False for purely static/portfolio sites that need no external secrets",
    )
    requires_database_url: bool = Field(default=False)
    database_provider: str = Field(default="none")
    default_database_engine: str = Field(default="none")
    default_database_uri: str = Field(default="")
    database_url_placeholder: str = Field(default="")
    variables: list[ConfigurationVariableRequirement] = Field(default_factory=list)
    secret_files: list[SecretFileRequirement] = Field(default_factory=list)
    security_score: int = Field(default=98)
    summary_note: str = Field(default="")
    injection_guardrails: dict[str, bool] = Field(
        default_factory=lambda: {
            "auto_generate_env_example": True,
            "zod_env_validation": True,
            "secret_redaction_in_logs": True,
            "prevent_client_secret_leaks": True,
        }
    )


class ImplementationPlanStep(BaseModel):
    """A single ordered execution step in the project implementation plan."""

    id: str = Field(default="step_1")
    step_number: int = Field(..., description="1-indexed execution order")
    phase: str = Field(
        default="foundation",
        description="foundation, data_layer, backend_api, frontend_ui, verification",
    )
    title: str = Field(..., description="Concise step title")
    description: str = Field(..., description="Detailed technical description of work")
    files_to_create: list[str] = Field(
        default_factory=list,
        description="List of relative file paths created or modified in this step",
    )
    dependencies: list[str] = Field(
        default_factory=list,
        description="npm or pip packages required by this step",
    )
    verification_command: str = Field(
        default="npm run type-check",
        description="Command used to verify this step succeeded",
    )
    estimated_seconds: int = Field(default=20)
    status: Literal["pending", "ready", "completed"] = Field(default="ready")


class ImplementationPlan(BaseModel):
    """Complete step-by-step implementation plan generated before code synthesis."""

    id: str = Field(default="plan_01")
    project_name: str = Field(default="Novastride Fleet")
    architecture_summary: str = Field(
        default="Next.js App Router full-stack architecture with modular UI components, typed API routes, and automated Playwright verification."
    )
    estimated_files_count: int = Field(default=14)
    estimated_duration_seconds: int = Field(default=45)
    environment_keys_configured: list[str] = Field(default_factory=list)
    steps: list[ImplementationPlanStep] = Field(default_factory=list)
    test_strategy: list[str] = Field(
        default_factory=lambda: [
            "TypeScript strict compilation check (`tsc --noEmit`)",
            "Next.js production bundle verification (`next build`)",
            "Playwright E2E route rendering & zero console-error audit",
        ]
    )
    security_checks: list[str] = Field(
        default_factory=lambda: [
            "Zero hardcoded secrets in generated source files",
            "Server-only keys isolated from NEXT_PUBLIC_ client bundle",
            "Input validation via Zod schemas on all API routes",
        ]
    )
    approved: bool = Field(default=False)
