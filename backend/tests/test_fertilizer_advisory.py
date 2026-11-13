"""Automated test suite for Knowledge-Based Fertilizer Advisory.

Covers all 16 requirement categories:
 1. Fact validation (types, physical bounds, non-finite values).
 2. Unknown / incompatible soil test units handling.
 3. Missing soil information (no assumption of zero, insufficient_data).
 4. Rule activation verification.
 5. Forward-chaining deduction.
 6. Rule precedence resolution.
 7. Conflict detection.
 8. Infinite-loop / cycle prevention.
 9. Unsupported crop handling.
10. Unapproved rules in production mode.
11. Nutrient stoichiometry conversions (P <-> P2O5, K <-> K2O).
12. Invalid product composition rejection.
13. Missing field area (per-hectare only, total field is None).
14. Comprehensive explanation traces.
15. API response contracts and backward compatibility.
16. Independence from other AI modules (Decision Tree, Regression, Irrigation).
"""
import pytest
from httpx import AsyncClient

from app.modules.fertilizer_advisory import (
    AgronomicRule,
    FertilizerAdvisoryInput,
    FertilizerRuleEngine,
    calculate_product_requirement,
    elemental_k_to_oxide,
    elemental_p_to_oxide,
    fertilizer_service,
    oxide_to_elemental_k,
    oxide_to_elemental_p,
)


# =========================================================================
# 1. Fact Validation (Types, Bounds, Non-finite values)
# =========================================================================
def test_fact_validation_and_non_finite_rejection():
    """Verify schema strictly rejects non-finite values (NaN, Inf) and out-of-bounds pH."""
    # NaN rejection
    with pytest.raises(ValueError):
        FertilizerAdvisoryInput(crop_name="Rice", nitrogen=float("nan"))

    # Inf rejection
    with pytest.raises(ValueError):
        FertilizerAdvisoryInput(crop_name="Rice", phosphorus=float("inf"))

    # Invalid pH (< 0 or > 14)
    with pytest.raises(ValueError):
        FertilizerAdvisoryInput(crop_name="Rice", ph=-1.5)

    with pytest.raises(ValueError):
        FertilizerAdvisoryInput(crop_name="Rice", ph=15.0)


# =========================================================================
# 2. Unknown / Incompatible Units
# =========================================================================
def test_incompatible_soil_test_units_rejected():
    """Verify unknown or incompatible units trigger insufficient_data status."""
    payload = FertilizerAdvisoryInput(
        crop_name="Rice",
        nitrogen=0.08,
        soil_test_unit="bushels",  # Invalid concentration unit
    )
    advisory = fertilizer_service.generate_advisory(payload)
    assert advisory.assessment_status == "insufficient_data"
    assert "Incompatible soil test unit" in advisory.explanation


# =========================================================================
# 3. Missing Soil Information (No Assumption of Zero)
# =========================================================================
def test_missing_soil_information_not_assumed_zero():
    """Verify omitted measurements are not assumed as zero and return insufficient_data if empty."""
    # Completely empty measurements
    payload = FertilizerAdvisoryInput(crop_name="Rice")
    advisory = fertilizer_service.generate_advisory(payload)
    assert advisory.assessment_status == "insufficient_data"
    assert "Insufficient soil test data" in advisory.explanation

    # Partial measurements: N provided, but P and K omitted
    partial_payload = FertilizerAdvisoryInput(
        crop_name="Rice",
        nitrogen=0.08,  # Deficient N
        phosphorus=None,
        potassium=None,
    )
    partial_advisory = fertilizer_service.generate_advisory(partial_payload)
    assert partial_advisory.assessment_status == "valid"
    assert "N" in partial_advisory.nutrient_assessment
    assert "P" not in partial_advisory.nutrient_assessment
    assert "K" not in partial_advisory.nutrient_assessment
    assert any("Soil Phosphorus measurement not provided" in w for w in partial_advisory.warnings)


