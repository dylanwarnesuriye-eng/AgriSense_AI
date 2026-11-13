"""Firebase Authentication verification and user security context."""
import logging
from typing import Annotated

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.firebase import init_firebase_admin

logger = logging.getLogger(__name__)

security_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    """Authenticated user model extracted from verified Firebase credentials."""

    uid: str = Field(..., description="Firebase unique user identifier")
    email: str | None = Field(default=None, description="User email address")
    display_name: str | None = Field(default=None, description="User display name")
    role: str = Field(default="farmer", description="User authorization role (farmer | admin)")
    is_mock: bool = Field(default=False, description="Whether user was authenticated via test/mock token")


def get_user_role(uid: str) -> str:
    """Fetch user role directly from Cloud Firestore 'users/{uid}'.

    Defaults strictly to 'farmer' if document or field is missing or invalid.
    Never trusts client input.
    """
    from app.services.firestore_repo import firestore_repo

    try:
        user_doc = firestore_repo.get_user(uid)
        if user_doc and user_doc.get("role") == "admin":
            return "admin"
    except Exception as e:
        logger.warning(f"Failed to fetch role for user {uid} from Firestore: {e}")
    return "farmer"


def verify_firebase_token(token: str) -> AuthenticatedUser:
    """Verify a Firebase ID token or handle test/emulator tokens.

    Raises:
        HTTPException: 401 if token is invalid, expired, or verification fails.
    """
    if not token or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is empty or missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Handle mock/test tokens for offline development and automated testing
    if token.startswith(("mock-token-", "test-token-")):
        if settings.is_production or not settings.ALLOW_MOCK_TOKENS:
            logger.warning("Rejected mock authentication token in production/restricted mode.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Mock authentication tokens and test role switching are forbidden in production environments.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        uid = token.split("-", 2)[-1]
        if not uid:
            uid = "test_user_default"
        # Support mock admin identity in test environments while checking repository
        role = "admin" if uid in ("admin", "admin_user", "test_admin") else get_user_role(uid)
        return AuthenticatedUser(
            uid=uid,
            email=f"{uid}@smart-agri.dev",
            display_name=f"Developer {uid}",
            role=role,
            is_mock=True,
        )

    # 2. Verify with Firebase Admin SDK
    firebase_initialized = init_firebase_admin()
    if not firebase_initialized:
        logger.warning(
            "Firebase Admin SDK is not initialized with live credentials. "
            "Rejecting unmocked Bearer token in development mode."
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase Authentication service is not configured on server.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        from firebase_admin import auth

        decoded_token = auth.verify_id_token(token)
        app_user = AuthenticatedUser(
            uid=decoded_token["uid"],
            email=decoded_token.get("email"),
            display_name=decoded_token.get("name"),
            role="farmer",
            is_mock=False,
        )
        try:
            from app.services.firestore_repo import firestore_repo

            # Sync user document to Firestore, preserving existing role or defaulting to 'farmer'
            synced = firestore_repo.sync_user({
                "uid": app_user.uid,
                "email": app_user.email,
                "display_name": app_user.display_name,
            })
            app_user.role = synced.get("role", "farmer")
        except Exception as sync_err:  # noqa: BLE001
            logger.debug(f"Optional user profile sync skipped/failed: {sync_err}")
            app_user.role = get_user_role(app_user.uid)

        return app_user
    except Exception as e:
        logger.warning(f"Firebase token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {e!s}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security_scheme)] = None,
) -> AuthenticatedUser:
    """Dependency that enforces authentication and returns the current user."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_firebase_token(credentials.credentials)


async def get_optional_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(security_scheme)] = None,
) -> AuthenticatedUser | None:
    """Dependency that extracts user if Bearer token is provided, else returns None."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return verify_firebase_token(credentials.credentials)
    except HTTPException:
        return None


async def require_admin(
    current_user: Annotated[AuthenticatedUser, Security(get_current_user)],
) -> AuthenticatedUser:
    """Dependency that authorizes administrator access.

    Flow:
    1. Verify Firebase ID token (handled by get_current_user).
    2. Extract authenticated uid.
    3. Load users/{uid} from Cloud Firestore.
    4. Read server-side role.
    5. Allow access only if role == "admin".

    If role is farmer (or non-admin):
        raise HTTP 403 Forbidden.
    Missing/invalid token:
        raise HTTP 401 Unauthorized (handled by get_current_user).
    """
    actual_role = get_user_role(current_user.uid)
    if current_user.is_mock and current_user.role == "admin":
        actual_role = "admin"

    if actual_role != "admin":
        logger.warning(
            f"Admin access forbidden: user '{current_user.uid}' with role '{actual_role}' "
            "attempted to access admin-restricted resource."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required.",
        )
    current_user.role = "admin"
    return current_user


def verify_resource_ownership(resource_owner_uid: str, current_user: AuthenticatedUser) -> None:
    """Ensure the authenticated user owns the target resource.

    Never trusts client-supplied user_id in payload as proof of ownership.
    """
    if resource_owner_uid != current_user.uid:
        logger.warning(
            f"Cross-user access denied: user '{current_user.uid}' attempted "
            f"to access resource owned by '{resource_owner_uid}'."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to access or modify this resource.",
        )
