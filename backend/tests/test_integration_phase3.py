"""Phase 3 Full-Stack Integration & Safeguard Test Suite.

Verifies:
1. Firebase Authentication & Bearer token verification.
2. Cross-user access denial (403 Forbidden).
3. Farm, Field, and Typed Telemetry CRUD operations.
4. Non-coercion of missing measurements to zero.
5. Two-Stage Assessment Orchestrator (Stage A -> Farmer Confirmation -> Stage B).
6. Rice integrated pathway (rice -> Rice).
7. Maize integrated pathway (maize -> Corn).
8. Unsupported crop rejection in yield model (yield_supported=False, no fabricated prediction).
9. Missing irrigation input handling.
10. Unapproved fertilizer rules blocked in production mode.
11. Draft irrigation rules blocked in production mode.
12. Regression prospective mode and unit non-substitution.
13. Independent subsystem failure isolation (one component failing does not erase others).
14. Persistence failure tolerance.
15. Assessment history and model version auditing.
"""
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.assessment_orchestrator import orchestrator as orch_module
from app.services.firestore_repo import firestore_repo

client = TestClient(app)

USER_A_TOKEN = "mock-token-user_alpha"
USER_B_TOKEN = "mock-token-user_beta"

USER_A_HEADERS = {"Authorization": f"Bearer {USER_A_TOKEN}"}
USER_B_HEADERS = {"Authorization": f"Bearer {USER_B_TOKEN}"}


@pytest.fixture(autouse=True)
def clean_repo():
    """Reset repository before each test."""
    firestore_repo.clear_in_memory_stores()
    yield
    firestore_repo.clear_in_memory_stores()


# -----------------------------------------------------------------------------
# 1. Authentication & Security
# -----------------------------------------------------------------------------
def test_auth_token_verification_and_unauthorized_rejection():
    """Endpoints requiring authentication reject missing or malformed tokens."""
    # 1. Missing Authorization header -> 401
    resp = client.get("/api/v1/farms")
    assert resp.status_code == 401
    assert "Authentication credentials were not provided" in resp.json()["detail"]

    # 2. Empty Bearer token -> 401
    resp = client.get("/api/v1/farms", headers={"Authorization": "Bearer "})
    assert resp.status_code == 401

    # 3. Valid test token -> 200
    resp = client.get("/api/v1/farms", headers=USER_A_HEADERS)
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_cross_user_farm_access_denial():
    """User B cannot read or modify User A's farm."""
    # User A creates a farm
    farm_payload = {
        "name": "Alpha Orchard",
        "location": "Central Valley",
        "total_area_hectares": 25.5,
        "notes": "User A private property",
    }
    create_resp = client.post("/api/v1/farms", json=farm_payload, headers=USER_A_HEADERS)
    assert create_resp.status_code == 201
    farm_id = create_resp.json()["data"]["farm_id"]

    # User B attempts to read User A's farm -> 403 Forbidden
    get_resp = client.get(f"/api/v1/farms/{farm_id}", headers=USER_B_HEADERS)
    assert get_resp.status_code == 403
    assert "Access denied" in get_resp.json()["detail"]

    # User B attempts to add a field to User A's farm -> 403 Forbidden
    field_payload = {"name": "Plot B", "area_hectares": 5.0, "soil_type": "Loam"}
    field_resp = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        json=field_payload,
        headers=USER_B_HEADERS,
    )
    assert field_resp.status_code == 403