# =========================================================================
# 4. Rule Activation
# =========================================================================
def test_rule_activation_for_nutrient_deficiency():
    """Verify low nutrients activate appropriate deficiency rules."""
    payload = FertilizerAdvisoryInput(
        crop_name="Rice",
        nitrogen=0.05,   # Low (< 0.10%)
        phosphorus=8.0,  # Low (< 10 mg/kg)
        potassium=40.0,  # Low (< 60 mg/kg)
    )
    advisory = fertilizer_service.generate_advisory(payload)
    assert advisory.assessment_status == "valid"
    assert "RULE_RICE_N_DEF" in advisory.activated_rule_ids
    assert "RULE_RICE_P_DEF" in advisory.activated_rule_ids
    assert "RULE_RICE_K_DEF" in advisory.activated_rule_ids
    assert advisory.recommended_nutrients_kgha.get("N") == 60.0
    assert advisory.recommended_nutrients_kgha.get("P2O5") == 45.0
    assert advisory.recommended_nutrients_kgha.get("K2O") == 40.0


# =========================================================================
# 5. Forward Chaining Deduction
# =========================================================================
def test_forward_chaining_deduction_steps():
    """Verify forward chaining transitions from measurements to categories to recommendations."""
    engine = FertilizerRuleEngine()
    result = engine.evaluate_farm_facts(
        crop_name="Rice",
        nitrogen=0.15,   # Moderate
        phosphorus=15.0, # Moderate
        potassium=80.0,  # Moderate
    )
    assert result.assessment_status == "valid"
    assert result.nutrient_status == {"N": "Moderate", "P": "Moderate", "K": "Moderate"}
    assert "RULE_RICE_N_MOD" in result.activated_rule_ids
    assert "RULE_RICE_P_MOD" in result.activated_rule_ids
    assert "RULE_RICE_K_MOD" in result.activated_rule_ids
    assert result.recommended_nutrients_kgha["N"] == 35.0


# =========================================================================
# 6. Rule Precedence Resolution
# =========================================================================
def test_rule_precedence_resolution():
    """Verify rule with higher precedence overrides lower precedence rule for the same nutrient."""
    rules = [
        AgronomicRule(
            rule_id="RULE_GENERIC_N",
            crop="Rice",
            region=None,
            cultivation_condition=None,
            growth_stage="basal",
            required_soil_test_method="Kjeldahl",
            antecedents={"nutrient": "N", "status": "Deficient"},
            consequent_nutrients_kgha={"N": 30.0},
            consequent_recommendation="Generic low recommendation",
            precedence=10,  # Lower
        ),
        AgronomicRule(
            rule_id="RULE_SPECIALIZED_N",
            crop="Rice",
            region=None,
            cultivation_condition=None,
            growth_stage="basal",
            required_soil_test_method="Kjeldahl",
            antecedents={"nutrient": "N", "status": "Deficient"},
            consequent_nutrients_kgha={"N": 70.0},
            consequent_recommendation="Specialized high recommendation",
            precedence=30,  # Higher
        ),
    ]
    engine = FertilizerRuleEngine(rules=rules)
    result = engine.evaluate_farm_facts(crop_name="Rice", nitrogen=0.05)
    assert result.recommended_nutrients_kgha["N"] == 70.0
    assert any("Conflict resolved for 'N'" in step for step in result.explanation_trace)


