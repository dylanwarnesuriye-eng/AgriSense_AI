"""End-to-end integration testing for the complete farmer journey in AgriSense AI.

Covers:
1. Agronomist authentication & profile context.
2. Farm estate creation & field plot boundary delineation.
3. Soil and microclimate telemetry recording.
4. Stage A Decision Tree crop recommendation (verifying withheld uncalibrated confidence).
5. Farmer crop confirmation invariant (Rice, Maize, and unsupported Chickpea).
6. Stage B multi-subsystem evaluation:
   - Rice (integrated pathway, all modules evaluated).
   - Maize/Corn (integrated pathway, all modules evaluated).
   - Chickpea (unsupported in yield module: safe rejection with 0 fabricated yield).
7. Missing telemetry handling (no coercion to zero, returns insufficient_data).
8. Scientific safety guardrails: draft rules blocked in production mode.
9. Combined assessment results verification & persistence retrieval in assessment history.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

USER_UID = "journey_farmer_007"
AUTH_HEADERS = {"Authorization": f"Bearer mock-token-{USER_UID}"}


def test_full_farmer_journey_rice_integrated_pathway():
    """Complete journey test for Rice (full recommendation-to-yield pathway)."""
    # 1. Verify Farm Creation
    farm_resp = client.post(
        "/api/v1/farms",
        json={
            "name": "Verdant Valleys Rice Estate",
            "location": "Delta Basin, Region 4",
            "total_area_hectares": 25.0,
            "soil_type": "Clay Loam",
        },
        headers=AUTH_HEADERS,
    )
    assert farm_resp.status_code == 201
    farm_data = farm_resp.json()["data"]
    farm_id = farm_data["farm_id"]
    assert farm_data["name"] == "Verdant Valleys Rice Estate"

    # 2. Delineate Field Plot
    field_resp = client.post(
        f"/api/v1/farms/{farm_id}/fields",
        json={
            "name": "Paddy Plot 1",
            "area_hectares": 8.5,
            "soil_type": "Clay",
            "irrigation_type": "Basin",
        },
        headers=AUTH_HEADERS,
    )
    assert field_resp.status_code == 201
    field_id = field_resp.json()["data"]["field_id"]

    # 3. Enter Soil & Climate Telemetry
    telemetry_resp = client.post(
        f"/api/v1/farms/{farm_id}/fields/{field_id}/measurements",
        json={
            "nitrogen": 80.0,
            "phosphorus": 40.0,
            "potassium": 40.0,
            "soil_ph": 6.5,
            "soil_moisture_pct": 32.0,
            "temperature_celsius": 26.5,
            "humidity_pct": 78.0,
            "rainfall_mm": 210.0,
            "measurement_source": "sensor",
        },
        headers=AUTH_HEADERS,
    )
    assert telemetry_resp.status_code == 201
    measurement_id = telemetry_resp.json()["data"]["measurement_id"]
    assert measurement_id is not None

    # 4. Stage A: Decision Tree Crop Recommendation
    stage_a_resp = client.post(
        "/api/v1/orchestrator/stage-a/recommend-crop",
        json={
            "farm_id": farm_id,
            "field_id": field_id,
            "nitrogen": 80.0,
            "phosphorus": 40.0,
            "potassium": 40.0,
            "temperature": 26.5,
            "humidity": 78.0,
            "ph": 6.5,
            "rainfall": 210.0,
            "academic_demo_mode": True,
        },
        headers=AUTH_HEADERS,
    )
    assert stage_a_resp.status_code == 200
    stage_a = stage_a_resp.json()["data"]
    assert stage_a["recommended_crop"] == "rice"
    assert stage_a["requires_confirmation"] is True
    stage_a_id = stage_a["stage_a_id"]

    # 5. Stage B: Multi-Subsystem Operational Dispatch with Farmer Confirmation
    stage_b_resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json={
            "stage_a_id": stage_a_id,
            "farm_id": farm_id,
            "field_id": field_id,
            "confirmed_crop": "rice",
            "academic_demo_mode": True,
            "irrigation_inputs": {
                "soil_water_depletion_pct": 65.0,
                "atmospheric_demand_pct": 50.0,
                "effective_rainfall_mm": 10.0,
            },
            "fertilizer_inputs": {
                "nitrogen_status": "Deficient",
                "growth_stage": "basal",
                "field_area_ha": 8.5,
            },
            "yield_inputs": {
                "field_area_ha": 8.5,
                "is_prospective_planning": True,
            },
        },
        headers=AUTH_HEADERS,
    )
    assert stage_b_resp.status_code == 200
    stage_b = stage_b_resp.json()["data"]

    # Verify All 4 AI Subsystems in Results
    assert stage_b["farmer_confirmed_crop"] == "rice"
    assert stage_b["is_crop_from_recommendation"] is True
    assert stage_b["crop_pathway_compatibility"]["pathway_type"] == "integrated"

    # Subsystem 2: Irrigation (Mamdani flooded paddy special handling)
    assert stage_b["irrigation_result"]["status"] == "evaluated"
    assert stage_b["irrigation_result"]["data"]["assessment_status"] == "paddy_special_handling"
    assert stage_b["irrigation_result"]["data"]["urgency_score"] is None

    # Subsystem 3: Fertilizer (Expert System)
    assert stage_b["fertilizer_result"]["status"] == "evaluated"
    assert len(stage_b["fertilizer_result"]["data"]["fertilizer_products"]) > 0

    # Subsystem 4: Yield (Regression)
    assert stage_b["yield_result"]["status"] == "evaluated"
    assert stage_b["yield_result"]["data"]["predicted_yield_tpha"] > 0

    # 6. Verify Assessment History Retrieval
    hist_resp = client.get(f"/api/v1/orchestrator/assessments?farm_id={farm_id}", headers=AUTH_HEADERS)
    assert hist_resp.status_code == 200
    assessments = hist_resp.json()["data"]
    assert len(assessments) >= 1
    assert any(a["assessment_id"] == stage_b["assessment_id"] for a in assessments)


def test_full_farmer_journey_maize_integrated_pathway():
    """Complete journey test for Maize (upland crop with numerical urgency score)."""
    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json={
            "confirmed_crop": "maize",
            "academic_demo_mode": True,
            "irrigation_inputs": {
                "soil_water_depletion_pct": 70.0,
                "atmospheric_demand_pct": 60.0,
                "effective_rainfall_mm": 5.0,
            },
            "fertilizer_inputs": {
                "nitrogen_status": "Deficient",
                "growth_stage": "vegetative",
                "field_area_ha": 10.0,
            },
            "yield_inputs": {
                "field_area_ha": 10.0,
                "is_prospective_planning": True,
            },
        },
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    # All 4 components evaluated
    assert data["crop_pathway_compatibility"]["pathway_type"] == "integrated"
    assert data["crop_pathway_compatibility"]["yield_canonical_crop"] == "Corn"

    assert data["irrigation_result"]["status"] == "evaluated"
    assert data["irrigation_result"]["data"]["urgency_score"] is not None
    assert data["irrigation_result"]["data"]["urgency_score"] > 0

    assert data["fertilizer_result"]["status"] == "evaluated"
    assert data["yield_result"]["status"] == "evaluated"
    assert data["yield_result"]["data"]["crop_name"] == "Corn"


def test_unsupported_yield_crop_pathway_isolation():
    """Ensure unsupported yield crops (e.g. chickpea) safely isolate without failing other modules."""
    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json={
            "confirmed_crop": "chickpea",
            "academic_demo_mode": True,
            "irrigation_inputs": {
                "soil_water_depletion_pct": 40.0,
                "atmospheric_demand_pct": 30.0,
                "effective_rainfall_mm": 5.0,
            },
            "fertilizer_inputs": {
                "nitrogen_status": "Sufficient",
                "growth_stage": "vegetative",
                "field_area_ha": 4.0,
            },
            "yield_inputs": {
                "field_area_ha": 4.0,
                "is_prospective_planning": True,
            },
        },
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]

    # Irrigation and Fertilizer succeed
    assert data["irrigation_result"]["status"] == "evaluated"
    assert data["fertilizer_result"]["status"] == "evaluated"

    # Yield strictly rejects without error or synthetic predictions
    assert data["yield_result"]["status"] == "unsupported_crop"
    assert data["yield_result"]["data"] is None
    assert "chickpea" in data["yield_result"]["error_message"].lower()


def test_missing_telemetry_never_coerced_to_zero():
    """Missing irrigation telemetry parameters return insufficient_data, never coerced to 0."""
    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json={
            "confirmed_crop": "maize",
            "academic_demo_mode": True,
            "irrigation_inputs": {
                # soil_water_depletion_pct is missing
                "atmospheric_demand_pct": 40.0,
            },
        },
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["irrigation_result"]["status"] == "insufficient_data"
    assert data["irrigation_result"]["data"]["urgency_score"] is None
    assert data["irrigation_result"]["data"]["software_status"] == "insufficient_data"


def test_draft_agronomic_rules_safeguard_in_strict_production():
    """Unapproved/draft rules are blocked from producing actionable application quantities in production."""
    resp = client.post(
        "/api/v1/orchestrator/stage-b/evaluate-crop",
        json={
            "confirmed_crop": "rice",
            "academic_demo_mode": False,  # Strict production mode
            "fertilizer_inputs": {
                "nitrogen_status": "Deficient",
                "growth_stage": "basal",
                "field_area_ha": 5.0,
            },
        },
        headers=AUTH_HEADERS,
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    # In strict production mode, unapproved fertilizer rules return UNAPPROVED_RULE_BASE
    assert data["fertilizer_result"]["status"] == "unapproved_rule_base"
    assert data["fertilizer_result"]["is_production_approved"] is False
