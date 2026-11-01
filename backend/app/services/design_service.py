"""Devora Backend — Design Version service with Firestore & in-memory dev fallback.

Persists design prototypes, design tokens, and version history under
`projects/{projectId}/designVersions/{versionId}` as specified in
`PROJECT_BRAIN/DATABASE_SCHEMA.md`.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.firebase import get_firestore_client
from app.models.schemas import DesignVersionListResponse, DesignVersionResponse

logger = logging.getLogger(__name__)

# In-memory store for development mode when Firestore is not connected
_dev_design_versions: dict[str, list[dict[str, Any]]] = {}
_dev_active_version_id: dict[str, str] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def save_version(
    project_id: str,
    design_spec: dict[str, Any],
    prototype_code: str,
    prompt: str = "Initial design generation",
    label: Optional[str] = None,
    summary_of_changes: str = "Generated design specification and interactive React prototype.",
    approved: bool = False,
    version_id: Optional[str] = None,
    version_number: Optional[int] = None,
    version_tag: Optional[str] = None,
) -> DesignVersionResponse:
    """Save a design version to Firestore or in-memory fallback."""
    existing = await list_versions(project_id)
    next_num = version_number if version_number is not None else (len(existing.versions) + 1)
    ver_id = version_id or f"design-v{next_num}-{uuid.uuid4().hex[:6]}"
    ver_tag = version_tag or f"v1.{next_num - 1}"
    ver_label = label or (
        "Initial Architecture & Theme" if next_num == 1 else prompt[:48]
    )

    version_data: dict[str, Any] = {
        "id": ver_id,
        "project_id": project_id,
        "version_number": next_num,
        "version_tag": ver_tag,
        "label": ver_label,
        "prompt": prompt,
        "summary_of_changes": summary_of_changes,
        "design_spec": design_spec,
        "prototype_code": prototype_code,
        "approved": approved,
        "created_at": _now_iso(),
    }

    db = get_firestore_client()
    if db is not None:
        (
            db.collection("projects")
            .document(project_id)
            .collection("designVersions")
            .document(ver_id)
            .set(version_data)
        )
    else:
        bucket = _dev_design_versions.setdefault(project_id, [])
        # Replace if same id exists, otherwise append
        replaced = False
        for idx, item in enumerate(bucket):
            if item["id"] == ver_id:
                bucket[idx] = version_data
                replaced = True
                break
        if not replaced:
            bucket.append(version_data)

    _dev_active_version_id[project_id] = ver_id
    return DesignVersionResponse(**version_data)


async def list_versions(project_id: str) -> DesignVersionListResponse:
    """List all design versions for a project ordered by version_number ascending."""
    db = get_firestore_client()
    if db is not None:
        docs = (
            db.collection("projects")
            .document(project_id)
            .collection("designVersions")
            .order_by("version_number")
            .stream()
        )
        raw_versions = [doc.to_dict() for doc in docs]
    else:
        raw_versions = list(_dev_design_versions.get(project_id, []))
        raw_versions.sort(key=lambda v: v.get("version_number", 0))

    versions = [DesignVersionResponse(**v) for v in raw_versions]
    active_id = _dev_active_version_id.get(project_id)
    if not active_id and versions:
        active_id = versions[-1].id

    approved_id: Optional[str] = None
    for v in reversed(versions):
        if v.approved:
            approved_id = v.id
            break

    return DesignVersionListResponse(
        versions=versions,
        active_version_id=active_id,
        approved_version_id=approved_id,
    )


async def get_version(project_id: str, version_id: str) -> Optional[DesignVersionResponse]:
    """Retrieve a single design version by ID."""
    db = get_firestore_client()
    if db is not None:
        doc = (
            db.collection("projects")
            .document(project_id)
            .collection("designVersions")
            .document(version_id)
            .get()
        )
        if not doc.exists:
            return None
        return DesignVersionResponse(**doc.to_dict())

    for v in _dev_design_versions.get(project_id, []):
        if v["id"] == version_id:
            return DesignVersionResponse(**v)
    return None


async def approve_version(
    project_id: str, version_id: str
) -> Optional[DesignVersionResponse]:
    """Mark a specific design version as approved and unmark previous ones."""
    db = get_firestore_client()
    target: Optional[dict[str, Any]] = None

    if db is not None:
        col = (
            db.collection("projects")
            .document(project_id)
            .collection("designVersions")
        )
        docs = list(col.stream())
        for d in docs:
            data = d.to_dict()
            is_target = data.get("id") == version_id or d.id == version_id
            col.document(d.id).update({"approved": is_target})
            if is_target:
                data["approved"] = True
                target = data
    else:
        for v in _dev_design_versions.get(project_id, []):
            if v["id"] == version_id:
                v["approved"] = True
                target = v
            else:
                v["approved"] = False

    if target:
        _dev_active_version_id[project_id] = version_id
        return DesignVersionResponse(**target)
    return None


async def restore_version(
    project_id: str, version_id: str
) -> Optional[DesignVersionResponse]:
    """Set a historical design version as the active version."""
    ver = await get_version(project_id, version_id)
    if not ver:
        return None
    _dev_active_version_id[project_id] = ver.id
    return ver
