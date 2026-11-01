"""Devora Backend — Phase 4 Configuration & Implementation Plan REST API routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.agent import get_agent_manager
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.schemas import (
    ConfigurationSaveRequest,
    ConfigurationStateResponse,
    DatabaseTestRequest,
    DatabaseTestResponse,
    ImplementationPlanResponse,
)
from app.services import configuration_service, firestore_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects/{project_id}", tags=["configuration"])


async def _verify_project_access(project_id: str, user_id: str):
    project = await firestore_service.get_project(project_id, user_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "RESOURCE_NOT_FOUND",
                    "message": f"Project '{project_id}' not found",
                }
            },
        )
    return project


@router.get("/configuration", response_model=ConfigurationStateResponse)
async def get_project_configuration(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Detect or retrieve required environment variables, masked secrets, and guardrails."""
    await _verify_project_access(project_id, user.uid)
    manager = await get_agent_manager()
    session = manager.get_session(project_id, user.uid)
    return await configuration_service.get_or_detect_configuration(
        project_id, user.uid, session
    )


@router.post("/configuration", response_model=ConfigurationStateResponse)
async def save_project_configuration(
    project_id: str,
    body: ConfigurationSaveRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Save project environment variables into the encrypted server vault and return masked state."""
    await _verify_project_access(project_id, user.uid)
    manager = await get_agent_manager()
    session = manager.get_session(project_id, user.uid)
    return await configuration_service.save_project_configuration(
        project_id, user.uid, session, body
    )


@router.post("/configuration/test-db", response_model=DatabaseTestResponse)
async def test_database_connection(
    project_id: str,
    body: DatabaseTestRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Test database connection URI reachability and TLS configuration."""
    await _verify_project_access(project_id, user.uid)
    return await configuration_service.test_database_connection(project_id, body)


@router.get("/plan", response_model=ImplementationPlanResponse)
async def get_implementation_plan(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Retrieve (or auto-generate) the project's multi-step Implementation Plan."""
    await _verify_project_access(project_id, user.uid)
    manager = await get_agent_manager()
    session = manager.get_session(project_id, user.uid)
    return await configuration_service.generate_or_get_plan(
        project_id, user.uid, session, force_regenerate=False
    )


@router.post("/plan/generate", response_model=ImplementationPlanResponse)
async def generate_implementation_plan(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Regenerate the structured Implementation Plan based on latest configuration & design."""
    await _verify_project_access(project_id, user.uid)
    manager = await get_agent_manager()
    session = manager.get_session(project_id, user.uid)
    return await configuration_service.generate_or_get_plan(
        project_id, user.uid, session, force_regenerate=True
    )


@router.post("/plan/approve", response_model=ImplementationPlanResponse)
async def approve_implementation_plan(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Approve the Implementation Plan and transition the project to the build stage."""
    await _verify_project_access(project_id, user.uid)
    manager = await get_agent_manager()
    session = manager.get_session(project_id, user.uid)
    return await configuration_service.approve_project_plan(
        project_id, user.uid, session
    )
