"""Devora Backend — Phase 3 Optional Design System API routes.

Endpoints:
- POST /api/v1/projects/{project_id}/design/choice
- POST /api/v1/projects/{project_id}/design/generate
- POST /api/v1/projects/{project_id}/design/modify
- GET  /api/v1/projects/{project_id}/design/versions
- GET  /api/v1/projects/{project_id}/design/versions/{version_id}
- POST /api/v1/projects/{project_id}/design/versions/{version_id}/approve
- POST /api/v1/projects/{project_id}/design/versions/{version_id}/restore
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.agent import get_agent_manager
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.schemas import (
    DesignChoice,
    DesignModifyRequest,
    DesignVersionListResponse,
    DesignVersionResponse,
    ProjectStatus,
    UpdateProjectRequest,
    WorkflowDecisionRequest,
)
from app.services import conversation_service, design_service, project_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["design"])


async def _verify_project_access(project_id: str, user_id: str):
    project = await project_service.get_project(project_id, user_id)
    if not project:
        raise HTTPException(
            status_code=404,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Project not found"},
        )
    return project


async def _ensure_agent_session(project: Any):
    manager = await get_agent_manager()
    session = manager.get_session(project.id, project.user_id)
    state = await session.get_current_state()
    if not state.get("requirements") and project.requirements:
        session._state["requirements"] = project.requirements
        session._state["confirmed_stack"] = project.confirmed_stack
    elif not state.get("requirements"):
        async for _ in session.start_analysis(
            project.description or project.name
        ):
            pass
    return session


def _normalize_summary(val: Any) -> str:
    if isinstance(val, list):
        return " • ".join(str(x) for x in val)
    return str(val or "")


@router.post(
    "/projects/{project_id}/design/choice",
    response_model=dict[str, Any],
)
async def set_design_workflow_choice(
    project_id: str,
    body: WorkflowDecisionRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Record user's workflow decision: 'design_first' vs 'direct_code'."""
    project = await _verify_project_access(project_id, user.uid)
    session = await _ensure_agent_session(project)

    result = await session.set_workflow_choice(body.choice)

    new_status = (
        ProjectStatus.DESIGNING
        if body.choice == "design_first"
        else ProjectStatus.CONFIGURING
    )
    choice_enum = (
        DesignChoice.DESIGN_FIRST
        if body.choice == "design_first"
        else DesignChoice.DIRECT_CODE
    )

    updated_project = await project_service.update_project(
        project_id=project_id,
        user_id=user.uid,
        data=UpdateProjectRequest(
            status=new_status,
            design_choice=choice_enum,
            current_agent_stage=result["current_stage"],
        ),
    )

    response_text = result.get("agent_response") or f"Workflow set to {body.choice}"
    await conversation_service.save_message(
        project_id=project_id,
        role="agent",
        content=response_text,
        stage=result["current_stage"],
        metadata={"design_choice": body.choice},
    )

    return {
        "project_id": project_id,
        "design_choice": body.choice,
        "status": updated_project.status if updated_project else new_status,
        "current_stage": result["current_stage"],
        "next_route": (
            f"/projects/{project_id}/design-studio"
            if body.choice == "design_first"
            else f"/workspace?project={project_id}"
        ),
        "message": response_text,
    }


