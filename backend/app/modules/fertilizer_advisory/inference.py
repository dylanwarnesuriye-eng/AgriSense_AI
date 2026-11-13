"""Runtime inference service for Knowledge-Based Fertilizer Advisory.

Orchestrates:
  - Input telemetry validation
  - Crop compatibility verification
  - Forward-chaining inference engine execution
  - Commercial fertilizer product dosage calculation
  - Elemental-to-oxide conversion safeguards
  - Prior fertilizer application deduction
  - Lime requirement safeguards
"""
from typing import Any

from app.modules.fertilizer_advisory.calculations import (
    calculate_lime_requirement,
    calculate_product_requirement,
)
from app.modules.fertilizer_advisory.engine import FertilizerRuleEngine
from app.modules.fertilizer_advisory.knowledge_base import (
    RULE_APPROVAL_STATUS,
    RULE_BASE_VERSION,
)
from app.modules.fertilizer_advisory.schemas import (
    FertilizerAdvisoryInput,
    FertilizerAdvisoryOutput,
    FertilizerProductRecommendation,
)

SUPPORTED_FERTILIZER_CROPS = {
    "Rice": ["rice", "paddy", "oryza sativa"],
    "Maize": ["maize", "corn", "zea mays"],
    "Wheat": ["wheat", "triticum"],
    "Soybean": ["soybean", "soya"],
    "Chickpea": ["chickpea", "gram"],
}


