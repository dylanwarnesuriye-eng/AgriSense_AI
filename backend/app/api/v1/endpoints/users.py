"""User management and profile resolution endpoints."""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.core.auth import AuthenticatedUser, get_current_user
from app.services.firestore_repo import firestore_repo

logger = logging.getLogger(__name__)

router = APIRouter()


class UserProfileResponse(BaseModel):
    """Authenticated user profile response with authoritative server role."""

    uid: str = Field(..., description="Firebase UID")
    email: str | None = Field(default=None, description="Email address")
    display_name: str | None = Field(default=None, description="Display name")
    role: str = Field(default="farmer", description="Authoritative user role ('farmer' | 'admin')")
    created_at: str | None = Field(default=None, description="Account creation timestamp")


class UserSyncRequest(BaseModel):
    """Public registration or client profile synchronization payload.

    Security Rule: Client payload CANNOT specify or request a role.
    Role is strictly assigned server-side.
    """

    display_name: str | None = Field(default=None, description="Updated display name")


@router.get("/me", response_model=UserProfileResponse, summary="Get current user profile and role")
async def get_my_profile(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> UserProfileResponse:
    """Return the authenticated user profile with authoritative role from Cloud Firestore."""
    user_doc = firestore_repo.get_user(current_user.uid)
    if not user_doc:
        # Initialize default farmer document in Cloud Firestore
        user_doc = firestore_repo.sync_user({
            "uid": current_user.uid,
            "email": current_user.email,
            "display_name": current_user.display_name,
            "role": "farmer",
        })

    return UserProfileResponse(
        uid=current_user.uid,
        email=user_doc.get("email") or current_user.email,
        display_name=user_doc.get("display_name") or current_user.display_name,
        role=user_doc.get("role", "farmer"),
        created_at=user_doc.get("created_at"),
    )


@router.post(
    "/sync",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Synchronize public registration / profile",
)
async def sync_user_profile(
    payload: UserSyncRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> UserProfileResponse:
    """Synchronize user profile upon public registration.

    Security Enforcement:
    Every publicly registered user is strictly recorded as role='farmer'.
    Never trusts client payload for role elevation.
    """
    existing = firestore_repo.get_user(current_user.uid)
    role_to_keep = existing.get("role", "farmer") if existing else "farmer"

    synced = firestore_repo.sync_user({
        "uid": current_user.uid,
        "email": current_user.email,
        "display_name": payload.display_name or current_user.display_name,
        "role": role_to_keep,
    })

    return UserProfileResponse(
        uid=current_user.uid,
        email=synced.get("email"),
        display_name=synced.get("display_name"),
        role=synced.get("role", "farmer"),
        created_at=synced.get("created_at"),
    )
