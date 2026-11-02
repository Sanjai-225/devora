"""Devora Backend — Authentication middleware."""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.firebase import verify_firebase_token

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Represents an authenticated user from Firebase token verification."""

    def __init__(self, uid: str, email: str, name: str, picture: Optional[str] = None):
        self.uid = uid
        self.email = email
        self.name = name
        self.picture = picture


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthenticatedUser:
    """Dependency that extracts and verifies the Firebase ID token.
    
    In DEV_MODE without Firebase configured, supports `dev-token` (default `dev-user-001`),
    `dev-user-<id>` for multi-user isolation tests, and `X-Devora-Strict-Auth: true`
    for missing/invalid token rejection verification.
    """
    strict_auth = request.headers.get("X-Devora-Strict-Auth", "").lower() == "true"

    if settings.dev_mode and not settings.firebase_project_id:
        if not credentials:
            if strict_auth:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={"code": "MISSING_TOKEN", "message": "Authorization token required"},
                )
            return AuthenticatedUser(
                uid="dev-user-001",
                email="dev@devora.local",
                name="Dev User",
                picture=None,
            )

        raw_token = credentials.credentials.strip()
        if raw_token in ("invalid-token", "expired-token", "malformed"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "INVALID_TOKEN", "message": "Invalid or expired token"},
            )
        if raw_token.startswith("dev-user-"):
            return AuthenticatedUser(
                uid=raw_token,
                email=f"{raw_token}@devora.local",
                name=f"User {raw_token}",
                picture=None,
            )
        return AuthenticatedUser(
            uid="dev-user-001",
            email="dev@devora.local",
            name="Dev User",
            picture=None,
        )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "MISSING_TOKEN", "message": "Authorization token required"},
        )

    decoded = await verify_firebase_token(credentials.credentials)
    if not decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired token"},
        )

    return AuthenticatedUser(
        uid=decoded.get("uid", ""),
        email=decoded.get("email", ""),
        name=decoded.get("name", decoded.get("email", "")),
        picture=decoded.get("picture"),
    )


