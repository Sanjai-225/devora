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


class CodeGenerationRequest(BaseModel):
    template_type: str = Field("portfolio", max_length=64)


class IncrementalEditRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=5000)
    target_files: Optional[list[str]] = None


class CreateCheckpointRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=240)
    tag: str = Field("manual", max_length=32)


class GeneratedFileDiffSchema(BaseModel):
    path: str
    change_type: Literal["created", "modified", "deleted"] = "modified"
    language: str = "typescript"
    added_lines: int = 0
    removed_lines: int = 0
    unified_diff: str = ""
    summary: str = ""


class GitCheckpointSchema(BaseModel):
    checkpoint_id: str
    project_id: str
    commit_sha: str
    short_sha: str
    message: str
    tag: str = "checkpoint"
    author: str = "Devora Agent"
    files_changed: int = 0
    created_at: str


class WorkspaceSearchMatchSchema(BaseModel):
    path: str
    line_number: int
    line_content: str
    language: str = "plaintext"


class CodeGenerationResponse(BaseModel):
    project_id: str
    project_name: str
    template_type: str = "portfolio"
    files_created: list[str] = Field(default_factory=list)
    file_diffs: list[GeneratedFileDiffSchema] = Field(default_factory=list)
    dependencies_installed: list[str] = Field(default_factory=list)
    build_passed: bool = True
    build_output: str = ""
    checkpoint: Optional[GitCheckpointSchema] = None
    summary: str = ""
    generated_at: str


class IncrementalEditResponse(BaseModel):
    project_id: str
    prompt: str
    files_modified: list[str] = Field(default_factory=list)
    files_untouched_count: int = 0
    file_diffs: list[GeneratedFileDiffSchema] = Field(default_factory=list)
    build_passed: bool = True
    checkpoint: Optional[GitCheckpointSchema] = None
    summary: str = ""
    edited_at: str


class DeploymentConfirmationRequest(BaseModel):
    user_confirmed: bool = Field(
        ...,
        description="Must be True to confirm public deployment or branch promotion",
    )
    target_branch: Literal["testing", "main"] = "testing"
    frontend_provider: str = "vercel_hobby_free"
    backend_provider: str = "render_free_web_service"


class DeploymentConfirmationResponse(BaseModel):
    project_id: str
    user_confirmed: bool
    ready_for_deploy: bool
    target_branch: str
    frontend_provider: str
    backend_provider: str
    database_provider: str = "firebase_spark_free"
    estimated_monthly_cost_usd: float = 0.0
    latest_checkpoint_sha: str
    verification_checklist: list[str] = Field(default_factory=list)
    confirmed_at: str


class BuildCheckResultSchema(BaseModel):
    project_id: str
    passed: bool
    exit_code: int = 0
    checked_files_count: int = 0
    broken_files: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    checked_at: str


class ConsoleErrorEntrySchema(BaseModel):
    id: str
    source: Literal["build", "console", "runtime", "test"] = "build"
    severity: Literal["error", "warning"] = "error"
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    message: str
    suggestion: str = ""


class PlaywrightTestCaseResultSchema(BaseModel):
    test_id: str
    name: str
    route_or_target: str
    status: Literal["passed", "failed", "skipped"] = "passed"
    duration_ms: int = 12
    assertion_summary: str = ""
    error_message: Optional[str] = None


class PlaywrightSmokeSuiteResultSchema(BaseModel):
    project_id: str
    passed: bool
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    duration_ms: int = 0
    test_cases: list[PlaywrightTestCaseResultSchema] = Field(default_factory=list)
    executed_at: str


class ErrorAnalysisResultSchema(BaseModel):
    project_id: str
    has_errors: bool
    error_count: int = 0
    affected_files: list[str] = Field(default_factory=list)
    root_cause_summary: str = ""
    recommended_fixes: list[str] = Field(default_factory=list)
    console_errors: list[ConsoleErrorEntrySchema] = Field(default_factory=list)
    analyzed_at: str


class RepairAttemptRecordSchema(BaseModel):
    attempt_number: int = Field(..., ge=1, le=3)
    files_repaired: list[str] = Field(default_factory=list)
    fix_description: str
    build_passed_after: bool = False
    tests_passed_after: bool = False
    remaining_errors_count: int = 0
    checkpoint_sha: Optional[str] = None
    repaired_at: str


class WorkspaceVerifyRequest(BaseModel):
    auto_repair: bool = Field(
        False,
        description="Whether to automatically trigger the bounded 3-attempt repair loop if errors are detected",
    )


class WorkspaceRepairRequest(BaseModel):
    max_attempts: int = Field(
        3,
        ge=1,
        le=3,
        description="Maximum number of bounded surgical repair attempts (strictly capped at 3)",
    )


class VerificationReportResponse(BaseModel):
    report_id: str
    project_id: str
    overall_status: Literal["passed", "repaired", "failed"] = "passed"
    build_check: BuildCheckResultSchema
    test_suite: PlaywrightSmokeSuiteResultSchema
    error_analysis: ErrorAnalysisResultSchema
    repair_attempts: int = 0
    max_repair_attempts: int = 3
    repair_history: list[RepairAttemptRecordSchema] = Field(default_factory=list)
    latest_checkpoint_sha: Optional[str] = None
    summary: str
    verified_at: str


class ProjectExportMetadataResponse(BaseModel):
    export_id: str
    project_id: str
    project_name: str
    filename: str
    size_bytes: int = 0
    included_files: list[str] = Field(default_factory=list)
    excluded_secrets: list[str] = Field(default_factory=list)
    has_env_example: bool = True
    has_readme: bool = True
    checkpoint_sha: str = "HEAD"
    exported_at: str


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
    version: str = "0.8.0"
    dev_mode: bool = False
    firebase_connected: bool = False