# -----------------------------------------------------------------------------
# 2. Farm Management & Missing Data Non-Coercion
# -----------------------------------------------------------------------------
def test_farm_and_field_creation_and_typed_measurements():
    """Verify farm, field, and typed telemetry logging flow."""
    # Create farm
    farm_resp = client.post(
        "/api/v1/farms",
        json={"name": "Green Acres", "location": "North Basin", "total_area_hectares": 40.0},
        headers=USER_A_HEADERS,
    )
    assert farm_resp.status_code == 201
    farm_id = farm_resp.json()["data"]["farm_id"]

    # Create field
    field_resp = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        json={"name": "North Field", "area_hectares": 12.0, "soil_type": "Clay Loam"},
        headers=USER_A_HEADERS,
    )
    assert field_resp.status_code == 201
    field_id = field_resp.json()["data"]["field_id"]

    # Add typed measurement with explicit units
    meas_payload = {
        "source": "sensor",
        "ph": 6.8,
        "temperature": 24.5,
        "humidity": 65.0,
        "units": {
            "ph": "pH_scale",
            "temperature": "celsius",
            "humidity": "percent",
            "rainfall": "mm",
        },
    }
    meas_resp = client.post(
        f"/api/v1/farms/{farm_id}/fields/{field_id}/measurements",
        json=meas_payload,
        headers=USER_A_HEADERS,
    )
    assert meas_resp.status_code == 201
    meas_data = meas_resp.json()["data"]
    assert meas_data["ph"] == 6.8
    assert meas_data["temperature"] == 24.5
    assert meas_data["source"] == "sensor"

    # Fetch measurement history
    hist_resp = client.get(
        f"/api/v1/farms/{farm_id}/fields/{field_id}/measurements",
        headers=USER_A_HEADERS,
    )
    assert hist_resp.status_code == 200
    assert len(hist_resp.json()["data"]) == 1


def test_missing_measurements_are_not_coerced_to_zero():
    """INVARIANT: Missing soil/climate measurements must remain None and never zero."""
    farm_resp = client.post(
        "/api/v1/farms",
        json={"name": "Delta Farm", "location": "Wetlands", "total_area_hectares": 10.0},
        headers=USER_A_HEADERS,
    )
    farm_id = farm_resp.json()["data"]["farm_id"]

    field_resp = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        json={"name": "Plot 1", "area_hectares": 5.0, "soil_type": "Silt"},
        headers=USER_A_HEADERS,
    )
    field_id = field_resp.json()["data"]["field_id"]

    # Log telemetry with unmeasured nitrogen, phosphorus, and rainfall (None)
    meas_payload = {
        "source": "manual_entry",
        "ph": 6.2,
        "nitrogen": None,
        "phosphorus": None,
        "rainfall": None,
    }
    meas_resp = client.post(
        f"/api/v1/farms/{farm_id}/fields/{field_id}/measurements",
        json=meas_payload,
        headers=USER_A_HEADERS,
    )
    assert meas_resp.status_code == 201
    data = meas_resp.json()["data"]

    assert data["nitrogen"] is None
    assert data["phosphorus"] is None
    assert data["rainfall"] is None
    assert data["nitrogen"] != 0.0
    assert data["rainfall"] != 0.0


# -----------------------------------------------------------------------------
# 3. Two-Stage Assessment Orchestrator
# -----------------------------------------------------------------------------
def test_stage_a_crop_recommendation_requires_farmer_confirmation():
    """Stage A outputs candidate crop and explicitly flags requires_confirmation=True."""
    payload = {
        "nitrogen": 80.0,
        "phosphorus": 40.0,
        "potassium": 40.0,
        "temperature": 25.0,
        "humidity": 80.0,
        "ph": 6.5,
        "rainfall": 200.0,
        "academic_demo_mode": True,
    }
    resp = client.post(
        "/api/v1/orchestrator/stage-a/recommend-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    assert data["recommended_crop"] == "rice"
    assert data["confidence_score"] > 0.0
    assert data["requires_confirmation"] is True
    assert data["model_version"] == "crop_decision_tree_v1.0"
    assert "stage_a_id" in data


def test_stage_b_requires_confirmed_crop_payload():
    """Stage B rejects requests missing a confirmed crop."""
    payload = {
        "academic_demo_mode": True,
        # confirmed_crop is missing
    }
    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )
    assert resp.status_code == 422


