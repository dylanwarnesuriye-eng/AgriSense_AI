"""Comprehensive Automated Test Suite for Mamdani Fuzzy Logic Irrigation Advisory.

Covers all 13 requirement categories:
 1. Membership-function boundaries.
 2. Membership degrees strictly within [0.0, 1.0].
 3. Rule coverage (all 36 combinations).
 4. Rule conflict detection & handling.
 5. Valid centroid defuzzification calculations.
 6. Zero-activation fallback safety.
 7. Missing or invalid input handling (insufficient_data).
 8. Out-of-range measurements rejection.
 9. Unsupported crop routing.
10. Unapproved rule configuration tracking.
11. Paddy rice special handling routing.
12. API response contracts and backward compatibility.
13. Independence from Decision Tree and Regression models.
"""
import pytest
from httpx import AsyncClient

from app.modules.irrigation_advisory import (
    ATMOSPHERIC_DEMAND_SETS,
    EFFECTIVE_RAINFALL_SETS,
    IRRIGATION_URGENCY_SETS,
    MAMDANI_RULES,
    RULE_VALIDATION_STATUS,
    RULE_VERSION,
    SOIL_WATER_DEPLETION_SETS,
    FuzzyRule,
    IrrigationAdvisoryInput,
    MamdaniIrrigationEngine,
    detect_rule_conflicts,
    irrigation_service,
    trapmf,
    trimf,
    verify_rule_coverage,
)


# =========================================================================
# 1. Membership-Function Boundaries
# =========================================================================
def test_membership_function_boundaries():
    """Verify trimf and trapmf reject inverted bounds and behave properly at edges."""
    # trimf boundary violation: a > b or b > c
    with pytest.raises(ValueError, match="Invalid triangular bounds"):
        trimf(25.0, 30.0, 20.0, 40.0)

    with pytest.raises(ValueError, match="Invalid triangular bounds"):
        trimf(25.0, 20.0, 40.0, 30.0)

    # trapmf boundary violation
    with pytest.raises(ValueError, match="Invalid trapezoidal bounds"):
        trapmf(15.0, 20.0, 10.0, 30.0, 40.0)

    # Correct boundary behaviors
    assert trimf(10.0, 20.0, 30.0, 40.0) == 0.0  # below a
    assert trimf(50.0, 20.0, 30.0, 40.0) == 0.0  # above c
    assert trimf(30.0, 20.0, 30.0, 40.0) == 1.0  # exactly at peak b

    assert trapmf(5.0, 10.0, 20.0, 30.0, 40.0) == 0.0   # below a
    assert trapmf(45.0, 10.0, 20.0, 30.0, 40.0) == 0.0  # above d
    assert trapmf(25.0, 10.0, 20.0, 30.0, 40.0) == 1.0  # plateau [b, c]


# =========================================================================
# 2. Membership Degrees Strictly within [0, 1]
# =========================================================================
def test_all_membership_degrees_within_zero_and_one():
    """Verify all defined linguistic terms evaluate strictly within [0.0, 1.0] across their ranges."""
    test_domains = [
        (SOIL_WATER_DEPLETION_SETS, 0.0, 100.0, 2.0),
        (ATMOSPHERIC_DEMAND_SETS, 0.0, 100.0, 2.0),
        (EFFECTIVE_RAINFALL_SETS, 0.0, 50.0, 1.0),
        (IRRIGATION_URGENCY_SETS, 0.0, 100.0, 2.0),
    ]

    for variable_sets, min_val, max_val, step in test_domains:
        val = min_val
        while val <= max_val:
            for term_name, fuzzy_set in variable_sets.items():
                deg = fuzzy_set.evaluate(val)
                assert 0.0 <= deg <= 1.0, f"Violation: {term_name} at {val} yielded {deg}"
            val += step


