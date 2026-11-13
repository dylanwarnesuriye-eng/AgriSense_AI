import copy
import logging
import time
import uuid

from fastapi import HTTPException, status

from app.modules.assessment_orchestrator.schemas import (
    ComponentResult,
    CropPathwayCompatibility,
    FertilizerSubsystemInput,
    IrrigationSubsystemInput,
    OverallAssessmentStatus,
    StageARequest,
    StageAResponse,
    StageBRequest,
    StageBResponse,
    SubsystemStatus,
    YieldSubsystemInput,
)
from app.modules.crop_recommendation import (
    SUPPORTED_RECOMMENDATION_CROPS,
    CropRecommendationInput,
    crop_service,
)
from app.modules.fertilizer_advisory import (
    FERTILIZER_RULES,
    FertilizerAdvisoryInput,
    FertilizerAdvisoryOutput,
    fertilizer_service,
)
from app.modules.irrigation_advisory import (
    CROP_PROFILES,
    IrrigationAdvisoryInput,
    IrrigationAdvisoryOutput,
    irrigation_service,
)
from app.modules.yield_prediction import (
    SUPPORTED_CROP_NAMES_TITLE,
    YieldPredictionInput,
    YieldPredictionOutput,
    yield_service,
)
from app.services.firestore_repo import firestore_repo

logger = logging.getLogger(__name__)

# Temporary store for Stage A runs so Stage B can reference them
_STAGE_A_CACHE: dict[str, StageAResponse] = {}

# Short-lived cache for Stage B idempotency (avoids duplicate executions within 5s window)
_STAGE_B_IDEMPOTENCY_CACHE: dict[str, tuple[float, StageBResponse]] = {}


def clear_orchestrator_caches() -> None:
    """Clear in-memory orchestrator caches."""
    _STAGE_A_CACHE.clear()
    _STAGE_B_IDEMPOTENCY_CACHE.clear()


