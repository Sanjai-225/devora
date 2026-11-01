"""Devora Backend — Pydantic models for API requests and responses."""

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    ANALYZING = "analyzing"
    CLARIFYING = "clarifying"
    DESIGNING = "designing"
    AWAITING_DESIGN_APPROVAL = "awaiting_design_approval"
    CONFIGURING = "configuring"
    PLANNING = "planning"
    AWAITING_PLAN_APPROVAL = "awaiting_plan_approval"
    BUILDING = "building"
    TESTING = "testing"
    REPAIRING = "repairing"
    READY = "ready"
    FAILED = "failed"
    ARCHIVED = "archived"


class DesignChoice(str, Enum):
    DESIGN_FIRST = "design_first"
    DIRECT_CODE = "direct_code"
    PENDING = "pending"


class PreviewStatus(str, Enum):
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    ERROR = "error"


# ── Request Models ──────────────────────────────────────────────────


class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=10000)


class UpdateProjectRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=10000)
    status: Optional[ProjectStatus] = None
    design_choice: Optional[DesignChoice] = None
    current_agent_stage: Optional[str] = None
    requirements: Optional[dict] = None
    clarification_questions: Optional[list[dict]] = None
    confirmed_stack: Optional[dict] = None
    plan_approved: Optional[bool] = None


class UpdateUserRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    settings: Optional[dict] = None


class AgentStartRequest(BaseModel):
    message: Optional[str] = Field(
        None,
        max_length=10000,
        description="Optional additional instructions or override prompt",
    )


class AgentMessageRequest(BaseModel):
    type: Literal["user_message", "clarification_response", "user_approval"] = "user_message"
    content: Optional[str] = None
    answers: Optional[dict[str, str]] = None
    approved: Optional[bool] = None
    stage: Optional[str] = None
    choice: Optional[str] = None


class WorkflowDecisionRequest(BaseModel):
    choice: Literal["design_first", "direct_code"] = Field(
        ...,
        description="Whether to generate an interactive prototype in Design Studio or proceed directly to code",
    )


class DesignModifyRequest(BaseModel):
    prompt: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Natural language design modification instruction",
    )
    token_overrides: Optional[dict[str, Any]] = Field(
        None,
        description="Optional direct overrides to color_palette, typography, border_radius, or spacing_scale",
    )


# ── Response Models ─────────────────────────────────────────────────


class UserResponse(BaseModel):
    uid: str
    email: str
    display_name: str
    photo_url: Optional[str] = None
    role: str = "individual"
    created_at: Optional[str] = None
    settings: dict = Field(default_factory=lambda: {
        "preferredLLM": "gemini",
        "defaultFramework": "nextjs",
        "defaultStyling": "tailwind",
    })


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    status: ProjectStatus = ProjectStatus.DRAFT
    description: Optional[str] = None
    created_at: str
    updated_at: str
    design_choice: DesignChoice = DesignChoice.PENDING
    preview_url: Optional[str] = None
    preview_status: PreviewStatus = PreviewStatus.STOPPED
    workspace_id: Optional[str] = None
    current_agent_stage: Optional[str] = None
    requirements: Optional[dict] = None
    clarification_questions: Optional[list[dict]] = None
    confirmed_stack: Optional[dict] = None
    plan_approved: bool = False
    github_repo: Optional[str] = None
    deployment_url: Optional[str] = None
    deployment_provider: Optional[str] = None


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
    has_more: bool = False


class ConversationMessageResponse(BaseModel):
    id: str
    project_id: str
    role: Literal["user", "agent", "system"]
    content: str
    timestamp: str
    stage: str = "requirement_analysis"
    metadata: Optional[dict[str, Any]] = None


class ConversationListResponse(BaseModel):
    messages: list[ConversationMessageResponse]
    total: int


class DesignVersionResponse(BaseModel):
    id: str
    project_id: str
    version_number: int
    version_tag: str
    label: str
    prompt: str
    summary_of_changes: str
    design_spec: dict[str, Any]
    prototype_code: str
    approved: bool = False
    created_at: str


class DesignVersionListResponse(BaseModel):
    versions: list[DesignVersionResponse]
    active_version_id: Optional[str] = None
    approved_version_id: Optional[str] = None


class AgentStateResponse(BaseModel):
    project_id: str
    status: ProjectStatus
    current_stage: str
    requirements: Optional[dict] = None
    clarification_questions: list[dict] = Field(default_factory=list)
    confirmed_stack: Optional[dict] = None
    design_choice: DesignChoice = DesignChoice.PENDING
    should_wait_for_user: bool = False
    wait_reason: Optional[str] = None
    latest_response: Optional[str] = None
    messages: list[ConversationMessageResponse] = Field(default_factory=list)
    events: list[dict] = Field(default_factory=list)


