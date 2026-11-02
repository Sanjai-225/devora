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


def _permissions_for_role(role: str) -> list[str]:
    base = [
        "create_website",
        "ai_suggestions",
        "tech_stack_customize",
        "design_studio",
        "workspace_modify",
        "live_preview_tab",
        "export_zip",
        "deploy_own_credentials",
    ]
    if role == "developer":
        return base + [
            "raw_env_vault",
            "platform_integrations_hub",
            "git_branch_admin",
            "system_diagnostics",
        ]
    return base + ["auto_build"]


async def get_or_create_user(user: AuthenticatedUser) -> UserResponse:
    """Get the user profile, creating it if it doesn't exist."""
    db = get_firestore_client()

    default_settings = {
        "preferredLLM": "gemini",
        "defaultFramework": "nextjs",
        "defaultStyling": "tailwind",
    }
    default_role = getattr(user, "role", "individual") or "individual"

    if db:
        doc_ref = db.collection("users").document(user.uid)
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            role_val = data.get("role", default_role)
            return UserResponse(
                uid=user.uid,
                email=data.get("email", user.email),
                display_name=data.get("display_name", user.name),
                photo_url=data.get("photo_url", user.picture),
                role=role_val,
                created_at=data.get("created_at"),
                permissions=_permissions_for_role(role_val),
                settings=data.get("settings", default_settings),
            )
        else:
            now = _now_iso()
            user_data = {
                "uid": user.uid,
                "email": user.email,
                "display_name": user.name,
                "photo_url": user.picture,
                "role": default_role,
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
            return UserResponse(
                uid=user.uid,
                email=user.email,
                display_name=user.name,
                photo_url=user.picture,
                role=default_role,
                created_at=now,
                permissions=_permissions_for_role(default_role),
                settings=default_settings,
            )
    else:
        if user.uid in _dev_users:
            data = _dev_users[user.uid]
            role_val = data.get("role", default_role)
            return UserResponse(
                uid=user.uid,
                email=data.get("email", user.email),
                display_name=data.get("display_name", user.name),
                photo_url=data.get("photo_url"),
                role=role_val,
                created_at=data.get("created_at"),
                permissions=_permissions_for_role(role_val),
                settings=data.get("settings", default_settings),
            )
        else:
            now = _now_iso()
            user_data = {
                "uid": user.uid,
                "email": user.email,
                "display_name": user.name,
                "photo_url": user.picture,
                "role": default_role,
                "created_at": now,
                "settings": default_settings,
            }
            _dev_users[user.uid] = user_data
            return UserResponse(
                uid=user.uid,
                email=user.email,
                display_name=user.name,
                photo_url=user.picture,
                role=default_role,
                created_at=now,
                permissions=_permissions_for_role(default_role),
                settings=default_settings,
            )


async def update_user(user: AuthenticatedUser, request: UpdateUserRequest) -> UserResponse:
    """Update the user profile."""
    db = get_firestore_client()
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    updates["updated_at"] = _now_iso()

    if db:
        doc_ref = db.collection("users").document(user.uid)
        doc_ref.set(updates, merge=True)
    else:
        if user.uid not in _dev_users:
            await get_or_create_user(user)
        _dev_users[user.uid].update(updates)

    return await get_or_create_user(user)


async def authenticate_with_role(
    email: str,
    password: str,
    preferred_role: Optional[str] = None,
) -> tuple[str, UserResponse, str]:
    """Authenticate a user or developer account and return (token, profile, mode_summary)."""
    clean_email = email.strip().lower()
    is_dev_email = clean_email in (
        "sanjay22522g@gmail.com",
        "sanjai22522g@gmail.com",
        "techno22522g@gmail.com",
        "dev@devora.local",
    )

    if is_dev_email or preferred_role == "developer":
        if clean_email in ("sanjay22522g@gmail.com", "sanjai22522g@gmail.com") and password != "sanjai@2006":
            raise ValueError("Invalid developer password for sanjay22522g@gmail.com")
        auth_user = AuthenticatedUser(
            uid="dev-sanjay-225",
            email="sanjay22522g@gmail.com",
            name="Sanjay G (Lead Developer)",
            role="developer",
        )
        profile = await get_or_create_user(auth_user)
        if profile.role != "developer":
            profile = await update_user(auth_user, UpdateUserRequest(role="developer", display_name="Sanjay G (Lead Developer)"))
        return (
            "dev-role-developer-sanjay",
            profile,
            "Developer Engineering Mode active: Full access to raw AES-256 .env vault, Git branch controls, and Platform Integrations.",
        )

    slug = clean_email.split("@")[0].replace(".", "-").replace("_", "-") or "creator"
    display = slug.replace("-", " ").title()
    auth_user = AuthenticatedUser(
        uid=f"user-{slug}",
        email=clean_email,
        name=display,
        role="user",
    )
    profile = await get_or_create_user(auth_user)
    if profile.role != "user":
        profile = await update_user(auth_user, UpdateUserRequest(role="user", display_name=display))
    return (
        f"dev-role-user-{slug}",
        profile,
        "Guided Creator (User) Mode active: 1-Click Auto-Build in separate tab, AI website suggestions, Design Studio, live modifications, and optional Deploy to Own Account.",
    )


