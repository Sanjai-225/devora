"""Devora Backend — Phase 5 ExecutionProvider abstract interface.

Defines the replaceable adapter contract for creating isolated project workspaces,
reading/writing files safely, managing background preview processes with PID tracking,
allocating preview ports, executing commands with timeouts, and capturing runtime logs.
"""

from abc import ABC, abstractmethod
from typing import Literal, Optional

from pydantic import BaseModel, Field


class WorkspaceFileEntry(BaseModel):
    """Metadata for a single file or directory inside a project workspace."""

    path: str = Field(..., description="Relative path from workspace root")
    name: str = Field(..., description="Base file or folder name")
    is_dir: bool = False
    size_bytes: int = 0
    language: str = "plaintext"
    git_status: Literal["clean", "modified", "added", "untracked"] = "clean"
    updated_at: str = ""


class WorkspaceLogEntry(BaseModel):
    """Single captured log line from workspace process or command execution."""

    id: str
    timestamp: str
    stream: Literal["stdout", "stderr", "system"] = "system"
    tag: str = "Runtime"
    message: str


class CommandExecutionResult(BaseModel):
    """Structured result of executing a command inside the isolated workspace."""

    command: str
    exit_code: int
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    timed_out: bool = False
    executed_at: str = ""


class WorkspaceRuntimeStatus(BaseModel):
    """Complete runtime status of an isolated project workspace."""

    workspace_id: str
    project_id: str
    project_name: str = "Novastride Fleet"
    workspace_path: str
    status: Literal["stopped", "starting", "running", "error"] = "stopped"
    pid: Optional[int] = None
    allocated_port: Optional[int] = None
    preview_url: Optional[str] = None
    hosting_tier: str = "free_tier_ephemeral"
    files_count: int = 0
    cpu_percent: float = 4.2
    memory_mb: float = 128.0
    last_command: Optional[str] = None
    created_at: str
    updated_at: str


class ExecutionProvider(ABC):
    """Abstract interface for project workspace isolation and execution."""

    @abstractmethod
    async def create_workspace(
        self,
        project_id: str,
        project_name: str = "Novastride Fleet",
        template: str = "nextjs",
    ) -> WorkspaceRuntimeStatus:
        """Create an isolated workspace directory and scaffold starter files."""

    @abstractmethod
    async def get_status(self, project_id: str) -> WorkspaceRuntimeStatus:
        """Return current workspace status, port, PID, and metrics."""

    @abstractmethod
    async def start_workspace(self, project_id: str) -> WorkspaceRuntimeStatus:
        """Allocate a port, start the preview process, and track its PID."""

    @abstractmethod
    async def stop_workspace(self, project_id: str) -> WorkspaceRuntimeStatus:
        """Stop the running preview process and release its PID."""

    @abstractmethod
    async def restart_workspace(self, project_id: str) -> WorkspaceRuntimeStatus:
        """Restart the workspace preview server cleanly."""

    @abstractmethod
    async def destroy_workspace(self, project_id: str) -> bool:
        """Stop any running processes, release ports, and remove workspace files."""

    @abstractmethod
    async def list_files(self, project_id: str, directory: str = "") -> list[WorkspaceFileEntry]:
        """List all files inside the workspace (or a subdirectory)."""

    @abstractmethod
    async def read_file(self, project_id: str, relative_path: str) -> str:
        """Read UTF-8 content of a file inside the workspace after path validation."""

    @abstractmethod
    async def write_file(
        self,
        project_id: str,
        relative_path: str,
        content: str,
    ) -> WorkspaceFileEntry:
        """Write UTF-8 content to a file inside the workspace after path validation."""

    @abstractmethod
    async def delete_file(self, project_id: str, relative_path: str) -> bool:
        """Delete a file inside the workspace after path validation."""

    @abstractmethod
    async def execute_command(
        self,
        project_id: str,
        command: str,
        timeout_seconds: int = 30,
        env_vars: Optional[dict[str, str]] = None,
        redact_secrets: Optional[list[str]] = None,
    ) -> CommandExecutionResult:
        """Execute a command inside the workspace with timeout and output capture."""

    @abstractmethod
    async def get_logs(self, project_id: str, limit: int = 100) -> list[WorkspaceLogEntry]:
        """Return recent stdout/stderr/system logs for the workspace."""