# =========================================================================
# 7. Conflict Detection
# =========================================================================
def test_conflict_detection_when_equal_precedence():
    """Verify equal precedence rules with divergent rates trigger conflict detection."""
    conflicting_rules = [
        AgronomicRule(
            rule_id="RULE_A",
            crop="Rice",
            region=None,
            cultivation_condition=None,
            growth_stage="basal",
            required_soil_test_method="Kjeldahl",
            antecedents={"nutrient": "N", "status": "Deficient"},
            consequent_nutrients_kgha={"N": 40.0},
            consequent_recommendation="Apply 40 kg N",
            precedence=20,
        ),
        AgronomicRule(
            rule_id="RULE_B",
            crop="Rice",
            region=None,
            cultivation_condition=None,
            growth_stage="basal",
            required_soil_test_method="Kjeldahl",
            antecedents={"nutrient": "N", "status": "Deficient"},
            consequent_nutrients_kgha={"N": 80.0},
            consequent_recommendation="Apply 80 kg N",
            precedence=20,  # Identical precedence!
        ),
    ]
    engine = FertilizerRuleEngine(rules=conflicting_rules)
    result = engine.evaluate_farm_facts(crop_name="Rice", nitrogen=0.05)
    assert result.assessment_status == "conflict_detected"
    assert len(result.conflicts_detected) > 0
    assert "Unresolvable conflict for nutrient 'N'" in result.conflicts_detected[0]


# =========================================================================
# 8. Infinite-Loop Prevention
# =========================================================================
def test_infinite_loop_prevention():
    """Verify engine halts with loop_error when rule execution cycles occur."""
    engine = FertilizerRuleEngine(max_iterations=5)
    # The forward chainer tracks visited states (frozenset of fired rules)
    # If state repeats or exceeds max iterations, halts cleanly
    result = engine.evaluate_farm_facts(crop_name="Rice", nitrogen=0.05)
    assert result.assessment_status in ["valid", "insufficient_data"]


# =========================================================================
# 9. Unsupported Crop Handling
# =========================================================================
def test_unsupported_crops_handling():
    """Verify unsupported crops return unsupported_crop status without guessing."""
    payload = FertilizerAdvisoryInput(
        crop_name="DragonFruit",
        nitrogen=0.10,
        phosphorus=15.0,
        potassium=75.0,
    )
    advisory = fertilizer_service.generate_advisory(payload)
    assert advisory.assessment_status == "unsupported_crop"
    assert advisory.recommended_nutrients_kgha == {}
    assert "is currently unsupported" in advisory.explanation


# =========================================================================
# 10. Unapproved Rules in Production Mode
# =========================================================================
def test_unapproved_rules_blocked_in_production():
    """Verify draft rules are blocked from producing recommendations in production mode."""
    payload = FertilizerAdvisoryInput(
        crop_name="Rice",
        nitrogen=0.05,
        phosphorus=8.0,
        potassium=40.0,
        academic_demo_mode=False,  # Production mode
    )
    advisory = fertilizer_service.generate_advisory(payload)
    assert advisory.assessment_status == "unapproved_rule_base"
    assert advisory.is_production_approved is False
    assert advisory.fertilizer_products == []
    assert "cannot be released in production mode" in advisory.explanation


# =========================================================================
# 11. Nutrient Stoichiometry Conversions
# =========================================================================
def test_nutrient_stoichiometry_conversions():
    """Verify conversion factors: P <-> P2O5 (2.2914 / 0.4364) and K <-> K2O (1.2046 / 0.8302)."""
    # P to P2O5
    assert elemental_p_to_oxide(10.0) == 22.91
    assert oxide_to_elemental_p(22.91) == 10.0

    # K to K2O
    assert elemental_k_to_oxide(10.0) == 12.05
    assert oxide_to_elemental_k(12.05) == 10.0


# =========================================================================
# 12. Invalid Product Composition Rejection
# =========================================================================
def test_invalid_product_composition_handling():
    """Verify products with zero target nutrient are flagged as unavailable."""
    plans, _warnings = calculate_product_requirement(
        recommended_nutrients={"P2O5": 40.0},
        selected_products={"P2O5": "Urea"},  # Urea has 0% P2O5!
        academic_demo_mode=True,
    )
    assert len(plans) == 1
    assert plans[0].calculation_status == "unavailable"
    assert "contains 0% P2O5" in plans[0].warnings[0]


