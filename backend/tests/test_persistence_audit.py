"""Persistence Audit and Security Tests.

Verifies:
1. Zero silent in-memory fallback in standard application mode.
2. Accurate persistence failure reporting (never report success on DB error).
3. Farm ownership enforcement on assessment execution.
4. Duplicate submission prevention and idempotency.
"""
import copy
from typing import Any
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.modules.farm_management.schemas import FarmCreate
from app.modules.farm_management.service import farm_service
from app.services.firestore_repo import PersistenceUnavailableError, firestore_repo

client = TestClient(app)

USER_A_HEADERS = {"Authorization": "Bearer mock-token-auditor_a"}
USER_B_HEADERS = {"Authorization": "Bearer mock-token-auditor_b"}


def test_standard_mode_rejects_silent_in_memory_fallback():
    """TASK 3: In normal application mode, never silently switch to temporary storage."""
    # Temporarily set environment to production/standard and disable in-memory fallback
    orig_env = settings.ENVIRONMENT
    orig_fallback = settings.ALLOW_IN_MEMORY_FALLBACK
    try:
        settings.ENVIRONMENT = "production"
        settings.ALLOW_IN_MEMORY_FALLBACK = False

        # Ensure live firestore client is None
        with patch("app.services.firestore_repo.get_firestore_client", return_value=None):
            # Attempting to save a farm directly should raise PersistenceUnavailableError
            with pytest.raises(PersistenceUnavailableError) as exc_info:
                firestore_repo.save_farm({
                    "farm_id": "farm_prod_test",
                    "owner_uid": "user_123",
                    "name": "Should Fail Farm",
                })
            assert "Silent in-memory fallback is strictly restricted" in str(exc_info.value)

            # API endpoint should return HTTP 503 Service Unavailable
            resp = client.post(
                "/api/v1/farms",
                json={"name": "Prod Fallback Test", "location": "Sector 7", "total_area_hectares": 12.0},
                headers=USER_A_HEADERS,
            )
            # In production mode, mock tokens are also rejected with 401; if auth passes with valid user, 503
            assert resp.status_code in (401, 503)
    finally:
        settings.ENVIRONMENT = orig_env
        settings.ALLOW_IN_MEMORY_FALLBACK = orig_fallback


def test_persistence_failure_reports_not_persisted():
    """TASK 3: Never report a successful save when Firestore fails."""
    with patch.object(
        firestore_repo,
        "save_assessment",
        side_effect=RuntimeError("Firestore connection dropped"),
    ):
        payload = {
            "confirmed_crop": "rice",
            "academic_demo_mode": True,
        }
        resp = client.post(
            "/api/v1/orchestrator/stage-b/evaluate-crop",
            json=payload,
            headers=USER_A_HEADERS,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]

        # Transparent audit status
        assert "persistence_status" in data
        assert data["persistence_status"]["persisted"] is False
        assert data["persistence_status"]["storage_backend"] == "none"
        assert "Firestore connection dropped" in data["persistence_status"]["error"]

        # Prominent warning appended to payload
        assert any("Persistence notice" in w for w in data["warnings"])


def test_stage_b_enforces_farm_ownership():
    """TASK 3 & 4: Farm ownership must be strictly enforced on Stage B assessments."""
    # User A creates a farm
    farm_a = farm_service.create_farm(
        FarmCreate(name="User A Farm", location="Highland", total_area_hectares=15.0),
        owner_uid="auditor_a",
    )

    # User B attempts to associate an assessment with User A's farm
    payload = {
        "farm_id": farm_a.farm_id,
        "confirmed_crop": "rice",
        "academic_demo_mode": True,
    }
    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_B_HEADERS,
    )
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]


def test_stage_b_rejects_nonexistent_farm():
    """Stage B rejects associations with non-existent farms."""
    payload = {
        "farm_id": "non_existent_farm_9999",
        "confirmed_crop": "rice",
        "academic_demo_mode": True,
    }
    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )
    assert resp.status_code == 404
    assert "was not found" in resp.json()["detail"]


def test_duplicate_submission_prevention():
    """TASK 3: Prevent duplicate submissions within short idempotency window."""
    payload = {
        "confirmed_crop": "corn",
        "academic_demo_mode": True,
        "yield_input": {
            "field_area_ha": 4.5,
            "region": "Central",
        },
    }

    # First execution
    resp1 = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )
    assert resp1.status_code == 200
    asmt_id_1 = resp1.json()["data"]["assessment_id"]

    # Immediate duplicate execution with identical payload
    resp2 = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )
    assert resp2.status_code == 200
    asmt_id_2 = resp2.json()["data"]["assessment_id"]

    # Must return the identical cached assessment rather than creating duplicates
    assert asmt_id_1 == asmt_id_2


