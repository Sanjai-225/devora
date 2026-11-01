"""Devora Backend — Project service layer.

Handles project CRUD operations. Uses Firestore when available,
falls back to in-memory store in DEV_MODE.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.core.firebase import get_firestore_client
from app.models.schemas import (
    CreateProjectRequest,
    DesignChoice,
    PreviewStatus,
    ProjectResponse,
    ProjectStatus,
    UpdateProjectRequest,
)

logger = logging.getLogger(__name__)

# In-memory store for dev mode
_dev_projects: dict[str, dict] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _project_to_response(data: dict) -> ProjectResponse:
    return ProjectResponse(
        id=data["id"],
        user_id=data["user_id"],
        name=data["name"],
        status=data.get("status", ProjectStatus.DRAFT),
        description=data.get("description"),
        created_at=data.get("created_at", _now_iso()),
        updated_at=data.get("updated_at", _now_iso()),
        design_choice=data.get("design_choice", DesignChoice.PENDING),
        preview_url=data.get("preview_url"),
        preview_status=data.get("preview_status", PreviewStatus.STOPPED),
        workspace_id=data.get("workspace_id"),
        current_agent_stage=data.get("current_agent_stage"),
        confirmed_stack=data.get("confirmed_stack"),
        plan_approved=data.get("plan_approved", False),
        github_repo=data.get("github_repo"),
        deployment_url=data.get("deployment_url"),
        deployment_provider=data.get("deployment_provider"),
    )


async def create_project(user_id: str, request: CreateProjectRequest) -> ProjectResponse:
    """Create a new project for a user."""
    project_id = str(uuid.uuid4())[:12]
    now = _now_iso()

    project_data = {
        "id": project_id,
        "user_id": user_id,
        "name": request.name,
        "description": request.description,
        "status": ProjectStatus.DRAFT,
        "design_choice": DesignChoice.PENDING,
        "preview_status": PreviewStatus.STOPPED,
        "plan_approved": False,
        "created_at": now,
        "updated_at": now,
    }

    db = get_firestore_client()
    if db:
        db.collection("projects").document(project_id).set(project_data)
        logger.info(f"Project {project_id} created in Firestore for user {user_id}")
    else:
        _dev_projects[project_id] = project_data
        logger.info(f"Project {project_id} created in memory for user {user_id}")

    return _project_to_response(project_data)


async def get_project(project_id: str, user_id: str) -> Optional[ProjectResponse]:
    """Get a project by ID, verifying ownership."""
    db = get_firestore_client()
    if db:
        doc = db.collection("projects").document(project_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        if data.get("user_id") != user_id:
            return None
        data["id"] = project_id
        return _project_to_response(data)
    else:
        data = _dev_projects.get(project_id)
        if not data or data.get("user_id") != user_id:
            return None
        return _project_to_response(data)


async def list_projects(
    user_id: str,
    status_filter: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[ProjectResponse], int]:
    """List projects for a user."""
    db = get_firestore_client()
    if db:
        query = db.collection("projects").where("user_id", "==", user_id)
        if status_filter:
            query = query.where("status", "==", status_filter)
        query = query.order_by("updated_at", direction="DESCENDING")

        # Get total count (Firestore doesn't have native count in all SDKs)
        all_docs = list(query.stream())
        total = len(all_docs)
        paged = all_docs[offset : offset + limit]

        projects = []
        for doc in paged:
            data = doc.to_dict()
            data["id"] = doc.id
            projects.append(_project_to_response(data))
        return projects, total
    else:
        user_projects = [
            p for p in _dev_projects.values() if p["user_id"] == user_id
        ]
        if status_filter:
            user_projects = [p for p in user_projects if p.get("status") == status_filter]
        user_projects.sort(key=lambda p: p.get("updated_at", ""), reverse=True)
        total = len(user_projects)
        paged = user_projects[offset : offset + limit]
        return [_project_to_response(p) for p in paged], total


async def update_project(
    project_id: str, user_id: str, request: UpdateProjectRequest
) -> Optional[ProjectResponse]:
    """Update a project, verifying ownership."""
    db = get_firestore_client()
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    updates["updated_at"] = _now_iso()

    if db:
        doc_ref = db.collection("projects").document(project_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        if data.get("user_id") != user_id:
            return None
        doc_ref.update(updates)
        data.update(updates)
        data["id"] = project_id
        return _project_to_response(data)
    else:
        data = _dev_projects.get(project_id)
        if not data or data.get("user_id") != user_id:
            return None
        data.update(updates)
        return _project_to_response(data)


async def delete_project(project_id: str, user_id: str) -> bool:
    """Delete a project, verifying ownership."""
    db = get_firestore_client()
    if db:
        doc_ref = db.collection("projects").document(project_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        data = doc.to_dict()
        if data.get("user_id") != user_id:
            return False
        doc_ref.delete()
        logger.info(f"Project {project_id} deleted from Firestore")
        return True
    else:
        data = _dev_projects.get(project_id)
        if not data or data.get("user_id") != user_id:
            return False
        del _dev_projects[project_id]
        logger.info(f"Project {project_id} deleted from memory")
        return True