class AssessmentOrchestrator:
    """Coordinates crop recommendation, irrigation advisory, fertilizer advisory, and yield prediction."""

    # -------------------------------------------------------------------------
    # STAGE A: RECOMMENDATION
    # -------------------------------------------------------------------------
    def execute_stage_a(self, request: StageARequest) -> StageAResponse:
        """Run Stage A Decision Tree crop recommendation.

        Returns candidate crop with requires_confirmation=True.
        INVARIANT: Does not treat candidate crop as confirmed without farmer action.
        """
        crop_input = CropRecommendationInput(
            nitrogen=request.nitrogen,
            phosphorus=request.phosphorus,
            potassium=request.potassium,
            temperature=request.temperature,
            humidity=request.humidity,
            ph=request.ph,
            rainfall=request.rainfall,
            academic_demo_mode=request.academic_demo_mode,
        )

        model_output = crop_service.predict(crop_input)
        confidence_val = model_output.confidence if model_output.confidence is not None else 1.0
        alt_crops = [{"crop": c} for c in (model_output.available_crops[:3] if getattr(model_output, "available_crops", None) else [])]

        response = StageAResponse(
            stage_a_id=f"stg_a_{uuid.uuid4().hex[:10]}",
            recommended_crop=model_output.recommended_crop,
            confidence_score=confidence_val,
            alternative_crops=alt_crops,
            requires_confirmation=True,
            validation_warnings=model_output.warnings,
            model_version="crop_decision_tree_v1.0",
            input_snapshot={
                "nitrogen": request.nitrogen,
                "phosphorus": request.phosphorus,
                "potassium": request.potassium,
                "temperature": request.temperature,
                "humidity": request.humidity,
                "ph": request.ph,
                "rainfall": request.rainfall,
            },
        )

        _STAGE_A_CACHE[response.stage_a_id] = copy.deepcopy(response)
        return response

    # -------------------------------------------------------------------------
    # STAGE B: MULTI-MODULE EVALUATION
    # -------------------------------------------------------------------------
    def execute_stage_b(self, request: StageBRequest, owner_uid: str) -> StageBResponse:
        """Run Stage B evaluation across eligible AI subsystems with independent failure isolation.

        Requires farmer to have confirmed a crop.
        Enforces farm ownership and idempotency.
        """
        # 1. Enforce Farm Ownership if farm_id is specified
        if request.farm_id:
            farm = firestore_repo.get_farm(request.farm_id, owner_uid=owner_uid)
            if not farm:
                any_farm = firestore_repo.get_farm(request.farm_id)
                if any_farm and any_farm.get("owner_uid") != owner_uid:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Access denied: You do not own or have access to farm '{request.farm_id}'.",
                    )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Farm '{request.farm_id}' was not found.",
                )

        confirmed_crop = request.confirmed_crop.strip()
        pathway_compat = self._resolve_pathway_compatibility(confirmed_crop)

        # 2. Prevent duplicate submissions via idempotency cache (5s window)
        idempotency_key = (
            f"{owner_uid}:{request.farm_id}:{request.field_id}:{confirmed_crop}:"
            f"{request.stage_a_id}:{hash(str(request.model_dump()))}"
        )
        now_ts = time.time()
        cached = _STAGE_B_IDEMPOTENCY_CACHE.get(idempotency_key)
        if cached:
            cached_time, cached_response = cached
            if (now_ts - cached_time) < 5.0:
                logger.info(f"Duplicate Stage B submission intercepted for key {idempotency_key}. Returning cached response.")
                return copy.deepcopy(cached_response)

        # Check if confirmed crop originated from Stage A
        is_from_stage_a = False
        stage_a_record = _STAGE_A_CACHE.get(request.stage_a_id) if request.stage_a_id else None
        if stage_a_record and stage_a_record.recommended_crop.lower() == confirmed_crop.lower():
            is_from_stage_a = True

        warnings: list[str] = []
        if request.academic_demo_mode:
            warnings.append(
                "ACADEMIC DEMONSTRATION MODE ACTIVE: Results contain simulated calculations "
                "and must not be interpreted as certified agronomic guidance."
            )

        # 3. Independent Irrigation Assessment
        irrigation_result = self._dispatch_irrigation(
            confirmed_crop=confirmed_crop,
            irr_input=request.irrigation_input,
            demo_mode=request.academic_demo_mode,
        )

        # 4. Independent Fertilizer Assessment
        fertilizer_result = self._dispatch_fertilizer(
            confirmed_crop=confirmed_crop,
            fert_input=request.fertilizer_input,
            demo_mode=request.academic_demo_mode,
        )

        # 5. Independent Yield Assessment
        yield_result = self._dispatch_yield(
            confirmed_crop=confirmed_crop,
            pathway_compat=pathway_compat,
            yield_input=request.yield_input,
        )

        # Compute aggregate assessment status
        statuses = [irrigation_result.status, fertilizer_result.status, yield_result.status]
        if all(s in (SubsystemStatus.EVALUATED, SubsystemStatus.UNAPPROVED_RULE_BASE) for s in statuses):
            overall_status = OverallAssessmentStatus.COMPLETE
        elif any(s in (SubsystemStatus.EVALUATED, SubsystemStatus.UNAPPROVED_RULE_BASE) for s in statuses):
            overall_status = OverallAssessmentStatus.PARTIAL
        else:
            overall_status = OverallAssessmentStatus.ACTION_BLOCKED

        response = StageBResponse(
            assessment_id=f"asmt_{uuid.uuid4().hex[:10]}",
            owner_uid=owner_uid,
            farm_id=request.farm_id,
            field_id=request.field_id,
            stage_a_id=request.stage_a_id,
            farmer_confirmed_crop=confirmed_crop,
            is_crop_from_recommendation=is_from_stage_a,
            crop_pathway_compatibility=pathway_compat,
            irrigation_result=irrigation_result,
            fertilizer_result=fertilizer_result,
            yield_result=yield_result,
            overall_status=overall_status,
            academic_demo_mode=request.academic_demo_mode,
            warnings=warnings,
            model_versions={
                "crop_recommendation": "crop_decision_tree_v1.0",
                "irrigation_advisory": irrigation_result.model_or_rule_version,
                "fertilizer_advisory": fertilizer_result.model_or_rule_version,
                "yield_prediction": yield_result.model_or_rule_version,
            },
        )

        # 6. Persist assessment snapshot to Firestore with transparent audit status
        try:
            saved = firestore_repo.save_assessment(response.model_dump())
            backend = saved.get("_storage_backend", "firestore")
            response.persistence_status = {
                "persisted": True,
                "storage_backend": backend,
            }
        except Exception as e:  # noqa: BLE001
            logger.error(f"Failed to persist assessment {response.assessment_id}: {e}")
            response.persistence_status = {
                "persisted": False,
                "storage_backend": "none",
                "error": str(e),
            }
            response.warnings.append(f"Persistence notice: Remote assessment audit record could not be saved to Firestore ({e!s}).")

        # Record in idempotency cache
        _STAGE_B_IDEMPOTENCY_CACHE[idempotency_key] = (now_ts, copy.deepcopy(response))
        return response

    # -------------------------------------------------------------------------
    # Subsystem Dispatchers with Independent Failure Isolation
    # -------------------------------------------------------------------------
    def _dispatch_irrigation(
        self,
        confirmed_crop: str,
        irr_input: IrrigationSubsystemInput | None,
        demo_mode: bool,
    ) -> ComponentResult[IrrigationAdvisoryOutput]:
        """Execute Irrigation Advisory in total isolation."""
        version = "fuzzy_irrigation_v1.0"
        try:
            if irr_input is None:
                return ComponentResult[IrrigationAdvisoryOutput](
                    status=SubsystemStatus.INSUFFICIENT_DATA,
                    data=None,
                    error_message="Irrigation input parameters were not provided.",
                    model_or_rule_version=version,
                    is_production_approved=False,
                    warnings=["No soil moisture or water depletion data supplied."],
                )

            payload = IrrigationAdvisoryInput(
                crop_type=confirmed_crop,
                soil_water_depletion=irr_input.soil_water_depletion,
                atmospheric_demand=irr_input.atmospheric_demand,
                effective_rainfall=irr_input.effective_rainfall,
                soil_moisture=irr_input.raw_soil_moisture_pct,
                field_capacity=irr_input.field_capacity_pct,
                wilting_point=irr_input.wilting_point_pct,
                crop_growth_stage=irr_input.crop_stage or "mid_season",
                academic_demo_mode=demo_mode,
            )

            output = irrigation_service.generate_advisory(payload)

            # Safeguard: Draft rules in production mode
            if not demo_mode and output.agronomic_approval_status == "draft_unvalidated":
                return ComponentResult[IrrigationAdvisoryOutput](
                    status=SubsystemStatus.UNAPPROVED_RULE_BASE,
                    data=output,
                    error_message=None,
                    model_or_rule_version=version,
                    is_production_approved=False,
                    warnings=output.warnings + [
                        "DRAFT IRRIGATION RULES: Urgency scores are suppressed in production mode."
                    ],
                )

            if output.software_status == "paddy_special_handling":
                return ComponentResult[IrrigationAdvisoryOutput](
                    status=SubsystemStatus.EVALUATED,
                    data=output,
                    model_or_rule_version=version,
                    is_production_approved=output.is_production_approved,
                    warnings=output.warnings,
                )

            if output.software_status in ("insufficient_data", "unavailable"):
                return ComponentResult[IrrigationAdvisoryOutput](
                    status=SubsystemStatus.INSUFFICIENT_DATA,
                    data=output,
                    error_message=output.urgency_category or "Data insufficient for fuzzy inference",
                    model_or_rule_version=version,
                    is_production_approved=False,
                    warnings=output.warnings,
                )

            if output.software_status == "unsupported_crop":
                return ComponentResult[IrrigationAdvisoryOutput](
                    status=SubsystemStatus.UNSUPPORTED_CROP,
                    data=output,
                    error_message=f"Crop '{confirmed_crop}' lacks an irrigation profile.",
                    model_or_rule_version=version,
                    is_production_approved=False,
                    warnings=output.warnings,
                )

            return ComponentResult[IrrigationAdvisoryOutput](
                status=SubsystemStatus.EVALUATED,
                data=output,
                model_or_rule_version=version,
                is_production_approved=output.is_production_approved,
                warnings=output.warnings,
            )
        except Exception as e:
            logger.exception(f"Irrigation component failed for crop '{confirmed_crop}'")
            return ComponentResult[IrrigationAdvisoryOutput](
                status=SubsystemStatus.ERROR,
                data=None,
                error_message=f"Irrigation advisory engine error: {e!s}",
                model_or_rule_version=version,
                is_production_approved=False,
                warnings=["Subsystem encountered an internal error."],
            )

    def _dispatch_fertilizer(
        self,
        confirmed_crop: str,
        fert_input: FertilizerSubsystemInput | None,
        demo_mode: bool,
    ) -> ComponentResult[FertilizerAdvisoryOutput]:
        """Execute Fertilizer Advisory in total isolation."""
        version = "kb_fertilizer_v0.1_draft"
        try:
            if fert_input is None:
                return ComponentResult[FertilizerAdvisoryOutput](
                    status=SubsystemStatus.INSUFFICIENT_DATA,
                    data=None,
                    error_message="Fertilizer input parameters were not provided.",
                    model_or_rule_version=version,
                    is_production_approved=False,
                    warnings=["No soil test or nutrient facts supplied."],
                )

            n_val = fert_input.nitrogen
            if n_val is None and fert_input.nitrogen_status:
                status_map = {"Deficient": 0.08, "Moderate": 0.15, "Sufficient": 0.25}
                n_val = status_map.get(fert_input.nitrogen_status)

            p_val = fert_input.phosphorus
            if p_val is None and fert_input.phosphorus_status:
                status_map = {"Deficient": 10.0, "Moderate": 20.0, "Sufficient": 35.0}
                p_val = status_map.get(fert_input.phosphorus_status)

            k_val = fert_input.potassium
            if k_val is None and fert_input.potassium_status:
                status_map = {"Deficient": 80.0, "Moderate": 150.0, "Sufficient": 220.0}
                k_val = status_map.get(fert_input.potassium_status)

            payload = FertilizerAdvisoryInput(
                crop_name=confirmed_crop,
                soil_test_method=fert_input.soil_test_method or "Standard",
                nitrogen=n_val,
                phosphorus=p_val,
                potassium=k_val,
                ph=fert_input.ph,
                region=fert_input.region,
                cultivation_method=fert_input.cultivation_condition or "standard",
                crop_growth_stage=fert_input.growth_stage or "basal",
                field_area_hectares=fert_input.field_area_hectares,
                previous_applications=fert_input.previous_applications,
                academic_demo_mode=demo_mode,
            )

            output = fertilizer_service.generate_advisory(payload)

            # Safeguard: Verify fertilizer approval in production
            if not demo_mode and output.assessment_status == "unapproved_rule_base":
                return ComponentResult[FertilizerAdvisoryOutput](
                    status=SubsystemStatus.UNAPPROVED_RULE_BASE,
                    data=output,
                    error_message=None,
                    model_or_rule_version=version,
                    is_production_approved=False,
                    warnings=output.warnings + [
                        "DRAFT FERTILIZER RULES: Application rates and product dosages are masked in production mode."
                    ],
                )

            if output.assessment_status == "insufficient_data":
                return ComponentResult[FertilizerAdvisoryOutput](
                    status=SubsystemStatus.INSUFFICIENT_DATA,
                    data=output,
                    error_message="Insufficient soil facts to activate fertilizer rules.",
                    model_or_rule_version=version,
                    is_production_approved=False,
                    warnings=output.warnings,
                )

            if output.assessment_status == "unsupported_crop":
                return ComponentResult[FertilizerAdvisoryOutput](
                    status=SubsystemStatus.UNSUPPORTED_CROP,
                    data=output,
                    error_message=f"Crop '{confirmed_crop}' has no validated fertilizer rules.",
                    model_or_rule_version=version,
                    is_production_approved=False,
                    warnings=output.warnings,
                )

            return ComponentResult[FertilizerAdvisoryOutput](
                status=SubsystemStatus.EVALUATED,
                data=output,
                model_or_rule_version=version,
                is_production_approved=output.is_production_approved,
                warnings=output.warnings,
            )
        except Exception as e:
            logger.exception(f"Fertilizer component failed for crop '{confirmed_crop}'")
            return ComponentResult[FertilizerAdvisoryOutput](
                status=SubsystemStatus.ERROR,
                data=None,
                error_message=f"Fertilizer advisory engine error: {e!s}",
                model_or_rule_version=version,
                is_production_approved=False,
                warnings=["Subsystem encountered an internal error."],
            )

    def _dispatch_yield(
        self,
        confirmed_crop: str,
        pathway_compat: CropPathwayCompatibility,
        yield_input: YieldSubsystemInput | None,
    ) -> ComponentResult[YieldPredictionOutput]:
        """Execute Yield Prediction in total isolation with crop whitelist enforcement."""
        version = "yield_regressor_v1.0"
        try:
            # INVARIANT: If crop is not in 5-crop whitelist, refuse prediction
            if not pathway_compat.yield_supported or not pathway_compat.yield_canonical_crop:
                return ComponentResult[YieldPredictionOutput](
                    status=SubsystemStatus.UNSUPPORTED_CROP,
                    data=None,
                    error_message=(
                        f"Crop '{confirmed_crop}' is not supported for yield regression. "
                        "Supported crops are strictly restricted to Wheat, Barley, Corn, Rice, and Soybean."
                    ),
                    model_or_rule_version=version,
                    is_production_approved=False,
                    warnings=["No fabricated yield prediction is provided for unsupported crops."],
                )

            if yield_input is None:
                return ComponentResult[YieldPredictionOutput](
                    status=SubsystemStatus.INSUFFICIENT_DATA,
                    data=None,
                    error_message="Yield prediction input block was not provided.",
                    model_or_rule_version=version,
                    is_production_approved=False,
                    warnings=["Field area and agronomic inputs are required for yield estimation."],
                )

            # Build YieldPredictionInput
            canonical_crop = pathway_compat.yield_canonical_crop
            payload = YieldPredictionInput(
                crop_name=canonical_crop,
                region=yield_input.region or "Central",
                season="Spring",
                area_hectares=yield_input.field_area_ha if yield_input.field_area_ha is not None else 1.0,
                prediction_mode="prospective" if yield_input.is_prospective_planning else "full_season",
                avg_temperature=yield_input.temperature_celsius if yield_input.temperature_celsius is not None else 22.0,
                total_rainfall=yield_input.rainfall_mm if yield_input.rainfall_mm is not None else 650.0,
                fertilizer_amount=yield_input.fertilizer_applied_kg_ha,
                pesticide_usage=yield_input.pesticide_applied_kg_ha,
                academic_demo_mode=True,
            )

            output = yield_service.predict(payload)

            return ComponentResult[YieldPredictionOutput](
                status=SubsystemStatus.EVALUATED,
                data=output,
                model_or_rule_version=version,
                is_production_approved=True,
                warnings=output.warnings,
            )
        except Exception as e:
            logger.exception(f"Yield component failed for crop '{confirmed_crop}'")
            return ComponentResult[YieldPredictionOutput](
                status=SubsystemStatus.ERROR,
                data=None,
                error_message=f"Yield prediction model error: {e!s}",
                model_or_rule_version=version,
                is_production_approved=False,
                warnings=["Subsystem encountered an internal error."],
            )

    # -------------------------------------------------------------------------
    # Pathway Compatibility Resolver
    # -------------------------------------------------------------------------
    def _resolve_pathway_compatibility(self, crop_name: str) -> CropPathwayCompatibility:
        """Resolve compatibility across all 4 AI subsystems without fabricating mappings."""
        c_clean = crop_name.strip()
        c_lower = c_clean.lower()

        # 1. Recommendation support check
        rec_supported = any(c_lower == r.lower() for r in SUPPORTED_RECOMMENDATION_CROPS)

        # 2. Irrigation support check
        irr_supported = any(c_lower == p.canonical_name.lower() for p in CROP_PROFILES.values())

        # 3. Fertilizer support check
        fert_supported = any(c_lower == r.crop.lower() for r in FERTILIZER_RULES)

        # 4. Yield support check & mapping
        yield_supported = False
        canonical_yield_crop = None
        pathway_type = "advisory_only"
        notes = ""

        if c_lower in ("rice", "paddy", "paddy rice"):
            yield_supported = True
            canonical_yield_crop = "Rice"
            pathway_type = "integrated"
            notes = "Integrated pathway: recommendation 'rice' maps to regression 'Rice'."
        elif c_lower in ("maize", "corn"):
            yield_supported = True
            canonical_yield_crop = "Corn"
            pathway_type = "integrated"
            notes = "Integrated pathway: recommendation 'maize' maps to regression 'Corn'."
        elif c_clean in SUPPORTED_CROP_NAMES_TITLE or c_lower in ("wheat", "barley", "soybean"):
            yield_supported = True
            canonical_yield_crop = c_clean.capitalize()
            pathway_type = "standalone_yield"
            notes = f"Standalone yield support: '{canonical_yield_crop}' is available for direct regression."
        else:
            yield_supported = False
            canonical_yield_crop = None
            pathway_type = "advisory_only"
            notes = f"Crop '{crop_name}' is not in the 5-crop yield dataset (Rice, Corn, Wheat, Barley, Soybean)."

        return CropPathwayCompatibility(
            recommendation_supported=rec_supported,
            irrigation_supported=irr_supported,
            fertilizer_supported=fert_supported,
            yield_supported=yield_supported,
            pathway_type=pathway_type,
            yield_canonical_crop=canonical_yield_crop,
            notes=notes,
        )


orchestrator = AssessmentOrchestrator()
