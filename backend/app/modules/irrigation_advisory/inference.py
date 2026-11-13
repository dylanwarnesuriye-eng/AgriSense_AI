"""Runtime inference service for Mamdani Irrigation Advisory.

Orchestrates input validation, sensor calibration checks, crop-specific routing,
paddy rice isolation, Mamdani fuzzy logic engine execution, explanation generation,
and strict decoupling of software calculation from agronomic approval.
"""
from datetime import datetime, timezone
from typing import Any

from app.modules.irrigation_advisory.crop_profiles import get_crop_profile
from app.modules.irrigation_advisory.engine import MamdaniIrrigationEngine
from app.modules.irrigation_advisory.rules import RULE_VALIDATION_STATUS, RULE_VERSION
from app.modules.irrigation_advisory.schemas import (
    IrrigationAdvisoryInput,
    IrrigationAdvisoryOutput,
)


class IrrigationAdvisoryService:
    """Production service for irrigation advisory inference."""

    def __init__(self):
        self.engine = MamdaniIrrigationEngine()

    def generate_advisory(self, input_data: IrrigationAdvisoryInput) -> IrrigationAdvisoryOutput:
        """Process input through validation, crop routing, and Mamdani fuzzy inference."""
        crop_name = input_data.crop_type or "Wheat"
        profile = get_crop_profile(crop_name)

        # -----------------------------------------------------------------
        # 1. Crop Profile Validation & Routing
        # -----------------------------------------------------------------
        if profile is None:
            return IrrigationAdvisoryOutput(
                selected_crop=crop_name,
                assessment_status="unsupported_crop",
                software_status="unsupported_crop",
                agronomic_approval_status="draft_unvalidated",
                is_production_approved=False,
                urgency_category=None,
                urgency_score=None,
                explanation=(
                    f"Crop '{crop_name}' is currently unsupported in the irrigation expert system. "
                    "Approved crop profiles are required before evaluating root-zone water balance."
                ),
                activated_rule_ids=[],
                rule_version=RULE_VERSION,
                warnings=[
                    (
                        f"No calibrated agronomic profile exists for '{crop_name}'. "
                        "Irrigation decision rules are suspended for this crop."
                    )
                ],
                requires_agronomic_verification=True,
                urgency_level="Unsupported",
                advisory_summary=f"Crop '{crop_name}' is unsupported.",
                fuzzy_water_index=None,
            )

        # -----------------------------------------------------------------
        # 2. Paddy Rice Isolation (Lowland / Flooding vs Upland)
        # -----------------------------------------------------------------
        if profile.is_paddy:
            return IrrigationAdvisoryOutput(
                selected_crop=profile.canonical_name,
                assessment_status="paddy_special_handling",
                software_status="paddy_special_handling",
                agronomic_approval_status="draft_unvalidated",
                is_production_approved=False,
                urgency_category=None,
                urgency_score=None,
                explanation=(
                    f"{profile.canonical_name} is cultivated under lowland flooded/paddy conditions. "
                    "Upland root-zone soil water depletion rules are not agronomically valid for paddy rice. "
                    "Advisory: Maintain 3–5 cm standing water layer during vegetative/reproductive phases, "
                    "or monitor water depth using a perforated field water tube ('pani pipe') "
                    "for Alternate Wetting and Drying (AWD). Suspend irrigation when field ponding depth is sufficient."
                ),
                activated_rule_ids=[],
                rule_version=RULE_VERSION,
                warnings=[
                    (
                        "Paddy rice uses specialized flooded/AWD water regimes. "
                        "Standard upland root-zone depletion Mamdani rules are excluded to prevent crop damage."
                    ),
                    "Exact water depth requires direct field water tube measurement, not upland tensiometers.",
                    "Numeric ponding guidance is in demonstration status pending localized irrigation scheme verification.",
                ],
                requires_agronomic_verification=True,
                urgency_level="Paddy Special Handling",
                advisory_summary=f"{profile.canonical_name} requires ponding/AWD water management.",
                fuzzy_water_index=None,
            )

        # -----------------------------------------------------------------
        # 3. Production Approval Guardrail (Separation of Software & Approval)
        # -----------------------------------------------------------------
        if not input_data.academic_demo_mode and RULE_VALIDATION_STATUS == "draft_unvalidated":
            return IrrigationAdvisoryOutput(
                selected_crop=profile.canonical_name,
                assessment_status="unapproved_rule_base",
                software_status="unapproved_rule_base",
                agronomic_approval_status="draft_unvalidated",
                is_production_approved=False,
                urgency_category=None,
                urgency_score=None,
                explanation=(
                    "Rule base v0.1-draft-scaffold is an unvalidated engineering prototype and cannot produce "
                    "operational irrigation guidance in production mode outside academic demonstration."
                ),
                activated_rule_ids=[],
                rule_version=RULE_VERSION,
                warnings=[
                    "Production irrigation guidance is blocked: rule base requires formal agronomic approval and calibration.",
                    "To evaluate simulation scenarios, enable academic_demo_mode.",
                ],
                requires_agronomic_verification=True,
                urgency_level="Unapproved Rule Base",
                advisory_summary="Rule base is pending agronomic approval for production use.",
                fuzzy_water_index=None,
            )

        # -----------------------------------------------------------------
        # 4. Input Sufficiency & Sensor Calibration Verification
        # -----------------------------------------------------------------
        has_derived = (
            input_data.soil_water_depletion is not None
            and input_data.atmospheric_demand is not None
            and input_data.effective_rainfall is not None
        )

        has_raw = (
            input_data.soil_moisture is not None
            and input_data.ambient_temperature is not None
            and input_data.relative_humidity is not None
            and input_data.rainfall_forecast_24h is not None
        )

        if not has_derived and not has_raw:
            return IrrigationAdvisoryOutput(
                selected_crop=profile.canonical_name,
                assessment_status="insufficient_data",
                software_status="insufficient_data",
                agronomic_approval_status="draft_unvalidated",
                is_production_approved=False,
                urgency_category=None,
                urgency_score=None,
                explanation=(
                    "Insufficient input data for irrigation evaluation. "
                    "Requires either direct derived fuzzy metrics (soil_water_depletion relative to RAW, atmospheric_demand, "
                    "effective_rainfall) or complete weather and soil sensor telemetry."
                ),
                activated_rule_ids=[],
                rule_version=RULE_VERSION,
                warnings=[
                    "Evaluation aborted due to missing observation metrics.",
                    "Do not infer root-zone depletion from incomplete sensor telemetry.",
                ],
                requires_agronomic_verification=True,
                urgency_level="Insufficient Data",
                advisory_summary="Insufficient telemetry to evaluate irrigation.",
                fuzzy_water_index=None,
            )

        depletion: float
        demand: float
        rainfall: float
        runtime_warnings: list[str] = []

        if has_derived:
            depletion = input_data.soil_water_depletion  # type: ignore[assignment]
            demand = input_data.atmospheric_demand  # type: ignore[assignment]
            rainfall = input_data.effective_rainfall  # type: ignore[assignment]
        else:
            # Derived from raw sensor readings
            if input_data.sensor_calibrated and input_data.field_capacity and input_data.wilting_point:
                # Calibrated soil water depletion relative to Readily Available Water (RAW = p * TAW)
                fc = input_data.field_capacity
                wp = input_data.wilting_point
                sm = input_data.soil_moisture  # type: ignore[assignment]
                p = profile.fao56_depletion_fraction_p or 0.55
                taw = fc - wp
                taw = max(0.01, taw)
                raw = p * taw
                depletion_vol = max(0.0, fc - sm)
                depletion = max(0.0, min(100.0, (depletion_vol / raw) * 100.0))

                # Atmospheric demand proxy (demonstration only)
                demand = max(
                    0.0,
                    min(
                        100.0,
                        (input_data.ambient_temperature * 1.5)  # type: ignore[operator]
                        + ((100.0 - input_data.relative_humidity) * 0.5),  # type: ignore[operator]
                    ),
                )
                rainfall = max(0.0, min(50.0, input_data.rainfall_forecast_24h * 0.8))  # type: ignore[operator]
            else:
                if not input_data.academic_demo_mode:
                    return IrrigationAdvisoryOutput(
                        selected_crop=profile.canonical_name,
                        assessment_status="insufficient_data",
                        software_status="insufficient_data",
                        agronomic_approval_status="draft_unvalidated",
                        is_production_approved=False,
                        urgency_category=None,
                        urgency_score=None,
                        explanation=(
                            "Uncalibrated sensor telemetry cannot be processed in production mode. "
                            "Soil field capacity and permanent wilting point parameters are required."
                        ),
                        activated_rule_ids=[],
                        rule_version=RULE_VERSION,
                        warnings=[
                            "Sensor calibration missing: field_capacity and wilting_point required."
                        ],
                        requires_agronomic_verification=True,
                        urgency_level="Insufficient Data",
                        advisory_summary="Sensor calibration missing.",
                        fuzzy_water_index=None,
                    )

                # Academic demo simulation approximation
                sm = input_data.soil_moisture  # type: ignore[assignment]
                depletion = max(0.0, min(100.0, 100.0 - sm))
                demand = max(
                    0.0,
                    min(
                        100.0,
                        (input_data.ambient_temperature * 1.5)  # type: ignore[operator]
                        + ((100.0 - input_data.relative_humidity) * 0.5),  # type: ignore[operator]
                    ),
                )
                rainfall = max(0.0, min(50.0, input_data.rainfall_forecast_24h * 0.8))  # type: ignore[operator]

                runtime_warnings.append(
                    "Root-zone depletion calculated from uncalibrated sensor readings is an unverified "
                    "simulation approximation. Real-world soil water requires field capacity, permanent "
                    "wilting point, and RAW calibration."
                )
                runtime_warnings.append(
                    "Atmospheric demand and effective rainfall are uncalibrated proxies in academic demo mode."
                )

        # -----------------------------------------------------------------
        # 5. Mamdani Fuzzy Inference Engine Evaluation
        # -----------------------------------------------------------------
        eval_result = self.engine.evaluate(
            soil_water_depletion=depletion,
            atmospheric_demand=demand,
            effective_rainfall=rainfall,
        )

        all_warnings = runtime_warnings + eval_result.warnings
        all_warnings.append(
            "Agronomic disclaimer: Rule base v0.1-draft-scaffold is an engineering prototype. "
            "Field decisions must be validated by localized agronomic trials."
        )

        ts = input_data.measurement_timestamp or datetime.now(timezone.utc).isoformat()

        if eval_result.assessment_status == "unavailable":
            # Zero-activation fallback safety
            explanation = (
                f"Advisory for {profile.canonical_name} is unavailable: inputs fell outside responsive fuzzy partitions. "
                "Zero rule activation must never be interpreted as no irrigation required."
            )
            return IrrigationAdvisoryOutput(
                selected_crop=profile.canonical_name,
                assessment_status="unavailable",
                software_status="unavailable",
                agronomic_approval_status="draft_unvalidated",
                is_production_approved=False,
                urgency_category=None,
                urgency_score=None,
                explanation=explanation,
                activated_rule_ids=[],
                rule_version=eval_result.rule_version,
                input_measurement_timestamps={"evaluated_at": ts},
                warnings=all_warnings,
                requires_agronomic_verification=True,
                urgency_level="Unavailable",
                advisory_summary=explanation,
                fuzzy_water_index=None,
            )

        explanation = self._build_explanation(
            crop_name=profile.canonical_name,
            depletion=depletion,
            demand=demand,
            rainfall=rainfall,
            eval_result=eval_result,
        )

        return IrrigationAdvisoryOutput(
            selected_crop=profile.canonical_name,
            assessment_status=eval_result.assessment_status,
            software_status=eval_result.software_status,
            agronomic_approval_status="draft_unvalidated",
            is_production_approved=False,
            urgency_category=eval_result.urgency_category,
            urgency_score=eval_result.urgency_score,
            explanation=explanation,
            activated_rule_ids=eval_result.activated_rule_ids,
            rule_version=eval_result.rule_version,
            input_measurement_timestamps={"evaluated_at": ts},
            warnings=all_warnings,
            requires_agronomic_verification=True,
            urgency_level=eval_result.urgency_category or "Pending",
            advisory_summary=explanation,
            fuzzy_water_index=round(eval_result.urgency_score / 100.0, 4) if eval_result.urgency_score is not None else None,
        )

    def _build_explanation(
        self,
        crop_name: str,
        depletion: float,
        demand: float,
        rainfall: float,
        eval_result: Any,
    ) -> str:
        """Compose clear agronomic narrative from rule activations and inputs."""
        fired_count = len(eval_result.activated_rule_ids)
        category = eval_result.urgency_category
        score = eval_result.urgency_score
        score_str = f"{score:.1f}/100" if score is not None else "N/A"

        narrative = (
            f"Advisory for {crop_name}: Condition evaluated as '{category}' "
            f"with an internal urgency decision score of {score_str}. "
            f"Evaluated inputs: Root-zone depletion relative to RAW={depletion:.1f}%, "
            f"Atmospheric demand index={demand:.1f}, Effective rainfall={rainfall:.1f} mm. "
            f"Fuzzy inference fired {fired_count} rule(s) [{', '.join(eval_result.activated_rule_ids[:4])}"
            f"{'...' if fired_count > 4 else ''}]. "
            "Decision index reflects priority ranking, not an application volume in litres or millimetres."
        )
        return narrative


irrigation_service = IrrigationAdvisoryService()
