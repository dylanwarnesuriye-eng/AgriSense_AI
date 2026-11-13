"""API endpoints for Irrigation Advisory (Mamdani Fuzzy Logic)."""
from fastapi import APIRouter

from app.modules.irrigation_advisory import (
    CROP_PROFILES,
    MAMDANI_RULES,
    RULE_VALIDATION_STATUS,
    RULE_VERSION,
    IrrigationAdvisoryInput,
    IrrigationAdvisoryOutput,
    RuleBaseStatusResponse,
    RuleDefinitionDTO,
    SupportedCropDTO,
    detect_rule_conflicts,
    irrigation_service,
    verify_rule_coverage,
)
from app.schemas.common import BaseResponse

router = APIRouter()


@router.post(
    "/evaluate",
    response_model=BaseResponse[IrrigationAdvisoryOutput],
    summary="Evaluate irrigation urgency using Mamdani fuzzy inference",
)
async def evaluate_irrigation(payload: IrrigationAdvisoryInput):
    """Run Mamdani fuzzy inference on soil-water depletion, atmospheric demand, and effective rainfall.

    Accepts directly derived fuzzy metrics or raw field telemetry with calibration disclaimers.
    Isolates paddy rice with dedicated standing-water advisory.
    """
    advisory = irrigation_service.generate_advisory(payload)
    return BaseResponse(
        data=advisory,
        message="Irrigation advisory evaluated successfully.",
    )


@router.get(
    "/rules",
    response_model=BaseResponse[RuleBaseStatusResponse],
    summary="Inspect 36-rule base configuration and coverage",
)
async def get_rule_base_status():
    """Return configured Mamdani rules along with coverage verification and conflict detection."""
    coverage = verify_rule_coverage(MAMDANI_RULES)
    conflicts = detect_rule_conflicts(MAMDANI_RULES)

    rule_dtos = [
        RuleDefinitionDTO(
            id=r.id,
            depletion=r.depletion,
            demand=r.demand,
            rainfall=r.rainfall,
            consequent=r.consequent,
            weight=r.weight,
        )
        for r in MAMDANI_RULES
    ]

    status_data = RuleBaseStatusResponse(
        rule_version=RULE_VERSION,
        validation_status=RULE_VALIDATION_STATUS,
        total_rules=len(MAMDANI_RULES),
        is_complete=bool(coverage["is_complete"]),
        coverage_ratio=float(coverage["coverage_ratio"]),  # type: ignore[arg-type]
        conflicts_detected=conflicts,
        rules=rule_dtos,
    )

    return BaseResponse(
        data=status_data,
        message="Rule base status retrieved successfully.",
    )


@router.get(
    "/crops",
    response_model=BaseResponse[list[SupportedCropDTO]],
    summary="List supported crop profiles and irrigation routing types",
)
async def list_supported_crops():
    """Return all registered crop profiles, distinguishing upland depletion from paddy rice."""
    crop_list = [
        SupportedCropDTO(
            canonical_name=profile.canonical_name,
            is_paddy=profile.is_paddy,
            status=profile.status,
            routing_type="Lowland Ponding / AWD" if profile.is_paddy else "Upland Root-Zone Depletion",
            indicative_root_depth_cm=profile.indicative_root_depth_cm,
            notes=profile.advisory_notes,
        )
        for profile in CROP_PROFILES.values()
    ]
    return BaseResponse(
        data=crop_list,
        message="Supported crops retrieved successfully.",
    )
