"""Pydantic schemas for Irrigation Advisory (Mamdani Fuzzy Logic).

Defines rigorous input contracts, physical bounds, output explanations,
and backward-compatible aliases for client continuity.
"""
from typing import Any

from pydantic import BaseModel, Field, model_validator


class IrrigationAdvisoryInput(BaseModel):
    """Input parameters for Mamdani irrigation fuzzy inference engine.

    Supports both direct derived fuzzy inputs (relative to RAW) and raw field sensor measurements.
    Uncalibrated raw sensors are flagged with high-priority agronomic warnings.
    """
    # Crop context
    crop_type: str | None = Field(
        "Wheat",
        description="Target crop name (e.g., 'Wheat', 'Maize', 'Rice', 'Soybean').",
    )
    crop_growth_stage: str | None = Field(
        None,
        description="Growth stage context (e.g., 'vegetative', 'flowering', 'maturity').",
    )

    # Derived Fuzzy Inputs (Preferred)
    soil_water_depletion: float | None = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Normalized root-zone soil water depletion percentage relative to Readily Available Water (RAW, 0.0% to 100.0%).",
    )
    atmospheric_demand: float | None = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Atmospheric evaporative demand index proxy (0.0 to 100.0, demonstration only).",
    )
    effective_rainfall: float | None = Field(
        None,
        ge=0.0,
        le=500.0,
        description="Forecasted or recent short-term effective rainfall in mm (0.0 to 500.0 mm).",
    )

    # Raw / Legacy Sensor Inputs (Accepted for backward compatibility and raw telemetry)
    soil_moisture: float | None = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Observed soil moisture metric / volumetric content (%)",
    )
    ambient_temperature: float | None = Field(
        None,
        ge=-10.0,
        le=60.0,
        description="Ambient temperature measurement (°C)",
    )
    relative_humidity: float | None = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Relative humidity measurement (%)",
    )
    rainfall_forecast_24h: float | None = Field(
        None,
        ge=0.0,
        le=500.0,
        description="Predicted 24h rainfall volume/depth (mm)",
    )

    # Calibration parameters
    sensor_calibrated: bool = Field(
        False,
        description="Flag indicating whether soil sensors are calibrated to soil field capacity and wilting point.",
    )
    field_capacity: float | None = Field(
        None,
        ge=5.0,
        le=60.0,
        description="Soil field capacity volumetric percentage (%)",
    )
    wilting_point: float | None = Field(
        None,
        ge=1.0,
        le=40.0,
        description="Permanent wilting point volumetric percentage (%)",
    )

    # Safety & simulation controls
    academic_demo_mode: bool = Field(
        True,
        description="Safety flag allowing provisional simulation when sensor calibration or rule approval is incomplete.",
    )
    measurement_timestamp: str | None = Field(
        None,
        description="ISO timestamp of observation.",
    )


class IrrigationAdvisoryOutput(BaseModel):
    """Irrigation requirement determined by Mamdani fuzzy inference."""
    selected_crop: str = Field(..., description="Crop evaluated")
    assessment_status: str = Field(
        ...,
        description="Evaluation status: 'valid', 'unavailable', 'insufficient_data', 'unsupported_crop', 'paddy_special_handling', 'unapproved_rule_base'",
    )
    software_status: str = Field(
        ...,
        description="Software calculation status: 'evaluated', 'unavailable', 'insufficient_data', 'unsupported_crop', 'paddy_special_handling', 'unapproved_rule_base'",
    )
    agronomic_approval_status: str = Field(
        "draft_unvalidated",
        description="Agronomic validation status: 'draft_unvalidated' or 'production_approved'",
    )
    is_production_approved: bool = Field(
        False,
        description="Explicit flag confirming whether guidance is approved for real field operations",
    )
    urgency_category: str | None = Field(
        None,
        description="Qualitative urgency: 'No irrigation indicated', 'Monitor', 'Irrigation may be needed', 'High priority', or None if unavailable",
    )
    urgency_score: float | None = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Defuzzified numerical decision index (0.0 to 100.0) or None if unavailable.",
    )
    explanation: str = Field(..., description="Comprehensive agronomic explanation of advisory")
    activated_rule_ids: list[str] = Field(
        default_factory=list,
        description="Rule IDs that fired during Mamdani inference",
    )
    rule_version: str = Field(
        "v0.1-draft-scaffold",
        description="Rule base version identifier",
    )
    input_measurement_timestamps: dict[str, str] | None = Field(
        None,
        description="Timestamps associated with input observations",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Agronomic calibration caveats, validation constraints, and physical limitations",
    )
    requires_agronomic_verification: bool = Field(
        True,
        description="Mandatory disclaimer: rules and thresholds require local field-trial validation",
    )

    # Backward-compatible fields
    urgency_level: str = Field(
        ...,
        description="Legacy qualitative urgency string for existing client continuity",
    )
    advisory_summary: str = Field(
        ...,
        description="Legacy advisory summary string",
    )
    fuzzy_water_index: float | None = Field(
        None,
        description="Legacy normalized defuzzified output index (0.0 to 1.0)",
    )

    @model_validator(mode="before")
    @classmethod
    def populate_legacy_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            status = data.get("assessment_status", "pending")
            category = data.get("urgency_category")
            explanation = data.get("explanation", "")
            score = data.get("urgency_score")

            if "urgency_level" not in data:
                if status == "unavailable":
                    data["urgency_level"] = "Unavailable"
                elif category:
                    data["urgency_level"] = category
                else:
                    data["urgency_level"] = status.replace("_", " ").title()

            if "advisory_summary" not in data:
                data["advisory_summary"] = explanation

            if "fuzzy_water_index" not in data:
                data["fuzzy_water_index"] = round(score / 100.0, 4) if score is not None else None

            if "software_status" not in data:
                data["software_status"] = "evaluated" if status == "valid" else status
        return data


class RuleDefinitionDTO(BaseModel):
    """Data transfer object for a single rule."""
    id: str
    depletion: str
    demand: str
    rainfall: str
    consequent: str
    weight: float


class RuleBaseStatusResponse(BaseModel):
    """Status report on the 36-rule base."""
    rule_version: str
    validation_status: str
    total_rules: int
    is_complete: bool
    coverage_ratio: float
    conflicts_detected: list[dict[str, str]]
    rules: list[RuleDefinitionDTO]


class SupportedCropDTO(BaseModel):
    canonical_name: str
    is_paddy: bool
    status: str
    routing_type: str
    indicative_root_depth_cm: float | None
    notes: str
