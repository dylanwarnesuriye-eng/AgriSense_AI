"""Tests verifying real Firebase Admin configuration, fallback restrictions, and error handling."""
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.auth import verify_firebase_token
from app.core.config import settings
from app.main import app
from app.services.firebase import (
    get_firebase_project_id,
    get_firestore_client,
    init_firebase_admin,
)
from app.services.firestore_repo import PersistenceUnavailableError, firestore_repo

client = TestClient(app)


def test_missing_credentials_fails_gracefully():
    """TASK 2: When credentials are missing and not in test/emulator mode, init returns False."""
    with patch("app.core.config.settings.FIREBASE_CREDENTIALS_PATH", ""), \
         patch.dict("os.environ", {}, clear=True), \
         patch("app.services.firebase._firebase_app", None):
        result = init_firebase_admin()
        assert result is False
        assert get_firestore_client() is None


def test_strict_mode_blocks_in_memory_fallback():
    """TASK 3: When ALLOW_IN_MEMORY_FALLBACK=False, repository raises PersistenceUnavailableError."""
    orig_env = settings.ENVIRONMENT
    orig_fallback = settings.ALLOW_IN_MEMORY_FALLBACK
    try:
        settings.ENVIRONMENT = "development"
        settings.ALLOW_IN_MEMORY_FALLBACK = False

        with patch("app.services.firestore_repo.get_firestore_client", return_value=None):
            with pytest.raises(PersistenceUnavailableError) as exc:
                firestore_repo.save_farm({
                    "farm_id": "test_farm_fail",
                    "owner_uid": "user_real",
                    "name": "Live Cloud Required Farm",
                })
            assert "Silent in-memory fallback is strictly restricted" in str(exc.value)

            with pytest.raises(PersistenceUnavailableError):
                firestore_repo.save_assessment({
                    "assessment_id": "test_asmt_fail",
                    "owner_uid": "user_real",
                })
    finally:
        settings.ENVIRONMENT = orig_env
        settings.ALLOW_IN_MEMORY_FALLBACK = orig_fallback


def test_persistence_unavailable_returns_503_structured_error():
    """TASK 3: Unhandled PersistenceUnavailableError triggers the FastAPI 503 handler."""
    orig_env = settings.ENVIRONMENT
    orig_fallback = settings.ALLOW_IN_MEMORY_FALLBACK
    orig_mock = settings.ALLOW_MOCK_TOKENS
    try:
        settings.ENVIRONMENT = "development"
        settings.ALLOW_IN_MEMORY_FALLBACK = False
        settings.ALLOW_MOCK_TOKENS = True

        with patch("app.services.firestore_repo.get_firestore_client", return_value=None):
            resp = client.post(
                "/api/v1/farms",
                json={"name": "Will Fail", "location": "Loc", "total_area_hectares": 1.0},
                headers={"Authorization": "Bearer mock-token-test_user"},
            )
            assert resp.status_code == 503
            data = resp.json()
            assert data["detail"] is not None
            assert "Cloud Firestore" in str(data)
    finally:
        settings.ENVIRONMENT = orig_env
        settings.ALLOW_IN_MEMORY_FALLBACK = orig_fallback
        settings.ALLOW_MOCK_TOKENS = orig_mock


def test_mock_tokens_rejected_when_allow_mock_tokens_is_false():
    """TASK 4: Mock tokens are strictly rejected when ALLOW_MOCK_TOKENS=False."""
    orig_mock = settings.ALLOW_MOCK_TOKENS
    try:
        settings.ALLOW_MOCK_TOKENS = False
        with pytest.raises(HTTPException) as exc:
            verify_firebase_token("mock-token-hacker")
        assert exc.value.status_code == 401
        assert "forbidden" in exc.value.detail.lower()
    finally:
        settings.ALLOW_MOCK_TOKENS = orig_mock


def test_real_firebase_admin_initialization_with_credentials():
    """TASK 2: Valid credentials initialize Firebase Admin exactly once and set project ID."""
    mock_cred = MagicMock()
    mock_cred.project_id = "smart-agriculture-prod"

    mock_app = MagicMock()
    mock_app.project_id = "smart-agriculture-prod"

    with patch("os.path.exists", return_value=True), \
         patch("app.core.config.settings.FIREBASE_CREDENTIALS_PATH", "./real-serviceAccount.json"), \
         patch("firebase_admin.credentials.Certificate", return_value=mock_cred), \
         patch("firebase_admin.initialize_app", return_value=mock_app), \
         patch("firebase_admin.firestore.client", return_value=MagicMock()), \
         patch("app.services.firebase._firebase_app", None):

        success = init_firebase_admin()
        assert success is True
        assert get_firebase_project_id() == "smart-agriculture-prod"