def test_rice_integrated_workflow():
    """Rice workflow: recommendation 'rice' maps to regression 'Rice' with full multi-module assessment."""
    payload = {
        "confirmed_crop": "rice",
        "academic_demo_mode": True,
        "irrigation_input": {
            "paddy_water_depth_cm": 5.0,
            "days_since_drain": 0,
        },
        "fertilizer_input": {
            "nitrogen_status": "Deficient",
            "phosphorus_status": "Moderate",
            "potassium_status": "Sufficient",
            "region": "Dry Zone",
            "growth_stage": "basal",
            "field_area_hectares": 2.5,
        },
        "yield_input": {
            "region": "Dry Zone",
            "soil_type": "Clay Loam",
            "field_area_ha": 2.5,
            "is_prospective_planning": True,
            "rainfall_mm": 180.0,
            "temperature_celsius": 28.0,
            "fertilizer_applied_kg_ha": 120.0,
            "pesticide_applied_kg_ha": 2.0,
        },
    }

    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    # Check pathway compatibility
    compat = data["crop_pathway_compatibility"]
    assert compat["recommendation_supported"] is True
    assert compat["yield_supported"] is True
    assert compat["yield_canonical_crop"] == "Rice"
    assert compat["pathway_type"] == "integrated"

    # Check irrigation result (Rice paddy routing)
    irr = data["irrigation_result"]
    assert irr["status"] == "evaluated"
    assert irr["data"]["assessment_status"] == "paddy_special_handling"

    # Check fertilizer result
    fert = data["fertilizer_result"]
    assert fert["status"] == "evaluated"
    assert fert["model_or_rule_version"] == "kb_fertilizer_v0.1_draft"

    # Check yield result
    yld = data["yield_result"]
    assert yld["status"] == "evaluated"
    assert yld["data"]["predicted_yield_tpha"] > 0
    assert yld["data"]["crop_name"] == "Rice"


def test_maize_corn_integrated_workflow():
    """Maize workflow: recommendation 'maize' maps to regression 'Corn'."""
    payload = {
        "confirmed_crop": "maize",
        "academic_demo_mode": True,
        "yield_input": {
            "region": "Intermediate Zone",
            "soil_type": "Sandy Loam",
            "field_area_ha": 4.0,
            "is_prospective_planning": True,
            "rainfall_mm": 100.0,
            "temperature_celsius": 24.0,
        },
    }

    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    compat = data["crop_pathway_compatibility"]
    assert compat["yield_supported"] is True
    assert compat["yield_canonical_crop"] == "Corn"
    assert compat["pathway_type"] == "integrated"

    yld = data["yield_result"]
    assert yld["status"] == "evaluated"
    assert yld["data"]["crop_name"] == "Corn"


def test_unsupported_crop_in_yield_model_refuses_prediction():
    """INVARIANT: Recommendation crops outside the 5 yield crops report yield_supported=False with NO fabricated prediction."""
    for unsupported in ["coffee", "apple", "cotton", "banana", "chickpea"]:
        payload = {
            "confirmed_crop": unsupported,
            "academic_demo_mode": True,
            "yield_input": {
                "field_area_ha": 5.0,
            },
        }

        resp = client.post(
            "/api/v1/orchestrator/stage-b/evaluate-crop",
            json=payload,
            headers=USER_A_HEADERS,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]

        compat = data["crop_pathway_compatibility"]
        assert compat["yield_supported"] is False
        assert compat["yield_canonical_crop"] is None

        yld = data["yield_result"]
        assert yld["status"] == "unsupported_crop"
        assert yld["data"] is None
        assert "not supported for yield regression" in yld["error_message"]


def test_unapproved_fertilizer_rules_safeguard_in_production():
    """TASK 2: In production mode (academic_demo_mode=False), draft fertilizer rules return unapproved_rule_base and no quantities."""
    payload = {
        "confirmed_crop": "rice",
        "academic_demo_mode": False,  # PRODUCTION MODE
        "fertilizer_input": {
            "nitrogen_status": "Deficient",
            "growth_stage": "basal",
            "field_area_hectares": 1.0,
        },
    }

    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    fert = data["fertilizer_result"]
    assert fert["status"] == "unapproved_rule_base"
    assert fert["is_production_approved"] is False
    assert fert["data"]["assessment_status"] == "unapproved_rule_base"
    assert len(fert["data"]["fertilizer_products"]) == 0
    assert len(fert["data"]["recommended_nutrients_kgha"]) == 0