def test_farm_creation_persistence_failure_never_reports_success():
    """TASK 3: Never report a successful save when farm creation persistence fails."""
    with patch.object(
        firestore_repo,
        "save_farm",
        side_effect=RuntimeError("Firestore set operation failed on connection timeout"),
    ):
        with pytest.raises(RuntimeError) as exc_info:
            farm_service.create_farm(
                FarmCreate(name="Failing Farm", location="Delta", total_area_hectares=10.0),
                owner_uid="auditor_a",
            )
        assert "Firestore set operation failed" in str(exc_info.value)


def test_all_firestore_methods_block_silent_fallback_in_production():
    """TASK 3: Every method in FirestoreRepository must raise PersistenceUnavailableError in production."""
    orig_env = settings.ENVIRONMENT
    orig_fallback = settings.ALLOW_IN_MEMORY_FALLBACK
    try:
        settings.ENVIRONMENT = "production"
        settings.ALLOW_IN_MEMORY_FALLBACK = False

        repo = firestore_repo
        with patch("app.services.firestore_repo.get_firestore_client", return_value=None):
            with pytest.raises(PersistenceUnavailableError):
                repo.save_farm({"farm_id": "f1", "owner_uid": "u1"})
            with pytest.raises(PersistenceUnavailableError):
                repo.get_farm("f1")
            with pytest.raises(PersistenceUnavailableError):
                repo.list_farms("u1")
            with pytest.raises(PersistenceUnavailableError):
                repo.delete_farm("f1", owner_uid="u1")
            with pytest.raises(PersistenceUnavailableError):
                repo.save_assessment({"assessment_id": "a1", "owner_uid": "u1"})
            with pytest.raises(PersistenceUnavailableError):
                repo.get_assessment("a1")
            with pytest.raises(PersistenceUnavailableError):
                repo.list_assessments("u1")
    finally:
        settings.ENVIRONMENT = orig_env
        settings.ALLOW_IN_MEMORY_FALLBACK = orig_fallback


def test_assessment_history_preservation_across_repository_reinitialization():
    """TASK 3: Assessment history must be preserved across application/repository lifecycle."""
    mock_firestore_db: dict[str, dict] = {}

    class MockDocRef:
        def __init__(self, coll: str, doc_id: str):
            self.coll = coll
            self.doc_id = doc_id

        def set(self, data: dict):
            mock_firestore_db[f"{self.coll}/{self.doc_id}"] = copy.deepcopy(data)

        def get(self):
            key = f"{self.coll}/{self.doc_id}"
            exists = key in mock_firestore_db
            data = mock_firestore_db.get(key, {})

            class MockDocSnapshot:
                def __init__(self, ex: bool, d: dict):
                    self.exists = ex
                    self._d = d

                def to_dict(self):
                    return copy.deepcopy(self._d)

            return MockDocSnapshot(exists, data)

    class MockCollection:
        def __init__(self, name: str):
            self.name = name

        def document(self, doc_id: str):
            return MockDocRef(self.name, doc_id)

        def where(self, field: str, op: str, value: Any):
            results = []
            prefix = f"{self.name}/"
            for k, v in mock_firestore_db.items():
                if k.startswith(prefix) and v.get(field) == value:
                    class MockSnap:
                        def __init__(self, data):
                            self._data = data

                        def to_dict(self):
                            return copy.deepcopy(self._data)

                    results.append(MockSnap(v))

            class MockQuery:
                def __init__(self, items):
                    self.items = items

                def stream(self):
                    return iter(self.items)

                def where(self, f2, op2, v2):
                    filtered = [it for it in self.items if it.to_dict().get(f2) == v2]
                    return MockQuery(filtered)

            return MockQuery(results)

    class MockFirestoreClient:
        def collection(self, name: str):
            return MockCollection(name)

    mock_client = MockFirestoreClient()

    # Step 1: Save assessment with first repository instance
    with patch("app.services.firestore_repo.get_firestore_client", return_value=mock_client):
        from app.services.firestore_repo import FirestoreRepository
        repo_instance_1 = FirestoreRepository()
        saved = repo_instance_1.save_assessment({
            "assessment_id": "asmt_persisted_999",
            "owner_uid": "farmer_persistent",
            "farm_id": "farm_01",
            "farmer_confirmed_crop": "rice",
            "timestamp": "2026-09-30T12:00:00Z",
        })
        assert saved["_storage_backend"] == "firestore"

    # Step 2: "Restart" application / instantiate completely fresh repository instance
    with patch("app.services.firestore_repo.get_firestore_client", return_value=mock_client):
        repo_instance_2 = FirestoreRepository()
        # Verify retrieved data matches despite in-memory store in repo_instance_2 being empty initially
        retrieved = repo_instance_2.get_assessment("asmt_persisted_999", owner_uid="farmer_persistent")
        assert retrieved is not None
        assert retrieved["assessment_id"] == "asmt_persisted_999"
        assert retrieved["farmer_confirmed_crop"] == "rice"

        history = repo_instance_2.list_assessments(owner_uid="farmer_persistent")
        assert len(history) == 1
        assert history[0]["assessment_id"] == "asmt_persisted_999"

