"""Devora Backend — Phase 5 Workspace & Execution API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.schemas import (
    WorkspaceCommandRequest,
    WorkspaceCommandResponse,
    WorkspaceFileReadResponse,
    WorkspaceFileSchema,
    WorkspaceFileWriteRequest,
    WorkspaceLogSchema,
    WorkspaceStatusResponse,
)
from app.providers.local_process_manager import (
    PathTraversalError,
    get_execution_provider,
)
from app.services import workspace_service

router = APIRouter(prefix="/projects/{project_id}/workspace", tags=["workspace"])


@router.get("", response_model=WorkspaceStatusResponse)
async def get_workspace_status(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get or initialize the isolated workspace status, files, and runtime logs."""
    try:
        return await workspace_service.create_or_get_workspace(
            project_id=project_id,
            user_id=current_user.uid,
            auto_start=False,
        )
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("", response_model=WorkspaceStatusResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    project_id: str,
    auto_start: bool = Query(True, description="Automatically start preview server"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Initialize an isolated workspace and optionally start its preview server."""
    try:
        return await workspace_service.create_or_get_workspace(
            project_id=project_id,
            user_id=current_user.uid,
            auto_start=auto_start,
        )
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/start", response_model=WorkspaceStatusResponse)
async def start_workspace(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Allocate a preview port and start the workspace process with PID tracking."""
    try:
        return await workspace_service.start_project_workspace(
            project_id=project_id,
            user_id=current_user.uid,
        )
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/stop", response_model=WorkspaceStatusResponse)
async def stop_workspace(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Stop the running workspace process and release its allocated port."""
    try:
        return await workspace_service.stop_project_workspace(
            project_id=project_id,
            user_id=current_user.uid,
        )
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/restart", response_model=WorkspaceStatusResponse)
async def restart_workspace(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Restart the workspace preview server cleanly."""
    try:
        return await workspace_service.restart_project_workspace(
            project_id=project_id,
            user_id=current_user.uid,
        )
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def destroy_workspace(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Stop all workspace processes and clean up its isolated directory."""
    try:
        await workspace_service.cleanup_project_workspace(
            project_id=project_id,
            user_id=current_user.uid,
        )
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/files", response_model=list[WorkspaceFileSchema])
async def list_workspace_files(
    project_id: str,
    directory: str = Query("", description="Optional relative subdirectory"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """List files inside the isolated workspace."""
    try:
        provider = get_execution_provider()
        entries = await provider.list_files(project_id, directory=directory)
        return [WorkspaceFileSchema(**e.model_dump()) for e in entries]
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/files/content", response_model=WorkspaceFileReadResponse)
async def read_workspace_file(
    project_id: str,
    path: str = Query(..., description="Relative file path inside workspace"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Read a file inside the isolated workspace after path traversal validation."""
    try:
        return await workspace_service.read_workspace_file(
            project_id=project_id,
            user_id=current_user.uid,
            relative_path=path,
        )
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put("/files/content", response_model=WorkspaceFileSchema)
async def write_workspace_file(
    project_id: str,
    payload: WorkspaceFileWriteRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Write a file inside the isolated workspace after path traversal validation."""
    try:
        return await workspace_service.write_workspace_file(
            project_id=project_id,
            user_id=current_user.uid,
            relative_path=payload.path,
            content=payload.content,
        )
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/exec", response_model=WorkspaceCommandResponse)
async def execute_workspace_command(
    project_id: str,
    payload: WorkspaceCommandRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Execute a command inside the isolated workspace with timeout and secret redaction."""
    try:
        return await workspace_service.execute_workspace_command(
            project_id=project_id,
            user_id=current_user.uid,
            payload=payload,
        )
    except (PathTraversalError, PermissionError) as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/logs", response_model=list[WorkspaceLogSchema])
async def get_workspace_logs(
    project_id: str,
    limit: int = Query(100, ge=1, le=300),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieve captured runtime logs for the workspace."""
    try:
        provider = get_execution_provider()
        logs = await provider.get_logs(project_id, limit=limit)
        return [WorkspaceLogSchema(**lg.model_dump()) for lg in logs]
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
