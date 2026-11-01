"""Devora Agent — Phase 6 Code Generation, Incremental Diffs & Git Checkpoint models."""

from typing import Literal, Optional
from pydantic import BaseModel, Field


class GeneratedFileDiff(BaseModel):
    """Unified diff metadata for a single generated or modified workspace file."""

    path: str = Field(..., description="Relative file path inside workspace")
    change_type: Literal["created", "modified", "deleted"] = "modified"
    language: str = "typescript"
    added_lines: int = 0
    removed_lines: int = 0
    unified_diff: str = ""
    summary: str = ""


class GitCheckpointRecord(BaseModel):
    """Metadata for a Git commit checkpoint inside an isolated project workspace."""

    checkpoint_id: str
    project_id: str
    commit_sha: str
    short_sha: str
    message: str
    tag: str = "checkpoint"
    author: str = "Devora Agent"
    files_changed: int = 0
    created_at: str


class WorkspaceSearchMatch(BaseModel):
    """Single line match from searching across workspace files."""

    path: str
    line_number: int
    line_content: str
    language: str = "plaintext"


class CodeGenerationResult(BaseModel):
    """Result of full initial project code generation in Phase 6."""

    project_id: str
    project_name: str
    template_type: str = "portfolio"
    files_created: list[str] = Field(default_factory=list)
    file_diffs: list[GeneratedFileDiff] = Field(default_factory=list)
    dependencies_installed: list[str] = Field(default_factory=list)
    build_passed: bool = True
    build_output: str = ""
    checkpoint: Optional[GitCheckpointRecord] = None
    summary: str = ""
    generated_at: str


class IncrementalEditResult(BaseModel):
    """Result of a surgical incremental code edit (modifies only targeted files)."""

    project_id: str
    prompt: str
    files_modified: list[str] = Field(default_factory=list)
    files_untouched_count: int = 0
    file_diffs: list[GeneratedFileDiff] = Field(default_factory=list)
    build_passed: bool = True
    checkpoint: Optional[GitCheckpointRecord] = None
    summary: str = ""
    edited_at: str