# =========================================================================
# 3. Rule Coverage (All 36 Combinations)
# =========================================================================
def test_rule_coverage_completeness():
    """Verify all 36 combinations (4 depletion x 3 demand x 3 rainfall) are covered."""
    coverage = verify_rule_coverage(MAMDANI_RULES)
    assert coverage["is_complete"] is True
    assert coverage["total_expected"] == 36
    assert coverage["total_present"] == 36
    assert coverage["coverage_ratio"] == 1.0
    assert len(coverage["missing_combinations"]) == 0


# =========================================================================
# 4. Rule Conflict Handling
# =========================================================================
def test_rule_conflict_detection():
    """Verify production rule base has zero conflicts, and conflict detector catches contradictions."""
    # Production rules
    conflicts = detect_rule_conflicts(MAMDANI_RULES)
    assert conflicts == []

    # Deliberate synthetic conflict
    conflicted_rules = list(MAMDANI_RULES) + [
        FuzzyRule(
            id="RULE_CONFLICT",
            depletion="Low",
            demand="Low",
            rainfall="High",
            consequent="High priority",  # Contradicts RULE_01 ("No irrigation indicated")
        )
    ]
    detected = detect_rule_conflicts(conflicted_rules)
    assert len(detected) == 1
    assert "RULE_01" in detected[0]["rule_1"]
    assert "RULE_CONFLICT" in detected[0]["rule_2"]


# =========================================================================
# 5. Valid Centroid Calculations
# =========================================================================
def test_valid_centroid_calculations():
    """Verify centroid outputs sensible non-null scores for typical agrarian conditions."""
    engine = MamdaniIrrigationEngine()

    # Case A: Low Depletion + High Rainfall + Low Demand -> "No irrigation indicated"
    result_low = engine.evaluate(soil_water_depletion=5.0, atmospheric_demand=10.0, effective_rainfall=45.0)
    assert result_low.assessment_status == "valid"
    assert result_low.urgency_category == "No irrigation indicated"
    assert 0.0 <= result_low.urgency_score < 25.0
    assert len(result_low.activated_rule_ids) > 0

    # Case B: Critical Depletion + Low Rainfall + High Demand -> "High priority"
    result_high = engine.evaluate(soil_water_depletion=95.0, atmospheric_demand=90.0, effective_rainfall=1.0)
    assert result_high.assessment_status == "valid"
    assert result_high.urgency_category == "High priority"
    assert result_high.urgency_score >= 75.0
    assert "RULE_36" in result_high.activated_rule_ids

    # Case C: Moderate Depletion + Low Rainfall + Medium Demand -> "Irrigation may be needed"
    result_mid = engine.evaluate(soil_water_depletion=50.0, atmospheric_demand=55.0, effective_rainfall=3.0)
    assert result_mid.assessment_status == "valid"
    assert result_mid.urgency_category in ["Monitor", "Irrigation may be needed"]
    assert 25.0 <= result_mid.urgency_score <= 80.0


# =========================================================================
# 6. Zero-Activation Fallback Safety
# =========================================================================
def test_zero_activation_fallback():
    """Verify engine handles zero-activation cleanly without division-by-zero, returning unavailable and nulls."""
    # Engine with empty rule set
    empty_engine = MamdaniIrrigationEngine(rules=[])
    result = empty_engine.evaluate(soil_water_depletion=50.0, atmospheric_demand=50.0, effective_rainfall=20.0)

    assert result.assessment_status == "unavailable"
    assert result.software_status == "unavailable"
    assert result.urgency_score is None
    assert result.urgency_category is None
    assert result.activated_rule_ids == []
    assert any("Zero rule activation" in w for w in result.warnings)


# =========================================================================
# 7. Missing or Invalid Inputs (Insufficient Data Handling)
# =========================================================================
def test_missing_inputs_returns_insufficient_data():
    """Verify service returns 'insufficient_data' when neither derived nor raw inputs are provided."""
    # Completely empty payload
    payload = IrrigationAdvisoryInput(crop_type="Wheat")
    advisory = irrigation_service.generate_advisory(payload)

    assert advisory.assessment_status == "insufficient_data"
    assert advisory.urgency_score is None
    assert advisory.urgency_category is None
    assert "Insufficient input data" in advisory.explanation


