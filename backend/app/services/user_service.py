"""Devora Backend — User service layer."""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.firebase import get_firestore_client
from app.middleware.auth import AuthenticatedUser
from app.models.schemas import UpdateUserRequest, UserResponse

logger = logging.getLogger(__name__)

# In-memory store for dev mode
_dev_users: dict[str, dict] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def get_or_create_user(user: AuthenticatedUser) -> UserResponse:
    """Get the user profile, creating it if it doesn't exist."""
    db = get_firestore_client()

    default_settings = {
        "preferredLLM": "gemini",
        "defaultFramework": "nextjs",
        "defaultStyling": "tailwind",
    }

    if db:
        doc_ref = db.collection("users").document(user.uid)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            return UserResponse(
                uid=user.uid,
                email=data.get("email", user.email),
                display_name=data.get("display_name", user.name),
                photo_url=data.get("photo_url", user.picture),
                role=data.get("role", "individual"),
                created_at=data.get("created_at"),
                settings=data.get("settings", default_settings),
            )
        else:
            now = _now_iso()
            user_data = {
                "uid": user.uid,
                "email": user.email,
                "display_name": user.name,
                "photo_url": user.picture,
                "role": "individual",
                "created_at": now,
                "updated_at": now,
                "settings": default_settings,
                "usage": {
                    "project_count": 0,
                    "total_generations": 0,
                    "last_active_at": now,
                },
            }
            doc_ref.set(user_data)
            return UserResponse(**{k: v for k, v in user_data.items() if k in UserResponse.model_fields})
    else:
        if user.uid in _dev_users:
            data = _dev_users[user.uid]
            return UserResponse(
                uid=user.uid,
                email=data.get("email", user.email),
                display_name=data.get("display_name", user.name),
                photo_url=data.get("photo_url"),
                role=data.get("role", "individual"),
                created_at=data.get("created_at"),
                settings=data.get("settings", default_settings),
            )
        else:
            now = _now_iso()
            user_data = {
                "uid": user.uid,
                "email": user.email,
                "display_name": user.name,
                "photo_url": user.picture,
                "role": "individual",
                "created_at": now,
                "settings": default_settings,
            }
            _dev_users[user.uid] = user_data
            return UserResponse(**{k: v for k, v in user_data.items() if k in UserResponse.model_fields})


async def update_user(user: AuthenticatedUser, request: UpdateUserRequest) -> UserResponse:
    """Update the user profile."""
    db = get_firestore_client()
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    updates["updated_at"] = _now_iso()

    if db:
        doc_ref = db.collection("users").document(user.uid)
        doc_ref.update(updates)
    else:
        if user.uid in _dev_users:
            _dev_users[user.uid].update(updates)

    return await get_or_create_user(user)

