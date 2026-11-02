"""Devora Backend — Phase 9 GitHub Integrations & Cloud Deployment Routes (Agent 2).

Endpoints:
- `GET /api/v1/integrations` — List user's third-party integrations (GitHub, Vercel, Render) with masked tokens
- `GET /api/v1/integrations/github/oauth-url` — Construct direct GitHub OAuth authorization URL for popup flow
- `POST /api/v1/integrations/connect` — Connect or update GitHub, Vercel, or Render credentials (masked on server)
- `DELETE /api/v1/integrations/{provider}` — Disconnect an integration
- `POST /api/v1/projects/{project_id}/github/push` — Push verified, secret-safe workspace files to a GitHub repository branch
- `POST /api/v1/projects/{project_id}/deploy` — Trigger a user-confirmed deployment to Vercel Hobby (Free) or Render Free Web Service
- `GET /api/v1/projects/{project_id}/deployments` — List deployment history & status for a project
"""

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.schemas import (
    CloudDeploymentRecordSchema,
    CloudDeploymentRequest,
    ConnectIntegrationRequest,
    GitHubOAuthUrlResponse,
    GitHubRepoPushRequest,
    GitHubRepoPushResponse,
    IntegrationStatusSchema,
)
from app.providers.local_process_manager import PathTraversalError
from app.services import deployment_service
from app.services.project_service import verify_project_ownership

router = APIRouter(tags=["integrations & deployment"])


@router.get("/integrations", response_model=list[IntegrationStatusSchema])
async def list_integrations(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """List current user's GitHub, Vercel, and Render integration statuses (tokens masked)."""
    records = await deployment_service.list_user_integrations(current_user.uid)
    return [IntegrationStatusSchema(**r) for r in records]


@router.get("/integrations/github/oauth-url", response_model=GitHubOAuthUrlResponse)
async def get_github_oauth_url(
    redirect_uri: Optional[str] = Query(None, description="Optional OAuth callback redirect URI"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Return the direct GitHub OAuth authorization URL for popup-based connection."""
    payload = deployment_service.build_github_oauth_url(redirect_uri=redirect_uri)
    return GitHubOAuthUrlResponse(**payload)


@router.post("/integrations/connect", response_model=IntegrationStatusSchema)
async def connect_integration(
    payload: ConnectIntegrationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Connect or update a GitHub, Vercel, or Render integration (stores only masked token metadata)."""
    try:
        updated = await deployment_service.connect_user_integration(
            user_id=current_user.uid,
            provider=payload.provider,
            account_handle=payload.account_handle,
            token_or_code=payload.token_or_code,
        )
        return IntegrationStatusSchema(**updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/integrations/{provider}", response_model=IntegrationStatusSchema)
async def disconnect_integration(
    provider: Literal["github", "vercel", "render"],
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Disconnect a user's third-party integration."""
    try:
        updated = await deployment_service.disconnect_user_integration(
            user_id=current_user.uid,
            provider=provider,
        )
        return IntegrationStatusSchema(**updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/projects/{project_id}/github/push",
    response_model=GitHubRepoPushResponse,
)
async def push_project_to_github_route(
    project_id: str,
    payload: GitHubRepoPushRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Push secret-safe workspace files and Git checkpoint to the user's GitHub repository branch."""
    try:
        await verify_project_ownership(project_id, current_user.uid)
        result = await deployment_service.push_project_to_github(
            project_id=project_id,
            user_id=current_user.uid,
            repo_name=payload.repo_name,
            branch=payload.branch,
            commit_message=payload.commit_message,
            create_if_missing=payload.create_if_missing,
        )
        return GitHubRepoPushResponse(**result)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except PathTraversalError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post(
    "/projects/{project_id}/deploy",
    response_model=CloudDeploymentRecordSchema,
)
async def deploy_project_to_cloud(
    project_id: str,
    payload: CloudDeploymentRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Trigger a user-confirmed deployment to Vercel Hobby (Free) or Render Free Web Service."""
    try:
        await verify_project_ownership(project_id, current_user.uid)
        record = await deployment_service.trigger_cloud_deployment(
            project_id=project_id,
            user_id=current_user.uid,
            target_provider=payload.provider,
            user_confirmed=payload.user_confirmed,
            target_branch=payload.target_branch,
            environment=payload.environment,
        )
        return CloudDeploymentRecordSchema(**record)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get(
    "/projects/{project_id}/deployments",
    response_model=list[CloudDeploymentRecordSchema],
)
async def list_project_deployments_route(
    project_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """List cloud deployment history and status for a project."""
    try:
        await verify_project_ownership(project_id, current_user.uid)
        records = await deployment_service.list_project_deployments(
            project_id=project_id,
            user_id=current_user.uid,
        )
        return [CloudDeploymentRecordSchema(**r) for r in records]
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