# =========================================================================
# 8. Out-of-Range Measurements
# =========================================================================
def test_out_of_range_measurements_rejected():
    """Verify schema bounds reject negative or out-of-range physical values."""
    with pytest.raises(ValueError):
        IrrigationAdvisoryInput(soil_water_depletion=125.0)

    with pytest.raises(ValueError):
        IrrigationAdvisoryInput(soil_water_depletion=-10.0)

    with pytest.raises(ValueError):
        IrrigationAdvisoryInput(relative_humidity=150.0)

    with pytest.raises(ValueError):
        IrrigationAdvisoryInput(ambient_temperature=100.0)


# =========================================================================
# 9. Unsupported Crops
# =========================================================================
def test_unsupported_crops_handling():
    """Verify unsupported crops return 'unsupported_crop' status without guessing."""
    payload = IrrigationAdvisoryInput(
        crop_type="DragonFruit",
        soil_water_depletion=60.0,
        atmospheric_demand=50.0,
        effective_rainfall=10.0,
    )
    advisory = irrigation_service.generate_advisory(payload)

    assert advisory.assessment_status == "unsupported_crop"
    assert advisory.urgency_score is None
    assert advisory.urgency_category is None
    assert "currently unsupported" in advisory.explanation


# =========================================================================
# 10. Unapproved Rule Configuration Tracking
# =========================================================================
def test_unapproved_rule_configuration_tracking():
    """Verify rule versioning and unvalidated draft status are strictly preserved."""
    assert RULE_VERSION == "v0.1-draft-scaffold"
    assert RULE_VALIDATION_STATUS == "draft_unvalidated"

    payload = IrrigationAdvisoryInput(
        crop_type="Wheat",
        soil_water_depletion=40.0,
        atmospheric_demand=40.0,
        effective_rainfall=15.0,
    )
    advisory = irrigation_service.generate_advisory(payload)

    assert advisory.rule_version == "v0.1-draft-scaffold"
    assert advisory.requires_agronomic_verification is True
    assert any("v0.1-draft-scaffold" in w for w in advisory.warnings)


# =========================================================================
# 11. Paddy-Specific Routing
# =========================================================================
def test_paddy_rice_specific_routing():
    """Verify paddy rice is isolated from upland root-zone depletion rules."""
    for crop in ["Rice", "rice", "paddy", "Paddy"]:
        payload = IrrigationAdvisoryInput(
            crop_type=crop,
            soil_water_depletion=85.0,  # Even with high depletion
            atmospheric_demand=80.0,
            effective_rainfall=0.0,
        )
        advisory = irrigation_service.generate_advisory(payload)

        assert advisory.assessment_status == "paddy_special_handling"
        assert advisory.urgency_score is None
        assert advisory.urgency_category is None
        assert "standing water layer" in advisory.explanation or "pani pipe" in advisory.explanation
        assert advisory.activated_rule_ids == []
        assert any("Paddy rice uses specialized flooded/AWD" in w for w in advisory.warnings)


