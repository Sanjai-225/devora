"""Devora Backend — Project routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional

from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.schemas import (
    AutoBuildRequest,
    AutoBuildResponse,
    CreateProjectRequest,
    ProjectListResponse,
    ProjectResponse,
    PromptSuggestionRequest,
    PromptSuggestionResponse,
    UpdateProjectRequest,
)
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/suggest", response_model=PromptSuggestionResponse)
async def suggest_website_architecture(
    request: PromptSuggestionRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Analyze a natural language website prompt and return AI suggestions for pages, stack, and design."""
    return await project_service.suggest_from_prompt(request.prompt)


@router.post("/auto-build", response_model=AutoBuildResponse, status_code=status.HTTP_201_CREATED)
async def auto_build_website(
    request: AutoBuildRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """One-click Auto-Build for User role: handles all default configurations and generates a multi-page live website."""
    return await project_service.auto_build_project(user.uid, request)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """List the current user's projects."""
    projects, total = await project_service.list_projects(
        user_id=user.uid,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )
    return ProjectListResponse(
        projects=projects,
        total=total,
        has_more=(offset + limit) < total,
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    request: CreateProjectRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Create a new project."""
    return await project_service.create_project(user.uid, request)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Get a project by ID."""
    project = await project_service.get_project(project_id, user.uid)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found"},
        )
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    request: UpdateProjectRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Update a project."""
    project = await project_service.update_project(project_id, user.uid, request)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found"},
        )
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Delete a project."""
    deleted = await project_service.delete_project(project_id, user.uid)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found"},
        )