@router.post(
    "/projects/{project_id}/design/generate",
    response_model=DesignVersionResponse,
)
async def generate_initial_design(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Generate the initial DesignSpecification + React/TypeScript prototype."""
    project = await _verify_project_access(project_id, user.uid)
    session = await _ensure_agent_session(project)

    out = await session.generate_design()
    version_dict = out["design_versions"][-1]

    saved = await design_service.save_version(
        project_id=project_id,
        design_spec=version_dict["design_spec"],
        prototype_code=version_dict["prototype_code"],
        prompt=version_dict["prompt"],
        label=version_dict["label"],
        summary_of_changes=_normalize_summary(version_dict["summary_of_changes"]),
        approved=version_dict["approved"],
        version_id=version_dict["id"],
        version_number=version_dict["version_number"],
        version_tag=version_dict["version_tag"],
    )

    await project_service.update_project(
        project_id=project_id,
        user_id=user.uid,
        data=UpdateProjectRequest(
            status=ProjectStatus.AWAITING_DESIGN_APPROVAL,
            design_choice=DesignChoice.DESIGN_FIRST,
            current_agent_stage="awaiting_design_approval",
        ),
    )

    await conversation_service.save_message(
        project_id=project_id,
        role="agent",
        content=out.get("agent_response", "Generated initial design prototype."),
        stage="design_generation",
        metadata={"version_id": saved.id, "version_tag": saved.version_tag},
    )

    return saved


@router.post(
    "/projects/{project_id}/design/modify",
    response_model=DesignVersionResponse,
)
async def modify_project_design(
    project_id: str,
    body: DesignModifyRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Apply natural-language or token modifications and create a new design version."""
    project = await _verify_project_access(project_id, user.uid)
    session = await _ensure_agent_session(project)

    existing = await design_service.list_versions(project_id)
    if not session._state.get("design_versions") and existing.versions:
        session._state["design_versions"] = [v.model_dump() for v in existing.versions]
        session._state["design_specification"] = existing.versions[-1].design_spec

    await conversation_service.save_message(
        project_id=project_id,
        role="user",
        content=body.prompt,
        stage="design_modification",
        metadata={"token_overrides": body.token_overrides} if body.token_overrides else None,
    )

    out = await session.modify_design(
        instruction=body.prompt,
        token_overrides=body.token_overrides,
    )
    version_dict = out["design_versions"][-1]

    saved = await design_service.save_version(
        project_id=project_id,
        design_spec=version_dict["design_spec"],
        prototype_code=version_dict["prototype_code"],
        prompt=version_dict["prompt"],
        label=version_dict["label"],
        summary_of_changes=_normalize_summary(version_dict["summary_of_changes"]),
        approved=version_dict["approved"],
        version_id=version_dict["id"],
        version_number=version_dict["version_number"],
        version_tag=version_dict["version_tag"],
    )

    await conversation_service.save_message(
        project_id=project_id,
        role="agent",
        content=out.get("agent_response", "Applied design modification."),
        stage="awaiting_design_approval",
        metadata={"version_id": saved.id, "version_tag": saved.version_tag},
    )

    return saved


@router.get(
    "/projects/{project_id}/design/versions",
    response_model=DesignVersionListResponse,
)
async def list_project_design_versions(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """List all design versions for a project."""
    await _verify_project_access(project_id, user.uid)
    return await design_service.list_versions(project_id)


@router.get(
    "/projects/{project_id}/design/versions/{version_id}",
    response_model=DesignVersionResponse,
)
async def get_project_design_version(
    project_id: str,
    version_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Get a specific design version by ID."""
    await _verify_project_access(project_id, user.uid)
    version = await design_service.get_version(project_id, version_id)
    if not version:
        raise HTTPException(
            status_code=404,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Design version not found"},
        )
    return version


@router.post(
    "/projects/{project_id}/design/versions/{version_id}/approve",
    response_model=DesignVersionResponse,
)
async def approve_project_design_version(
    project_id: str,
    version_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Approve a design version and advance project status to CONFIGURING."""
    project = await _verify_project_access(project_id, user.uid)
    session = await _ensure_agent_session(project)

    approved = await design_service.approve_version(project_id, version_id)
    if not approved:
        raise HTTPException(
            status_code=404,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Design version not found"},
        )

    await session.approve_design(version_id)

    await project_service.update_project(
        project_id=project_id,
        user_id=user.uid,
        data=UpdateProjectRequest(
            status=ProjectStatus.CONFIGURING,
            design_choice=DesignChoice.DESIGN_FIRST,
            current_agent_stage="configuration",
        ),
    )

    await conversation_service.save_message(
        project_id=project_id,
        role="agent",
        content=f"Design version {approved.version_tag} ({approved.label}) approved and synced with codebase.",
        stage="configuration",
        metadata={"approved_version_id": approved.id},
    )

    return approved


@router.post(
    "/projects/{project_id}/design/versions/{version_id}/restore",
    response_model=DesignVersionResponse,
)
async def restore_project_design_version(
    project_id: str,
    version_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Restore a previous design version as the active prototype."""
    project = await _verify_project_access(project_id, user.uid)
    session = await _ensure_agent_session(project)

    restored = await design_service.restore_version(project_id, version_id)
    if not restored:
        raise HTTPException(
            status_code=404,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Design version not found"},
        )

    await session.restore_design_version(version_id)
    return restored
