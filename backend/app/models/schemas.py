"""Devora Backend — Pydantic models for API requests and responses."""

from datetime import datetime
from enum import Enum
from typing import Optional

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


class UpdateUserRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    settings: Optional[dict] = None


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
    confirmed_stack: Optional[dict] = None
    plan_approved: bool = False
    github_repo: Optional[str] = None
    deployment_url: Optional[str] = None
    deployment_provider: Optional[str] = None


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
    has_more: bool = False


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
    version: str = "0.1.0"
    dev_mode: bool = False
    firebase_connected: bool = False

