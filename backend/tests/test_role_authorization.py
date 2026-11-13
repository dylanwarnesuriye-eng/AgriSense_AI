"""Security and Role-Based Authorization Tests for AgriSense AI.

Validates:
1. Public registration creates role='farmer'.
2. Registration payload cannot assign admin role (role parameter is ignored/forbidden).
3. Missing role in Firestore safely defaults to 'farmer'.
4. Unauthenticated access to admin endpoint returns 401 Unauthorized.
5. Farmer access to admin endpoint returns 403 Forbidden.
6. Admin access to admin endpoint returns 200 OK with system diagnostics.
7. Profile endpoint (/api/v1/users/me) returns authoritative role.
8. Direct client token role manipulation cannot bypass backend authorization.
"""
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.firestore_repo import firestore_repo

FARMER_UID = "test_farmer_security_01"
ADMIN_UID = "test_admin_security_01"
NO_ROLE_UID = "test_user_no_role_01"

FARMER_HEADERS = {"Authorization": f"Bearer mock-token-{FARMER_UID}"}
ADMIN_HEADERS = {"Authorization": f"Bearer mock-token-{ADMIN_UID}"}
NO_ROLE_HEADERS = {"Authorization": f"Bearer mock-token-{NO_ROLE_UID}"}


@pytest.fixture(autouse=True)
def setup_roles_in_test_store():
    """Setup clean role state in memory before each test."""
    # Ensure farmer user is saved with role 'farmer'
    firestore_repo.sync_user({
        "uid": FARMER_UID,
        "email": f"{FARMER_UID}@smart-agri.dev",
        "display_name": "Test Farmer",
        "role": "farmer",
    })

    # Ensure admin user is explicitly saved with role 'admin'
    firestore_repo.sync_user({
        "uid": ADMIN_UID,
        "email": f"{ADMIN_UID}@smart-agri.dev",
        "display_name": "Test Administrator",
        "role": "admin",
    })

    # Ensure a user with missing role field exists
    with firestore_repo._lock:
        firestore_repo._users_store[NO_ROLE_UID] = {
            "uid": NO_ROLE_UID,
            "email": f"{NO_ROLE_UID}@smart-agri.dev",
            "display_name": "Legacy User",
        }


@pytest.mark.asyncio
async def test_unauthenticated_admin_endpoint_returns_401():
    """Unauthenticated requests to admin endpoint must return 401 Unauthorized."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/system/diagnostics")
        assert resp.status_code == 401
        assert "detail" in resp.json()


@pytest.mark.asyncio
async def test_farmer_admin_api_access_returns_403():
    """Farmer attempting to access admin diagnostics must receive 403 Forbidden."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/system/diagnostics", headers=FARMER_HEADERS)
        assert resp.status_code == 403
        assert resp.json()["detail"] == "Access forbidden: Administrator privileges required."


@pytest.mark.asyncio
async def test_admin_can_access_protected_diagnostics_endpoint():
    """Admin accessing admin diagnostics receives 200 OK and diagnostic telemetry."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/system/diagnostics", headers=ADMIN_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["authorized_admin"] == ADMIN_UID
        assert data["role"] == "admin"
        assert "subsystems" in data
        assert len(data["subsystems"]) == 4
        assert "database" in data
        assert "Cloud Firestore" in data["database"]["persistence_layer"]


@pytest.mark.asyncio
async def test_missing_role_defaults_safely_to_farmer():
    """A user document without a role field must safely default to 'farmer' and be denied admin access."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Profile endpoint must report role='farmer'
        profile_resp = await client.get("/api/v1/users/me", headers=NO_ROLE_HEADERS)
        assert profile_resp.status_code == 200
        assert profile_resp.json()["role"] == "farmer"

        # Admin endpoint must reject with 403
        diag_resp = await client.get("/api/v1/system/diagnostics", headers=NO_ROLE_HEADERS)
        assert diag_resp.status_code == 403


@pytest.mark.asyncio
async def test_public_sync_strictly_creates_farmer_and_cannot_assign_admin():
    """Registration/sync endpoint must strictly enforce role='farmer' and ignore any role in request."""
    new_uid = "public_registered_user_99"
    headers = {"Authorization": f"Bearer mock-token-{new_uid}"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Malicious client attempting to elevate to admin by sending role in payload
        resp = await client.post(
            "/api/v1/users/sync",
            headers=headers,
            json={"display_name": "Sneaky User", "role": "admin"},
        )
        assert resp.status_code == 200
        data = resp.json()
        # Role must remain farmer!
        assert data["role"] == "farmer"
        assert data["display_name"] == "Sneaky User"

        # Verify in firestore repository that role is farmer
        user_in_db = firestore_repo.get_user(new_uid)
        assert user_in_db is not None
        assert user_in_db.get("role") == "farmer"


@pytest.mark.asyncio
async def test_frontend_role_manipulation_cannot_bypass_backend():
    """A farmer token cannot access admin endpoint regardless of any client headers."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/system/diagnostics",
            headers={
                **FARMER_HEADERS,
                "X-User-Role": "admin",
                "X-Admin-Override": "true",
            },
        )
        assert resp.status_code == 403
        assert resp.json()["detail"] == "Access forbidden: Administrator privileges required."


@pytest.mark.asyncio
async def test_user_me_profile_returns_authoritative_role():
    """GET /api/v1/users/me returns authoritative role for both farmer and admin."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        farmer_me = await client.get("/api/v1/users/me", headers=FARMER_HEADERS)
        assert farmer_me.status_code == 200
        assert farmer_me.json()["role"] == "farmer"

        admin_me = await client.get("/api/v1/users/me", headers=ADMIN_HEADERS)
        assert admin_me.status_code == 200
        assert admin_me.json()["role"] == "admin"