class ConfigurationVariableSchema(BaseModel):
    key: str
    description: str
    category: str = "app_config"
    scope: Literal["server_only", "client_public"] = "server_only"
    required: bool = True
    default_value: Optional[str] = None
    placeholder: Optional[str] = None
    encryption: str = "AES-256"
    environments: list[str] = Field(
        default_factory=lambda: ["development", "staging", "production"]
    )
    is_configured: bool = False
    masked_value: Optional[str] = None


class SecretFileSchema(BaseModel):
    filename: str
    mount_path: str
    description: str
    required: bool = False
    max_size_kb: int = 64
    uploaded: bool = False
    size_bytes: Optional[int] = None


class ConfigurationSaveRequest(BaseModel):
    environment: Literal["development", "staging", "production"] = "development"
    values: dict[str, str] = Field(
        default_factory=dict,
        description="Key-value map of environment variables to store in server-side vault",
    )
    database_engine: Optional[str] = None
    database_uri: Optional[str] = None
    ssl_mode: Optional[str] = "require"
    connection_pooling: bool = True
    guardrails: Optional[dict[str, bool]] = None


class DatabaseTestRequest(BaseModel):
    engine: str = "postgresql"
    connection_uri: str = Field(..., min_length=5, max_length=2048)
    ssl_mode: str = "require"
    connection_pooling: bool = True


class DatabaseTestResponse(BaseModel):
    reachable: bool
    engine: str
    latency_ms: int
    tls_version: str = "TLS 1.3"
    pool_mode: str = "Supavisor / PgBouncer Transaction"
    message: str


class ConfigurationStateResponse(BaseModel):
    project_id: str
    project_type: str = "dashboard"
    environment: str = "development"
    requires_credentials: bool = True
    requires_database_url: bool = True
    database_engine: str = "postgresql"
    masked_database_uri: str = ""
    ssl_mode: str = "require"
    connection_pooling: bool = True
    variables: list[ConfigurationVariableSchema] = Field(default_factory=list)
    secret_files: list[SecretFileSchema] = Field(default_factory=list)
    guardrails: dict[str, bool] = Field(
        default_factory=lambda: {
            "auto_generate_env_example": True,
            "zod_env_validation": True,
            "secret_redaction_in_logs": True,
            "prevent_client_secret_leaks": True,
        }
    )
    security_score: int = 98
    summary_note: str = ""
    updated_at: str


class ImplementationPlanStepSchema(BaseModel):
    id: str
    step_number: int
    title: str
    phase: str
    description: str
    files_to_create: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    verification_command: str = "npm run build"
    estimated_seconds: int = 15
    status: Literal["pending", "ready", "completed"] = "ready"


class ImplementationPlanResponse(BaseModel):
    id: str
    project_id: str
    project_name: str
    architecture_summary: str
    estimated_files_count: int
    estimated_duration_seconds: int
    environment_keys_configured: list[str] = Field(default_factory=list)
    steps: list[ImplementationPlanStepSchema] = Field(default_factory=list)
    test_strategy: list[str] = Field(default_factory=list)
    security_checks: list[str] = Field(default_factory=list)
    approved: bool = False
    created_at: str
    updated_at: str


class WorkspaceFileSchema(BaseModel):
    path: str
    name: str
    is_dir: bool = False
    size_bytes: int = 0
    language: str = "plaintext"
    git_status: Literal["clean", "modified", "added", "untracked"] = "clean"
    updated_at: str = ""


class WorkspaceLogSchema(BaseModel):
    id: str
    timestamp: str
    stream: Literal["stdout", "stderr", "system"] = "system"
    tag: str = "Runtime"
    message: str


class WorkspaceFileWriteRequest(BaseModel):
    path: str = Field(..., min_length=1, max_length=512)
    content: str = Field(..., max_length=500000)


class WorkspaceFileReadResponse(BaseModel):
    project_id: str
    path: str
    language: str
    size_bytes: int
    content: str


class WorkspaceCommandRequest(BaseModel):
    command: str = Field(..., min_length=1, max_length=1024)
    timeout_seconds: int = Field(30, ge=1, le=300)


class WorkspaceCommandResponse(BaseModel):
    command: str
    exit_code: int
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    timed_out: bool = False
    executed_at: str = ""


class WorkspaceStatusResponse(BaseModel):
    workspace_id: str
    project_id: str
    project_name: str
    workspace_path: str
    status: PreviewStatus = PreviewStatus.STOPPED
    pid: Optional[int] = None
    allocated_port: Optional[int] = None
    preview_url: Optional[str] = None
    hosting_tier: str = "render_free_tmp"
    files_count: int = 0
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    last_command: Optional[str] = None
    files: list[WorkspaceFileSchema] = Field(default_factory=list)
    logs: list[WorkspaceLogSchema] = Field(default_factory=list)
    created_at: str
    updated_at: str


class ErrorResponse(BaseModel):
    error: dict = Field(
        ...,
        json_schema_extra={
            "example": {
                "code": "RESOURCE_NOT_FOUND",
                "message": "Project not found",
            }
        },
    )


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.5.0"
    dev_mode: bool = False
    firebase_connected: bool = False