# =========================================================================
# 12. API Response Contracts & Backward Compatibility
# =========================================================================
@pytest.mark.asyncio
async def test_irrigation_api_endpoints_contract(async_client: AsyncClient):
    """Verify all FastAPI endpoints (/evaluate, /rules, /crops) and backward compatibility."""
    # 1. POST /evaluate with derived inputs
    payload_derived = {
        "crop_type": "Wheat",
        "soil_water_depletion": 45.0,
        "atmospheric_demand": 60.0,
        "effective_rainfall": 5.0,
    }
    resp = await async_client.post("/api/v1/irrigation/evaluate", json=payload_derived)
    assert resp.status_code == 200
    body = resp.json()
    data = body["data"]
    assert data["assessment_status"] == "valid"
    assert data["urgency_score"] is not None
    assert data["urgency_category"] is not None
    assert len(data["activated_rule_ids"]) > 0
    # Backward compatibility assertions
    assert "urgency_level" in data
    assert "advisory_summary" in data
    assert "fuzzy_water_index" in data
    assert data["requires_agronomic_verification"] is True

    # 2. GET /rules
    resp_rules = await async_client.get("/api/v1/irrigation/rules")
    assert resp_rules.status_code == 200
    rule_data = resp_rules.json()["data"]
    assert rule_data["total_rules"] == 36
    assert rule_data["is_complete"] is True
    assert rule_data["coverage_ratio"] == 1.0
    assert rule_data["conflicts_detected"] == []
    assert len(rule_data["rules"]) == 36

    # 3. GET /crops
    resp_crops = await async_client.get("/api/v1/irrigation/crops")
    assert resp_crops.status_code == 200
    crops = resp_crops.json()["data"]
    assert len(crops) >= 6
    # Verify rice is flagged as paddy
    rice_entry = next(c for c in crops if c["canonical_name"] == "Rice")
    assert rice_entry["is_paddy"] is True
    assert "Ponding" in rice_entry["routing_type"]


# =========================================================================
# 13. Independence from Other AI Components
# =========================================================================
def test_independence_from_other_ai_components():
    """Verify the irrigation engine has no dependency on Decision Tree or Yield Regression models."""
    # Ensure irrigation modules don't import crop recommendation or yield prediction models
    import app.modules.irrigation_advisory.engine as engine_mod
    import app.modules.irrigation_advisory.fuzzy_sets as fuzzy_mod
    import app.modules.irrigation_advisory.rules as rules_mod

    for mod in [engine_mod, fuzzy_mod, rules_mod]:
        with open(mod.__file__, encoding="utf-8") as f:
            mod_text = f.read()
        assert "crop_recommendation" not in mod_text
        assert "yield_prediction" not in mod_text
        assert "joblib" not in mod_text
        assert "sklearn" not in mod_text


# =========================================================================
# 14. Irrigation Safety Regression Tests (Task 0 Corrections)
# =========================================================================
def test_production_mode_blocks_unapproved_rules():
    """Verify that when academic_demo_mode=False, draft rules cannot issue production guidance."""
    payload = IrrigationAdvisoryInput(
        crop_type="Wheat",
        soil_water_depletion=60.0,
        atmospheric_demand=60.0,
        effective_rainfall=5.0,
        academic_demo_mode=False,  # Production mode
    )
    advisory = irrigation_service.generate_advisory(payload)

    assert advisory.assessment_status == "unapproved_rule_base"
    assert advisory.software_status == "unapproved_rule_base"
    assert advisory.is_production_approved is False
    assert advisory.urgency_score is None
    assert advisory.urgency_category is None
    assert "cannot produce operational irrigation guidance in production mode" in advisory.explanation


def test_calibrated_raw_depletion_calculation():
    """Verify calibrated raw sensor readings compute depletion relative to RAW."""
    # Field capacity = 35%, Wilting point = 15%, TAW = 20%
    # For Wheat, p = 0.55 -> RAW = 0.55 * 20% = 11%
    # If soil_moisture = 29.5% -> depletion_vol = 35 - 29.5 = 5.5%
    # Depletion relative to RAW = 5.5 / 11.0 = 50.0%
    payload = IrrigationAdvisoryInput(
        crop_type="Wheat",
        soil_moisture=29.5,
        ambient_temperature=25.0,
        relative_humidity=50.0,
        rainfall_forecast_24h=5.0,
        sensor_calibrated=True,
        field_capacity=35.0,
        wilting_point=15.0,
        academic_demo_mode=True,
    )
    advisory = irrigation_service.generate_advisory(payload)
    assert advisory.assessment_status == "valid"
    assert advisory.urgency_score is not None
    assert "Root-zone depletion relative to RAW=50.0%" in advisory.explanation
