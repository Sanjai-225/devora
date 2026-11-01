"""Devora Backend — Conversation persistence service.

Persists and retrieves agent/user conversation messages per project.
Uses Firestore (`projects/{projectId}/conversations`) when connected,
and falls back to an in-memory store in DEV_MODE.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from app.core.firebase import get_firestore_client
from app.models.schemas import ConversationMessageResponse

logger = logging.getLogger(__name__)

# In-memory store for dev mode: project_id -> list of message dicts
_dev_conversations: dict[str, list[dict[str, Any]]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _dict_to_message(data: dict[str, Any]) -> ConversationMessageResponse:
    return ConversationMessageResponse(
        id=data["id"],
        project_id=data["project_id"],
        role=data["role"],
        content=data["content"],
        timestamp=data.get("timestamp", _now_iso()),
        stage=data.get("stage", "requirement_analysis"),
        metadata=data.get("metadata"),
    )


async def add_message(
    project_id: str,
    role: Literal["user", "agent", "system"],
    content: str,
    stage: str = "requirement_analysis",
    metadata: Optional[dict[str, Any]] = None,
) -> ConversationMessageResponse:
    """Append a message to a project's conversation history."""
    msg_id = f"msg-{uuid.uuid4().hex[:10]}"
    now = _now_iso()
    msg_data: dict[str, Any] = {
        "id": msg_id,
        "project_id": project_id,
        "role": role,
        "content": content,
        "timestamp": now,
        "stage": stage,
        "metadata": metadata or {},
    }

    db = get_firestore_client()
    if db:
        (
            db.collection("projects")
            .document(project_id)
            .collection("conversations")
            .document(msg_id)
            .set(msg_data)
        )
        logger.debug(f"Saved conversation message {msg_id} to Firestore for project {project_id}")
    else:
        if project_id not in _dev_conversations:
            _dev_conversations[project_id] = []
        _dev_conversations[project_id].append(msg_data)

    return _dict_to_message(msg_data)


async def list_messages(
    project_id: str,
    limit: int = 100,
    before: Optional[str] = None,
) -> list[ConversationMessageResponse]:
    """Retrieve conversation messages for a project ordered chronologically."""
    db = get_firestore_client()
    if db:
        query = (
            db.collection("projects")
            .document(project_id)
            .collection("conversations")
            .order_by("timestamp")
        )
        docs = list(query.stream())
        items = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            d["project_id"] = project_id
            items.append(d)
    else:
        items = list(_dev_conversations.get(project_id, []))
        items.sort(key=lambda m: m.get("timestamp", ""))

    if before:
        items = [m for m in items if m.get("timestamp", "") < before]

    if limit and len(items) > limit:
        items = items[-limit:]

    return [_dict_to_message(m) for m in items]


async def clear_messages(project_id: str) -> None:
    """Clear conversation history for a project."""
    db = get_firestore_client()
    if db:
        conv_ref = db.collection("projects").document(project_id).collection("conversations")
        for doc in conv_ref.stream():
            doc.reference.delete()
    else:
        _dev_conversations.pop(project_id, None)
