"""Devora Backend — Phase 5 & Phase 6 Workspace, Execution, Codegen & Git Checkpoint API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.schemas import (
    CodeGenerationRequest,
    CodeGenerationResponse,
    CreateCheckpointRequest,
    DeploymentConfirmationRequest,
    DeploymentConfirmationResponse,
    GitCheckpointSchema,
    IncrementalEditRequest,
    IncrementalEditResponse,
    ProjectExportMetadataResponse,
    VerificationReportResponse,
    WorkspaceCommandRequest,
    WorkspaceCommandResponse,
    WorkspaceFileReadResponse,
    WorkspaceFileSchema,
    WorkspaceFileWriteRequest,
    WorkspaceLogSchema,
    WorkspaceRepairRequest,
    WorkspaceSearchMatchSchema,
    WorkspaceStatusResponse,
    WorkspaceVerifyRequest,
)
from app.providers.local_process_manager import (
    PathTraversalError,
    get_execution_provider,
)
from app.services import codegen_service, export_service, workspace_service
from app.services.project_service import verify_project_ownership


async def _enforce_workspace_ownership(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> None:
    try:
        await verify_project_ownership(project_id, current_user.uid)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


router = APIRouter(
    prefix="/projects/{project_id}/workspace",
    tags=["workspace"],
    dependencies=[Depends(_enforce_workspace_ownership)],
)


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
        visible = [e for e in entries if not e.path.startswith(".git/")]
        return [WorkspaceFileSchema(**e.model_dump()) for e in visible]
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


@router.delete("/files/content", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_file(
    project_id: str,
    path: str = Query(..., description="Relative file path inside workspace"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Delete a file inside the isolated workspace after path traversal validation."""
    try:
        provider = get_execution_provider()
        deleted = await provider.delete_file(project_id, path)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/search", response_model=list[WorkspaceSearchMatchSchema])
async def search_workspace_files(
    project_id: str,
    q: str = Query(..., min_length=1, description="Search query"),
    pattern: str = Query("*", description="Optional glob pattern e.g. *.tsx"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Search across all files in the isolated workspace."""
    try:
        matches = await codegen_service.search_project_workspace_files(
            project_id=project_id,
            user_id=current_user.uid,
            query=q,
            file_pattern=pattern,
        )
        return [WorkspaceSearchMatchSchema(**m.model_dump()) for m in matches]
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/generate", response_model=CodeGenerationResponse)
async def generate_workspace_code(
    project_id: str,
    payload: CodeGenerationRequest = CodeGenerationRequest(),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Generate full project code from plan/requirements and create an initial Git checkpoint."""
    try:
        res = await codegen_service.generate_project_workspace_code(
            project_id=project_id,
            user_id=current_user.uid,
            template_type=payload.template_type,
        )
        return CodeGenerationResponse(**res.model_dump())
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/edit", response_model=IncrementalEditResponse)
async def edit_workspace_code(
    project_id: str,
    payload: IncrementalEditRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Apply a surgical incremental edit to targeted file(s), return unified diffs, and create a Git checkpoint."""
    try:
        res = await codegen_service.edit_project_workspace_code(
            project_id=project_id,
            user_id=current_user.uid,
            prompt=payload.prompt,
            target_files=payload.target_files,
        )
        return IncrementalEditResponse(**res.model_dump())
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/checkpoints", response_model=list[GitCheckpointSchema])
async def list_workspace_checkpoints(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """List Git commit checkpoints recorded inside the project workspace."""
    try:
        records = await codegen_service.list_project_checkpoints(
            project_id=project_id,
            user_id=current_user.uid,
        )
        return [GitCheckpointSchema(**r.model_dump()) for r in records]
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/checkpoints", response_model=GitCheckpointSchema, status_code=status.HTTP_201_CREATED)
async def create_workspace_checkpoint(
    project_id: str,
    payload: CreateCheckpointRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Create a manual Git commit checkpoint inside the isolated project workspace."""
    try:
        chk = await codegen_service.create_manual_checkpoint(
            project_id=project_id,
            user_id=current_user.uid,
            message=payload.message,
            tag=payload.tag,
        )
        return GitCheckpointSchema(**chk.model_dump())
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/checkpoints/{commit_sha}/restore", response_model=GitCheckpointSchema)
async def restore_workspace_checkpoint(
    project_id: str,
    commit_sha: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Restore workspace files to a previous Git checkpoint SHA."""
    try:
        chk = await codegen_service.restore_project_checkpoint(
            project_id=project_id,
            user_id=current_user.uid,
            commit_sha=commit_sha,
        )
        return GitCheckpointSchema(**chk.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/deploy-confirm", response_model=DeploymentConfirmationResponse)
async def confirm_workspace_deployment(
    project_id: str,
    payload: DeploymentConfirmationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Verify explicit user confirmation and Free-Tier readiness before any public deployment."""
    try:
        return await codegen_service.verify_deployment_confirmation(
            project_id=project_id,
            user_id=current_user.uid,
            payload=payload,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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


@router.post("/verify", response_model=VerificationReportResponse)
async def verify_workspace_build_and_tests(
    project_id: str,
    payload: WorkspaceVerifyRequest = WorkspaceVerifyRequest(),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Phase 7: Run build check, Playwright smoke suite, and error analysis (with optional auto-repair)."""
    try:
        report = await codegen_service.verify_project_workspace(
            project_id=project_id,
            user_id=current_user.uid,
            auto_repair=payload.auto_repair,
        )
        return VerificationReportResponse(**report.model_dump())
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/repair", response_model=VerificationReportResponse)
async def repair_workspace_errors_bounded(
    project_id: str,
    payload: WorkspaceRepairRequest = WorkspaceRepairRequest(),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Phase 7: Run bounded surgical auto-repair loop (strictly capped at max 3 attempts)."""
    try:
        report = await codegen_service.repair_project_workspace(
            project_id=project_id,
            user_id=current_user.uid,
            max_attempts=payload.max_attempts,
        )
        return VerificationReportResponse(**report.model_dump())
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/export/metadata", response_model=ProjectExportMetadataResponse)
async def get_workspace_export_metadata(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Phase 8: Inspect secret-safe ZIP export manifest (included files, excluded secrets, .env.example, README.md)."""
    try:
        _, meta = await export_service.build_project_export_zip(
            project_id=project_id,
            user_id=current_user.uid,
        )
        return meta
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/export")
async def download_workspace_export_zip(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Phase 8: Download a secret-safe, standalone ZIP archive of the project with .env.example and README.md."""
    try:
        zip_bytes, meta = await export_service.build_project_export_zip(
            project_id=project_id,
            user_id=current_user.uid,
        )
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{meta.filename}"',
                "X-Devora-Export-Id": meta.export_id,
                "X-Devora-Checkpoint-Sha": meta.checkpoint_sha,
            },
        )
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))



