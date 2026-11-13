"""Security tests for Firebase Authentication and mock token restriction audits."""
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_mock_token_accepted_in_development_mode():
    """Mock tokens work in local development when ALLOW_MOCK_TOKENS is enabled."""
    original_env = settings.ENVIRONMENT
    original_mock = settings.ALLOW_MOCK_TOKENS
    try:
        settings.ENVIRONMENT = "development"
        settings.ALLOW_MOCK_TOKENS = True

        headers = {"Authorization": "Bearer mock-token-lead_agronomist"}
        resp = client.get("/api/v1/farms", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["success"] is True
    finally:
        settings.ENVIRONMENT = original_env
        settings.ALLOW_MOCK_TOKENS = original_mock


def test_mock_token_strictly_rejected_in_production_mode():
    """Mock tokens MUST be rejected with HTTP 401 in production environments."""
    original_env = settings.ENVIRONMENT
    original_mock = settings.ALLOW_MOCK_TOKENS
    try:
        settings.ENVIRONMENT = "production"
        settings.ALLOW_MOCK_TOKENS = False

        headers = {"Authorization": "Bearer mock-token-lead_agronomist"}
        resp = client.get("/api/v1/farms", headers=headers)
        assert resp.status_code == 401
        assert "forbidden in production" in resp.json()["detail"].lower()
    finally:
        settings.ENVIRONMENT = original_env
        settings.ALLOW_MOCK_TOKENS = original_mock


def test_mock_token_rejected_when_allow_mock_tokens_is_false():
    """Mock tokens are rejected if ALLOW_MOCK_TOKENS is disabled even in development."""
    original_env = settings.ENVIRONMENT
    original_mock = settings.ALLOW_MOCK_TOKENS
    try:
        settings.ENVIRONMENT = "development"
        settings.ALLOW_MOCK_TOKENS = False

        headers = {"Authorization": "Bearer mock-token-lead_agronomist"}
        resp = client.get("/api/v1/farms", headers=headers)
        assert resp.status_code == 401
    finally:
        settings.ENVIRONMENT = original_env
        settings.ALLOW_MOCK_TOKENS = original_mock


def test_empty_or_malformed_auth_header_rejected():
    """Missing or empty Authorization headers return HTTP 401."""
    resp1 = client.get("/api/v1/farms")
    assert resp1.status_code == 401

    resp2 = client.get("/api/v1/farms", headers={"Authorization": "Bearer "})
    assert resp2.status_code == 401
