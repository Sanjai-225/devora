"""Devora Backend — Auth routes."""

from fastapi import APIRouter, Depends

from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.schemas import UserResponse
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/verify", response_model=UserResponse)
async def verify_token(user: AuthenticatedUser = Depends(get_current_user)):
    """Verify the Firebase ID token and return user info."""
    return await user_service.get_or_create_user(user)