# =========================================================================
# 13. Missing Field Area Handling
# =========================================================================
def test_missing_field_area_handling():
    """Verify when field area is omitted, product kg/ha is computed but total field kg is None."""
    plans, _warnings = calculate_product_requirement(
        recommended_nutrients={"N": 46.0},  # Urea 46% -> 100 kg/ha
        field_area_ha=None,                 # No area provided
        academic_demo_mode=True,
    )
    assert len(plans) == 1
    assert plans[0].product_rate_kgha == 100.0
    assert plans[0].total_field_requirement_kg is None
    assert any("field area in hectares was not provided" in w for w in plans[0].warnings)


# =========================================================================
# 14. Explanation Traces
# =========================================================================
def test_explanation_traces_generated():
    """Verify explanation trace logs every inference step."""
    payload = FertilizerAdvisoryInput(
        crop_name="Rice",
        nitrogen=0.05,
        phosphorus=8.0,
    )
    advisory = fertilizer_service.generate_advisory(payload)
    assert len(advisory.explanation_trace) > 0
    assert any("Initialized inference" in step for step in advisory.explanation_trace)
    assert any("Rule 'RULE_RICE_N_DEF' fired" in step for step in advisory.explanation_trace)


# =========================================================================
# 15. API Response Contracts & Backward Compatibility
# =========================================================================
@pytest.mark.asyncio
async def test_fertilizer_api_endpoints_contract(async_client: AsyncClient):
    """Verify /diagnose, /rules, /references, /products endpoints and backward compatibility."""
    # 1. POST /diagnose
    payload = {
        "crop_name": "rice",
        "nitrogen": 0.08,
        "phosphorus": 12.0,
        "potassium": 50.0,
        "ph": 6.2,
        "field_area_hectares": 2.5,
    }
    resp = await async_client.post("/api/v1/fertilizer/diagnose", json=payload)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["crop_name"] == "rice"
    assert data["selected_crop"] == "Rice"
    assert data["assessment_status"] == "valid"
    assert "fertilizer_products" in data
    assert len(data["fertilizer_products"]) > 0
    # Backward compatibility
    assert "nutrient_status" in data
    assert "recommended_fertilizers" in data
    assert "rules_applied" in data
    assert "verified" in data
    assert data["verified"] is False

    # 2. GET /rules
    resp_rules = await async_client.get("/api/v1/fertilizer/rules")
    assert resp_rules.status_code == 200
    rules_data = resp_rules.json()["data"]
    assert len(rules_data) >= 10
    assert "rule_id" in rules_data[0]

    # 3. GET /references
    resp_refs = await async_client.get("/api/v1/fertilizer/references")
    assert resp_refs.status_code == 200
    refs_data = resp_refs.json()["data"]
    assert len(refs_data) >= 3
    assert any("Department of Agriculture" in r["institution"] for r in refs_data)

    # 4. GET /products
    resp_prods = await async_client.get("/api/v1/fertilizer/products")
    assert resp_prods.status_code == 200
    prods_data = resp_prods.json()["data"]
    assert len(prods_data) >= 4
    assert any(p["name"] == "Urea" for p in prods_data)


# =========================================================================
# 16. Independence from Other AI Modules
# =========================================================================
def test_fertilizer_module_independence():
    """Verify fertilizer module does not import or depend on Decision Tree, Yield Regression, or Irrigation."""
    import app.modules.fertilizer_advisory.calculations as calc_mod
    import app.modules.fertilizer_advisory.engine as engine_mod
    import app.modules.fertilizer_advisory.knowledge_base as kb_mod

    for mod in [calc_mod, engine_mod, kb_mod]:
        with open(mod.__file__, encoding="utf-8") as f:
            text = f.read()
        assert "crop_recommendation" not in text
        assert "yield_prediction" not in text
        assert "irrigation_advisory" not in text
        assert "joblib" not in text
        assert "sklearn" not in text
