"""Devora Backend — User routes."""

from fastapi import APIRouter, Depends

from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.schemas import UpdateUserRequest, UserResponse
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Get the current user's profile."""
    return await user_service.get_or_create_user(user)


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    request: UpdateUserRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Update the current user's profile."""
    return await user_service.update_user(user, request)

