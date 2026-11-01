"""Devora Backend — Phase 5 Workspace & Execution service.

Coordinates the `ExecutionProvider` (`LocalProcessManager`) with project ownership,
server-side secret redaction, and Cloud Firestore workspace state persistence
(`/projects/{projectId}/workspaces/{workspaceId}`).
"""

import logging
from typing import Optional

from app.core.firebase import get_firestore_client
from app.models.schemas import (
    PreviewStatus,
    ProjectStatus,
    UpdateProjectRequest,
    WorkspaceCommandRequest,
    WorkspaceCommandResponse,
    WorkspaceFileReadResponse,
    WorkspaceFileSchema,
    WorkspaceLogSchema,
    WorkspaceStatusResponse,
)
from app.providers.local_process_manager import (
    PathTraversalError,
    get_execution_provider,
)
from app.services import configuration_service, firestore_service

logger = logging.getLogger(__name__)


async def _sync_workspace_to_firestore(
    project_id: str,
    user_id: str,
    status_obj: WorkspaceStatusResponse,
) -> None:
    """Persist Workspace metadata to Firestore (/projects/{projectId}/workspaces/{workspaceId})."""
    db = get_firestore_client()
    if db is not None:
        try:
            db.collection("projects").document(project_id).collection(
                "workspaces"
            ).document(status_obj.workspace_id).set(
                {
                    "id": status_obj.workspace_id,
                    "projectId": project_id,
                    "userId": user_id,
                    "status": status_obj.status.value
                    if hasattr(status_obj.status, "value")
                    else str(status_obj.status),
                    "allocatedPort": status_obj.allocated_port or 0,
                    "processId": status_obj.pid or 0,
                    "previewUrl": status_obj.preview_url or "",
                    "hostingTier": status_obj.hosting_tier,
                    "filesCount": status_obj.files_count,
                    "lastCommand": status_obj.last_command or "workspace init",
                    "createdAt": status_obj.created_at,
                    "updatedAt": status_obj.updated_at,
                }
            )
        except Exception as e:
            logger.warning(f"Firestore workspace sync skipped: {e}")


async def _build_workspace_response(
    project_id: str,
    user_id: str,
) -> WorkspaceStatusResponse:
    provider = get_execution_provider()
    runtime = await provider.get_status(project_id)
    files = await provider.list_files(project_id)
    logs = await provider.get_logs(project_id, limit=100)

    resp = WorkspaceStatusResponse(
        workspace_id=runtime.workspace_id,
        project_id=project_id,
        project_name=runtime.project_name,
        workspace_path=runtime.workspace_path,
        status=PreviewStatus(runtime.status),
        pid=runtime.pid,
        allocated_port=runtime.allocated_port,
        preview_url=runtime.preview_url,
        hosting_tier=runtime.hosting_tier,
        files_count=runtime.files_count,
        cpu_percent=runtime.cpu_percent,
        memory_mb=runtime.memory_mb,
        last_command=runtime.last_command,
        files=[WorkspaceFileSchema(**f.model_dump()) for f in files],
        logs=[WorkspaceLogSchema(**lg.model_dump()) for lg in logs],
        created_at=runtime.created_at,
        updated_at=runtime.updated_at,
    )
    await _sync_workspace_to_firestore(project_id, user_id, resp)
    return resp


async def create_or_get_workspace(
    project_id: str,
    user_id: str,
    auto_start: bool = False,
) -> WorkspaceStatusResponse:
    """Create or retrieve an isolated workspace for the project."""
    project = await firestore_service.get_project(project_id, user_id)
    project_name = project.name if project else "Novastride Fleet"

    provider = get_execution_provider()
    await provider.create_workspace(project_id, project_name=project_name)
    if auto_start:
        await provider.start_workspace(project_id)

    return await _build_workspace_response(project_id, user_id)


async def start_project_workspace(
    project_id: str,
    user_id: str,
) -> WorkspaceStatusResponse:
    """Start the isolated workspace preview server and update project status."""
    provider = get_execution_provider()
    await provider.start_workspace(project_id)
    await firestore_service.update_project(
        project_id,
        user_id,
        UpdateProjectRequest(
            status=ProjectStatus.BUILDING,
            current_agent_stage="workspace_running",
        ),
    )
    return await _build_workspace_response(project_id, user_id)


async def stop_project_workspace(
    project_id: str,
    user_id: str,
) -> WorkspaceStatusResponse:
    """Stop the isolated workspace preview server."""
    provider = get_execution_provider()
    await provider.stop_workspace(project_id)
    return await _build_workspace_response(project_id, user_id)


async def restart_project_workspace(
    project_id: str,
    user_id: str,
) -> WorkspaceStatusResponse:
    """Restart the isolated workspace preview server."""
    provider = get_execution_provider()
    await provider.restart_workspace(project_id)
    return await _build_workspace_response(project_id, user_id)


async def cleanup_project_workspace(
    project_id: str,
    user_id: str,
) -> bool:
    """Destroy the isolated workspace directory and stop any running processes."""
    provider = get_execution_provider()
    return await provider.destroy_workspace(project_id)


async def read_workspace_file(
    project_id: str,
    user_id: str,
    relative_path: str,
) -> WorkspaceFileReadResponse:
    """Read a file inside the project's isolated workspace."""
    provider = get_execution_provider()
    content = await provider.read_file(project_id, relative_path)
    files = await provider.list_files(project_id)
    matched = next((f for f in files if f.path == relative_path.strip("/")), None)
    return WorkspaceFileReadResponse(
        project_id=project_id,
        path=relative_path,
        language=matched.language if matched else "plaintext",
        size_bytes=len(content.encode("utf-8")),
        content=content,
    )


async def write_workspace_file(
    project_id: str,
    user_id: str,
    relative_path: str,
    content: str,
) -> WorkspaceFileSchema:
    """Write a file inside the project's isolated workspace."""
    provider = get_execution_provider()
    entry = await provider.write_file(project_id, relative_path, content)
    return WorkspaceFileSchema(**entry.model_dump())


async def execute_workspace_command(
    project_id: str,
    user_id: str,
    payload: WorkspaceCommandRequest,
) -> WorkspaceCommandResponse:
    """Execute a shell command inside the isolated workspace with secret redaction."""
    provider = get_execution_provider()
    secrets_map = configuration_service.get_raw_project_secrets(project_id)
    redact_list = list(secrets_map.values())

    result = await provider.execute_command(
        project_id=project_id,
        command=payload.command,
        timeout_seconds=payload.timeout_seconds,
        env_vars=secrets_map,
        redact_secrets=redact_list,
    )
    return WorkspaceCommandResponse(**result.model_dump())
