"""Schemas for Assessment Orchestrator: Two-Stage Coordination Across All 4 AI Subsystems."""
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field, model_validator

from app.modules.fertilizer_advisory.schemas import FertilizerAdvisoryOutput
from app.modules.irrigation_advisory.schemas import IrrigationAdvisoryOutput
from app.modules.yield_prediction.schemas import YieldPredictionOutput

T = TypeVar("T")


class SubsystemStatus(str, Enum):
    EVALUATED = "evaluated"
    INSUFFICIENT_DATA = "insufficient_data"
    UNSUPPORTED_CROP = "unsupported_crop"
    UNAPPROVED_RULE_BASE = "unapproved_rule_base"
    UNVERIFIED_UNITS = "unverified_units"
    ERROR = "error"
    SKIPPED = "skipped"


class OverallAssessmentStatus(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    ACTION_BLOCKED = "action_blocked"


class ComponentResult(BaseModel, Generic[T]):
    """Self-contained result container for an isolated AI subsystem."""

    status: SubsystemStatus = Field(..., description="Evaluation status of component")
    data: T | None = Field(default=None, description="Typed output payload if evaluation succeeded")
    error_message: str | None = Field(default=None, description="Diagnostic error details if failed")
    model_or_rule_version: str = Field(..., description="Version of model or expert rule base")
    is_production_approved: bool = Field(default=False, description="Whether output is production-approved")
    warnings: list[str] = Field(default_factory=list, description="Agronomic caveats and warnings")


# =============================================================================
# STAGE A: CROP RECOMMENDATION SCHEMAS
# =============================================================================

class StageARequest(BaseModel):
    """Input payload for Stage A: Decision Tree Crop Recommendation."""

    farm_id: str | None = Field(default=None, description="Optional farm reference")
    field_id: str | None = Field(default=None, description="Optional field reference")
    nitrogen: float = Field(..., ge=0.0, le=140.0, description="Available soil nitrogen (N)")
    phosphorus: float = Field(..., ge=5.0, le=145.0, description="Available soil phosphorus (P)")
    potassium: float = Field(..., ge=5.0, le=205.0, description="Available soil potassium (K)")
    temperature: float = Field(..., ge=8.0, le=45.0, description="Temperature in degrees Celsius")
    humidity: float = Field(..., ge=14.0, le=100.0, description="Relative humidity percentage")
    ph: float = Field(..., ge=3.5, le=10.0, description="Soil pH level")
    rainfall: float = Field(..., ge=20.0, le=300.0, description="Annual/seasonal rainfall in mm")
    academic_demo_mode: bool = Field(default=False, description="Enable simulated academic research mode")


class StageAResponse(BaseModel):
    """Output payload for Stage A Crop Recommendation."""

    stage_a_id: str = Field(
        default_factory=lambda: f"stg_a_{uuid.uuid4().hex[:10]}",
        description="Unique identifier for Stage A recommendation snapshot",
    )
    recommended_crop: str = Field(..., description="Crop suggested by Decision Tree")
    confidence_score: float = Field(..., description="Estimated probability/confidence")
    alternative_crops: list[dict[str, Any]] = Field(default_factory=list, description="Top alternatives")
    requires_confirmation: bool = Field(
        default=True,
        description="INVARIANT: Farmer must confirm or override crop before Stage B execution.",
    )
    validation_warnings: list[str] = Field(default_factory=list)
    model_version: str = Field(default="crop_decision_tree_v1.0")
    input_snapshot: dict[str, float] = Field(..., description="Preserved input features")


# =============================================================================
# STAGE B: MULTI-MODULE EVALUATION SCHEMAS
# =============================================================================

class IrrigationSubsystemInput(BaseModel):
    """Optional inputs for Mamdani Fuzzy Irrigation Advisory."""

    soil_water_depletion: float | None = Field(default=None, ge=0.0, le=100.0)
    atmospheric_demand: float | None = Field(default=None, ge=0.0, le=100.0)
    effective_rainfall: float | None = Field(default=None, ge=0.0, le=100.0)
    raw_soil_moisture_pct: float | None = Field(default=None, ge=0.0, le=100.0)
    field_capacity_pct: float | None = Field(default=None, ge=0.0, le=100.0)
    wilting_point_pct: float | None = Field(default=None, ge=0.0, le=100.0)
    crop_stage: str | None = Field(default="mid_season")
    soil_type: str | None = Field(default="Clay Loam")
    paddy_water_depth_cm: float | None = Field(default=None, ge=0.0)
    days_since_drain: int | None = Field(default=None, ge=0)


class FertilizerSubsystemInput(BaseModel):
    """Optional inputs for Knowledge-Based Fertilizer Advisory."""

    soil_test_method: str | None = Field(default="Standard")
    nitrogen: float | None = Field(default=None)
    phosphorus: float | None = Field(default=None)
    potassium: float | None = Field(default=None)
    ph: float | None = Field(default=None, ge=0.0, le=14.0)
    nitrogen_status: str | None = Field(default=None)
    phosphorus_status: str | None = Field(default=None)
    potassium_status: str | None = Field(default=None)
    region: str | None = Field(default=None)
    cultivation_condition: str | None = Field(default="standard")
    growth_stage: str | None = Field(default="basal")
    field_area_hectares: float | None = Field(default=None, gt=0.0)
    previous_applications: list[dict[str, Any]] | None = Field(default=None)


class YieldSubsystemInput(BaseModel):
    """Optional inputs for Regression Yield Prediction."""

    region: str | None = Field(default=None)
    soil_type: str | None = Field(default="Clay Loam")
    field_area_ha: float | None = Field(default=None, gt=0.0)
    is_prospective_planning: bool = Field(default=True)
    rainfall_mm: float | None = Field(default=None, ge=0.0)
    temperature_celsius: float | None = Field(default=None)
    fertilizer_applied_kg_ha: float | None = Field(default=None, ge=0.0)
    pesticide_applied_kg_ha: float | None = Field(default=None, ge=0.0)
    fertilizer_n_kg_ha: float | None = Field(default=None, ge=0.0)
    fertilizer_p_kg_ha: float | None = Field(default=None, ge=0.0)
    fertilizer_k_kg_ha: float | None = Field(default=None, ge=0.0)
    seed_density_kg_ha: float | None = Field(default=None, ge=0.0)
    prior_season_yield_kg_ha: float | None = Field(default=None, ge=0.0)
    historical_mean_yield: float | None = Field(default=None, ge=0.0)


class StageBRequest(BaseModel):
    """Stage B execution request requiring confirmed crop and modular inputs."""

    stage_a_id: str | None = Field(default=None, description="Optional link to Stage A")
    farm_id: str | None = Field(default=None)
    field_id: str | None = Field(default=None)
    confirmed_crop: str = Field(
        ...,
        min_length=1,
        description="MANDATORY: Farmer-confirmed crop for multi-subsystem evaluation",
    )
    academic_demo_mode: bool = Field(default=False)
    irrigation_input: IrrigationSubsystemInput | None = Field(default=None)
    fertilizer_input: FertilizerSubsystemInput | None = Field(default=None)
    yield_input: YieldSubsystemInput | None = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def normalize_modular_inputs(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # 1. Alias plural irrigation_inputs to irrigation_input
            if not data.get("irrigation_input") and data.get("irrigation_inputs"):
                irr_raw = data.get("irrigation_inputs") or {}
                data["irrigation_input"] = {
                    "soil_water_depletion": irr_raw.get("soil_water_depletion", irr_raw.get("soil_water_depletion_pct")),
                    "atmospheric_demand": irr_raw.get("atmospheric_demand", irr_raw.get("atmospheric_demand_pct")),
                    "effective_rainfall": irr_raw.get("effective_rainfall", irr_raw.get("effective_rainfall_mm")),
                    "paddy_water_depth_cm": irr_raw.get("paddy_water_depth_cm"),
                    "days_since_drain": irr_raw.get("days_since_drain"),
                }
            # 2. Alias plural fertilizer_inputs to fertilizer_input
            if not data.get("fertilizer_input") and data.get("fertilizer_inputs"):
                fert_raw = data.get("fertilizer_inputs") or {}
                data["fertilizer_input"] = {
                    "nitrogen_status": fert_raw.get("nitrogen_status"),
                    "growth_stage": fert_raw.get("growth_stage"),
                    "field_area_hectares": fert_raw.get("field_area_hectares", fert_raw.get("field_area_ha")),
                    "nitrogen": fert_raw.get("nitrogen"),
                    "phosphorus": fert_raw.get("phosphorus"),
                    "potassium": fert_raw.get("potassium"),
                }
            # 3. Alias plural yield_inputs to yield_input
            if not data.get("yield_input") and data.get("yield_inputs"):
                yld_raw = data.get("yield_inputs") or {}
                data["yield_input"] = {
                    "field_area_ha": yld_raw.get("field_area_ha"),
                    "is_prospective_planning": yld_raw.get("is_prospective_planning", True),
                    "rainfall_mm": yld_raw.get("rainfall_mm"),
                    "temperature_celsius": yld_raw.get("temperature_celsius"),
                    "region": yld_raw.get("region"),
                    "soil_type": yld_raw.get("soil_type"),
                }
            # 4. Alias farmer_confirmed_crop to confirmed_crop
            if "confirmed_crop" not in data and "farmer_confirmed_crop" in data:
                data["confirmed_crop"] = data["farmer_confirmed_crop"]
        return data


class CropPathwayCompatibility(BaseModel):
    """Compatibility flags across all 4 AI subsystems for confirmed crop."""

    recommendation_supported: bool = Field(..., description="Exists in 22 recommendation crops")
    irrigation_supported: bool = Field(..., description="Supported in irrigation profiles")
    fertilizer_supported: bool = Field(..., description="Supported in fertilizer rule base")
    yield_supported: bool = Field(..., description="Supported in 5-crop yield regression whitelist")
    pathway_type: str = Field(
        ...,
        description="'integrated' (Rice/Maize), 'standalone_yield' (Wheat/Barley/Soybean), or 'advisory_only'",
    )
    yield_canonical_crop: str | None = Field(default=None)
    notes: str = Field(default="")


class StageBResponse(BaseModel):
    """Unified Stage B multi-subsystem assessment output."""

    assessment_id: str = Field(
        default_factory=lambda: f"asmt_{uuid.uuid4().hex[:10]}",
        description="Unique assessment run identifier",
    )
    owner_uid: str = Field(..., description="Authenticated user ID")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )
    farm_id: str | None = Field(default=None)
    field_id: str | None = Field(default=None)
    stage_a_id: str | None = Field(default=None)
    farmer_confirmed_crop: str = Field(..., description="Confirmed crop")
    is_crop_from_recommendation: bool = Field(default=False)
    crop_pathway_compatibility: CropPathwayCompatibility = Field(...)

    # Subsystem Component Results
    irrigation_result: ComponentResult[IrrigationAdvisoryOutput] = Field(...)
    fertilizer_result: ComponentResult[FertilizerAdvisoryOutput] = Field(...)
    yield_result: ComponentResult[YieldPredictionOutput] = Field(...)

    overall_status: OverallAssessmentStatus = Field(...)
    academic_demo_mode: bool = Field(default=False)
    warnings: list[str] = Field(default_factory=list)
    model_versions: dict[str, str] = Field(default_factory=dict)
    persistence_status: dict[str, Any] = Field(
        default_factory=lambda: {
            "persisted": False,
            "storage_backend": "none",
        },
        description="Audit persistence tracking status",
    )