def test_draft_irrigation_rules_safeguard_in_production():
    """Production mode suppresses draft irrigation urgency score."""
    payload = {
        "confirmed_crop": "maize",
        "academic_demo_mode": False,  # PRODUCTION MODE
        "irrigation_input": {
            "soil_water_depletion": 70.0,
            "atmospheric_demand": 50.0,
            "effective_rainfall": 20.0,
        },
    }

    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    irr = data["irrigation_result"]
    assert irr["status"] == "unapproved_rule_base"
    assert irr["is_production_approved"] is False
    assert irr["data"]["urgency_score"] is None


def test_missing_irrigation_inputs_returns_insufficient_data():
    """Missing irrigation inputs gracefully returns insufficient_data without crashing."""
    payload = {
        "confirmed_crop": "rice",
        "academic_demo_mode": True,
        "irrigation_input": None,
    }
    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )
    assert resp.status_code == 200
    irr = resp.json()["data"]["irrigation_result"]
    assert irr["status"] == "insufficient_data"
    assert irr["data"] is None


def test_independent_subsystem_failure_isolation():
    """A failure in one AI component does NOT erase valid outputs from other components."""
    # Simulate a crash inside the fertilizer subsystem
    with patch.object(
        orch_module.fertilizer_service,
        "generate_advisory",
        side_effect=RuntimeError("Simulated internal fertilizer service failure"),
    ):
        payload = {
            "confirmed_crop": "rice",
            "academic_demo_mode": True,
            "irrigation_input": {
                "paddy_water_depth_cm": 4.0,
            },
            "fertilizer_input": {
                "nitrogen_status": "Deficient",
            },
            "yield_input": {
                "field_area_ha": 3.0,
            },
        }

        resp = client.post(
            "/api/v1/orchestrator/stage-b/evaluate-crop",
            json=payload,
            headers=USER_A_HEADERS,
        )
        assert resp.status_code == 200
        data = resp.json()["data"]

        # Fertilizer failed safely
        assert data["fertilizer_result"]["status"] == "error"
        assert "Simulated internal fertilizer service failure" in data["fertilizer_result"]["error_message"]

        # Irrigation and yield succeeded despite fertilizer crash
        assert data["irrigation_result"]["status"] == "evaluated"
        assert data["yield_result"]["status"] == "evaluated"


def test_persistence_failure_isolation():
    """If persistence fails, orchestrator still returns structured results with a warning."""
    with patch.object(
        firestore_repo,
        "save_assessment",
        side_effect=RuntimeError("Simulated Firestore timeout"),
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
        assert any("Persistence notice" in w for w in data["warnings"])


def test_assessment_history_and_model_versions_tracking():
    """Audit records are saved and retrieved with distinct model versions."""
    payload = {
        "confirmed_crop": "rice",
        "academic_demo_mode": True,
        "yield_input": {"field_area_ha": 2.0},
    }
    client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json=payload,
        headers=USER_A_HEADERS,
    )

    history_resp = client.get("/api/v1/orchestrator/assessments", headers=USER_A_HEADERS)
    assert history_resp.status_code == 200
    history = history_resp.json()["data"]
    assert len(history) == 1

    record = history[0]
    assert record["farmer_confirmed_crop"] == "rice"
    assert record["model_versions"] == {
        "crop_recommendation": "crop_decision_tree_v1.0",
        "irrigation_advisory": "fuzzy_irrigation_v1.0",
        "fertilizer_advisory": "kb_fertilizer_v0.1_draft",
        "yield_prediction": "yield_regressor_v1.0",
    }
