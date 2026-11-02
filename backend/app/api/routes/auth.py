"""Devora Backend — Auth routes."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.schemas import (
    RoleAuthResponse,
    RoleLoginRequest,
    RoleRegisterRequest,
    UpdateUserRequest,
    UserResponse,
)
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/verify", response_model=UserResponse)
async def verify_token(user: AuthenticatedUser = Depends(get_current_user)):
    """Verify the Firebase or RBAC ID token and return user info."""
    return await user_service.get_or_create_user(user)


@router.post("/login", response_model=RoleAuthResponse)
async def login_with_role(request: RoleLoginRequest):
    """Authenticate as either a User ('user' role) or Developer ('developer' role: sanjay22522g@gmail.com / sanjai@2006)."""
    try:
        token, profile, summary = await user_service.authenticate_with_role(
            email=request.email,
            password=request.password,
            preferred_role=request.preferred_role,
        )
        return RoleAuthResponse(token=token, user=profile, mode_summary=summary)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": str(exc)},
        )


@router.post("/register", response_model=RoleAuthResponse, status_code=status.HTTP_201_CREATED)
async def register_with_role(request: RoleRegisterRequest):
    """Register a new User or Developer account with explicit RBAC role and profile."""
    token, profile, summary = await user_service.authenticate_with_role(
        email=request.email,
        password=request.password,
        preferred_role=request.role,
    )
    auth_user = AuthenticatedUser(
        uid=profile.uid,
        email=profile.email,
        name=request.name.strip(),
        role=request.role,
    )
    updated_profile = await user_service.update_user(
        auth_user,
        UpdateUserRequest(display_name=request.name.strip(), role=request.role),
    )
    return RoleAuthResponse(token=token, user=updated_profile, mode_summary=summary)