class FertilizerAdvisoryService:
    """Production service for fertilizer advisory inference."""

    def __init__(self):
        self.engine = FertilizerRuleEngine()

    def generate_advisory(self, input_data: FertilizerAdvisoryInput) -> FertilizerAdvisoryOutput:
        """Evaluate soil measurements and generate safeguarded fertilizer recommendations."""
        crop_input = input_data.crop_name.strip()
        canonical_crop = self._resolve_crop_name(crop_input)

        # -----------------------------------------------------------------
        # 1. Supported Crop Verification
        # -----------------------------------------------------------------
        if not canonical_crop:
            explanation = (
                f"Crop '{crop_input}' is currently unsupported by the fertilizer advisory knowledge base. "
                "Nutrient response curves and fertilizer guidelines are not established for this crop."
            )
            return FertilizerAdvisoryOutput(
                selected_crop=crop_input,
                crop_name=crop_input,
                assessment_status="unsupported_crop",
                nutrient_status="Unsupported Crop",
                nutrient_assessment={},
                recommended_nutrients_kgha={},
                fertilizer_products=[],
                activated_rule_ids=[],
                evidence_references=[],
                rule_version=RULE_BASE_VERSION,
                agronomic_validation_status=RULE_APPROVAL_STATUS,
                is_production_approved=False,
                explanation=explanation,
                explanation_trace=[f"Crop '{crop_input}' rejected: no agronomic rule profile exists."],
                warnings=[
                    f"No calibrated fertilizer profile exists for '{crop_input}'. Recommendations are suppressed."
                ],
                recommended_fertilizers=[],
                rules_applied=[],
                verified=False,
            )

        # -----------------------------------------------------------------
        # 2. Input Sufficiency & Unit Compatibility Check
        # -----------------------------------------------------------------
        has_nutrients = (
            input_data.nitrogen is not None
            or input_data.phosphorus is not None
            or input_data.potassium is not None
        )

        if not has_nutrients:
            explanation = (
                "Insufficient soil test data: Evaluation requires at least one primary macronutrient "
                "measurement (N, P, or K). Unknown soil information must not be assumed as zero."
            )
            return FertilizerAdvisoryOutput(
                selected_crop=canonical_crop,
                crop_name=crop_input,
                assessment_status="insufficient_data",
                nutrient_status="Insufficient Data",
                nutrient_assessment={},
                recommended_nutrients_kgha={},
                fertilizer_products=[],
                activated_rule_ids=[],
                evidence_references=[],
                rule_version=RULE_BASE_VERSION,
                agronomic_validation_status=RULE_APPROVAL_STATUS,
                is_production_approved=False,
                explanation=explanation,
                explanation_trace=["Inference aborted: missing soil macronutrient measurements."],
                warnings=["Soil N, P, and K measurements were missing from observation telemetry."],
                recommended_fertilizers=[],
                rules_applied=[],
                verified=False,
            )

        # Incompatible unit check
        if input_data.soil_test_unit:
            valid_units = {"%", "mg/kg", "ppm", "meq/100g", "kg/ha"}
            if input_data.soil_test_unit.lower() not in valid_units:
                explanation = (
                    f"Incompatible soil test unit '{input_data.soil_test_unit}'. "
                    "Verified soil-testing guidelines require standard concentrations (mg/kg, ppm, %, meq/100g)."
                )
                return FertilizerAdvisoryOutput(
                    selected_crop=canonical_crop,
                    crop_name=crop_input,
                    assessment_status="insufficient_data",
                    nutrient_status="Incompatible Units",
                    nutrient_assessment={},
                    recommended_nutrients_kgha={},
                    fertilizer_products=[],
                    activated_rule_ids=[],
                    evidence_references=[],
                    rule_version=RULE_BASE_VERSION,
                    agronomic_validation_status=RULE_APPROVAL_STATUS,
                    is_production_approved=False,
                    explanation=explanation,
                    explanation_trace=[f"Aborted: Incompatible unit '{input_data.soil_test_unit}'."],
                    warnings=[f"Unrecognized soil measurement unit '{input_data.soil_test_unit}'."],
                    recommended_fertilizers=[],
                    rules_applied=[],
                    verified=False,
                )

        # -----------------------------------------------------------------
        # 3. Production Approval Gatekeeper
        # -----------------------------------------------------------------
        if not input_data.academic_demo_mode and RULE_APPROVAL_STATUS == "draft_unvalidated":
            explanation = (
                "Agronomic rule base v0.1-draft-scaffold is an unvalidated engineering prototype. "
                "Operational fertilizer recommendations cannot be released in production mode outside academic demonstration."
            )
            return FertilizerAdvisoryOutput(
                selected_crop=canonical_crop,
                crop_name=crop_input,
                assessment_status="unapproved_rule_base",
                nutrient_status="Unapproved Rule Base",
                nutrient_assessment={},
                recommended_nutrients_kgha={},
                fertilizer_products=[],
                activated_rule_ids=[],
                evidence_references=[],
                rule_version=RULE_BASE_VERSION,
                agronomic_validation_status=RULE_APPROVAL_STATUS,
                is_production_approved=False,
                explanation=explanation,
                explanation_trace=["Production execution blocked: rule base requires formal agronomic validation."],
                warnings=[
                    "Production fertilizer recommendations are blocked. Enable academic_demo_mode to view prototype simulations."
                ],
                recommended_fertilizers=[],
                rules_applied=[],
                verified=False,
            )

        # -----------------------------------------------------------------
        # 4. Forward Chaining Engine Execution
        # -----------------------------------------------------------------
        engine_result = self.engine.evaluate_farm_facts(
            crop_name=canonical_crop,
            nitrogen=input_data.nitrogen,
            phosphorus=input_data.phosphorus,
            potassium=input_data.potassium,
            ph=input_data.ph,
            region=input_data.region,
            cultivation_condition=input_data.cultivation_method,
            growth_stage=input_data.crop_growth_stage,
            soil_test_method=input_data.soil_test_method,
        )

        # -----------------------------------------------------------------
        # 5. Fertilizer Product & Safeguarded Calculations
        # -----------------------------------------------------------------
        prior_apps: dict[str, float] = {}
        if input_data.previous_applications:
            for app in input_data.previous_applications:
                prior_apps[app.nutrient] = prior_apps.get(app.nutrient, 0.0) + app.amount_kgha

        calc_plans, calc_warnings = calculate_product_requirement(
            recommended_nutrients=engine_result.recommended_nutrients_kgha,
            previous_applications=prior_apps,
            field_area_ha=input_data.field_area_hectares,
            selected_products=input_data.selected_products,
            academic_demo_mode=input_data.academic_demo_mode,
            is_rule_approved=False,
        )

        product_recommendations: list[FertilizerProductRecommendation] = [
            FertilizerProductRecommendation(
                product_name=p.product_name,
                target_nutrient=p.target_nutrient,
                nutrient_rate_kgha=p.recommended_nutrient_rate_kgha,
                product_rate_kgha=p.product_rate_kgha,
                total_field_requirement_kg=p.total_field_requirement_kg,
                calculation_status=p.calculation_status,
                warnings=p.warnings,
            )
            for p in calc_plans
        ]

        # Lime requirement check
        lime_warnings: list[str] = []
        if input_data.ph is not None and input_data.ph < 5.5:
            _, lime_warnings = calculate_lime_requirement(soil_ph=input_data.ph)

        all_warnings = engine_result.warnings + calc_warnings + lime_warnings
        all_warnings.append(
            "Agronomic disclaimer: Rule base v0.1-draft-scaffold is an engineering prototype. "
            "Fertilizer applications require soil-testing lab and agricultural extension verification."
        )

        # Synthesize clear explanation
        narrative = self._compose_explanation(
            crop_name=canonical_crop,
            nutrient_status=engine_result.nutrient_status,
            nutrients_kgha=engine_result.recommended_nutrients_kgha,
            calc_plans=calc_plans,
        )

        legacy_prods = [
            f"{p.product_name} ({p.product_rate_kgha} kg/ha)"
            for p in product_recommendations
            if p.product_rate_kgha is not None
        ]

        return FertilizerAdvisoryOutput(
            selected_crop=canonical_crop,
            crop_name=crop_input,
            assessment_status=engine_result.assessment_status,
            nutrient_status=", ".join(f"{k}: {v}" for k, v in engine_result.nutrient_status.items()) or "Pending",
            nutrient_assessment=engine_result.nutrient_status,
            recommended_nutrients_kgha=engine_result.recommended_nutrients_kgha,
            fertilizer_products=product_recommendations,
            activated_rule_ids=engine_result.activated_rule_ids,
            evidence_references=engine_result.evidence_sources,
            rule_version=engine_result.rule_version,
            agronomic_validation_status=engine_result.approval_status,
            is_production_approved=False,
            explanation=narrative,
            explanation_trace=engine_result.explanation_trace,
            warnings=all_warnings,
            recommended_fertilizers=legacy_prods,
            rules_applied=engine_result.activated_rule_ids,
            verified=False,
        )

    def _resolve_crop_name(self, crop_name: str) -> str | None:
        """Map user crop name or alias to canonical crop."""
        norm = crop_name.strip().lower()
        for canonical, aliases in SUPPORTED_FERTILIZER_CROPS.items():
            if norm == canonical.lower() or norm in aliases:
                return canonical
        return None

    def _compose_explanation(
        self,
        crop_name: str,
        nutrient_status: dict[str, str],
        nutrients_kgha: dict[str, float],
        calc_plans: list[Any],
    ) -> str:
        """Compose clear agronomic narrative."""
        parts = [f"Fertilizer Advisory for {crop_name}."]
        if nutrient_status:
            status_str = ", ".join(f"{k} is {v}" for k, v in nutrient_status.items())
            parts.append(f"Soil analysis indicates: {status_str}.")
        if nutrients_kgha:
            rec_str = ", ".join(f"{v:.1f} kg {k}/ha" for k, v in nutrients_kgha.items())
            parts.append(f"Recommended nutrient application: {rec_str}.")
        if calc_plans:
            prod_str = ", ".join(
                f"{p.product_name} at {p.product_rate_kgha} kg/ha"
                for p in calc_plans
                if p.product_rate_kgha is not None
            )
            if prod_str:
                parts.append(f"Equivalent commercial products: {prod_str}.")
        parts.append("Calculations are prototype simulations based on unvalidated rule base v0.1.")
        return " ".join(parts)


fertilizer_service = FertilizerAdvisoryService()
