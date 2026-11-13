"""Pydantic schemas for Fertilizer Advisory (Rule-Based Knowledge System).

Supports typed measurements, non-finite rejection, explicit units,
safeguarded commercial fertilizer calculations, and backward compatibility.
"""
import math
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

from app.modules.fertilizer_advisory.knowledge_base import (
    RULE_APPROVAL_STATUS,
    RULE_BASE_VERSION,
)


class PreviousFertilizerApplication(BaseModel):
    """Record of earlier fertilizer applications in current season."""
    nutrient: str = Field(..., description="Nutrient applied, e.g. 'N', 'P2O5', 'K2O'")
    amount_kgha: float = Field(..., ge=0.0, description="Amount applied in kg/ha")
    application_date: str | None = Field(None, description="ISO date of prior application")


class FertilizerProductRecommendation(BaseModel):
    """Commercial fertilizer product application guidance."""
    product_name: str
    target_nutrient: str
    nutrient_rate_kgha: float
    product_rate_kgha: float | None
    total_field_requirement_kg: float | None
    calculation_status: str
    warnings: list[str] = Field(default_factory=list)


class FertilizerAdvisoryInput(BaseModel):
    """Input observations for knowledge-based fertilizer diagnosis."""
    crop_name: str = Field(..., description="Target crop for which fertilizer guidance is requested")

    # Soil chemical observations (explicitly typed, non-finite rejected)
    nitrogen: float | None = Field(None, ge=0.0, le=100.0, description="Soil Total Nitrogen (%)")
    phosphorus: float | None = Field(None, ge=0.0, le=500.0, description="Available Soil Phosphorus (Olsen P, mg/kg or ppm)")
    potassium: float | None = Field(None, ge=0.0, le=2000.0, description="Exchangeable Soil Potassium (NH4OAc K, mg/kg or ppm)")
    ph: float | None = Field(None, ge=0.0, le=14.0, description="Soil pH measurement")

    # Soil testing metadata
    soil_test_method: str | None = Field(None, description="Analytical laboratory extraction method (e.g. 'Olsen', 'Kjeldahl')")
    soil_test_unit: str | None = Field(None, description="Reported concentration unit (e.g. 'mg/kg', 'ppm', '%')")
    soil_test_date: str | None = Field(None, description="ISO date of soil sampling/analysis")

    # Agronomic context
    region: str | None = Field(None, description="Geographic region or agro-ecological zone")
    cultivation_method: str | None = Field(None, description="Cultivation method (e.g. 'irrigated', 'rainfed')")
    crop_growth_stage: str | None = Field(None, description="Crop growth stage (e.g. 'basal', 'tillering')")
    field_area_hectares: float | None = Field(None, ge=0.01, le=10000.0, description="Total field area in hectares")

    # Prior applications & product selection
    previous_applications: list[PreviousFertilizerApplication] | None = Field(
        None,
        description="Nutrient amendments already applied to the current crop",
    )
    selected_products: dict[str, str] | None = Field(
        None,
        description="Custom product choices mapping nutrient to commercial fertilizer, e.g. {'N': 'Urea'}",
    )

    # Safety & demonstration controls
    academic_demo_mode: bool = Field(
        True,
        description="Simulation flag permitting provisional calculation when agronomic rules are unapproved",
    )

    @model_validator(mode="before")
    @classmethod
    def map_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "crop_name" not in data and "crop_type" in data:
                data["crop_name"] = data["crop_type"]
            if "crop_growth_stage" not in data and "growth_stage" in data:
                data["crop_growth_stage"] = data["growth_stage"]
            if "field_area_hectares" not in data and "field_area_ha" in data:
                data["field_area_hectares"] = data["field_area_ha"]
            if "ph" not in data and "soil_ph" in data:
                data["ph"] = data["soil_ph"]
        return data

    @field_validator("nitrogen", "phosphorus", "potassium", "ph", "field_area_hectares", mode="before")
    @classmethod
    def check_non_finite(cls, v: Any) -> Any:
        if v is not None and isinstance(v, (int, float)) and (math.isnan(v) or math.isinf(v)):
            raise ValueError("Non-finite numerical values (NaN, Inf) are strictly rejected.")
        return v


class FertilizerAdvisoryOutput(BaseModel):
    """Fertilizer diagnosis and recommendations."""
    selected_crop: str = Field(..., description="Crop evaluated")
    assessment_status: str = Field(
        ...,
        description="Assessment status: 'valid', 'insufficient_data', 'unsupported_crop', 'unapproved_rule_base', 'conflict_detected'",
    )
    nutrient_assessment: dict[str, str] = Field(
        default_factory=dict,
        description="Categorical diagnosis of soil nutrient reserves (e.g. {'N': 'Deficient'})",
    )
    recommended_nutrients_kgha: dict[str, float] = Field(
        default_factory=dict,
        description="Recommended nutrient application rates in kg nutrient/ha",
    )
    fertilizer_products: list[FertilizerProductRecommendation] = Field(
        default_factory=list,
        description="Calculated commercial fertilizer product requirements",
    )
    activated_rule_ids: list[str] = Field(
        default_factory=list,
        description="IDs of rules fired during forward chaining",
    )
    evidence_references: list[str] = Field(
        default_factory=list,
        description="Literature and official extension sources underpinning the recommendations",
    )
    rule_version: str = Field(RULE_BASE_VERSION, description="Rule base version identifier")
    agronomic_validation_status: str = Field(RULE_APPROVAL_STATUS, description="Agronomic approval status")
    is_production_approved: bool = Field(False, description="Flag indicating whether guidance is approved for field operations")
    explanation: str = Field(..., description="Synthesis of nutrient diagnosis and fertilizer rationale")
    explanation_trace: list[str] = Field(default_factory=list, description="Forward-chaining execution steps")
    warnings: list[str] = Field(default_factory=list, description="Agronomic caveats and safeguards")

    # Backward-compatible fields
    crop_name: str = Field(..., description="Legacy crop name field")
    nutrient_status: str = Field(..., description="Legacy qualitative nutrient status summary")
    recommended_fertilizers: list[str] = Field(default_factory=list, description="Legacy list of fertilizer names")
    rules_applied: list[str] = Field(default_factory=list, description="Legacy rule ID audit list")
    verified: bool = Field(False, description="Legacy agronomic verification flag")

    @model_validator(mode="before")
    @classmethod
    def populate_legacy_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            crop_name = data.get("crop_name") or data.get("selected_crop", "Unknown")
            selected_crop = data.get("selected_crop") or crop_name
            data["crop_name"] = crop_name
            data["selected_crop"] = selected_crop

            if "rules_applied" not in data:
                data["rules_applied"] = data.get("activated_rule_ids", [])

            if "verified" not in data:
                data["verified"] = data.get("is_production_approved", False)

            if "nutrient_status" not in data:
                nut_assess = data.get("nutrient_assessment", {})
                if nut_assess:
                    parts = [f"{k}: {v}" for k, v in nut_assess.items()]
                    data["nutrient_status"] = ", ".join(parts)
                else:
                    data["nutrient_status"] = data.get("assessment_status", "Pending Verification")

            if "recommended_fertilizers" not in data:
                prods = data.get("fertilizer_products", [])
                if prods:
                    data["recommended_fertilizers"] = [
                        f"{p.product_name} ({p.product_rate_kgha} kg/ha)" if hasattr(p, "product_name") else str(p)
                        for p in prods
                    ]
                else:
                    data["recommended_fertilizers"] = []
        return data


class AgronomicRuleDTO(BaseModel):
    rule_id: str
    crop: str
    region: str | None
    cultivation_condition: str | None
    growth_stage: str | None
    antecedents: dict[str, Any]
    consequent_nutrients_kgha: dict[str, float]
    consequent_recommendation: str
    precedence: int
    evidence_source_id: str
    approval_status: str
    version: str


class AgronomicSourceDTO(BaseModel):
    source_id: str
    institution: str
    publication_title: str
    document_reference: str
    publication_year: int
    applicable_crops: list[str]
    geographic_applicability: str
    review_status: str
    rule_version: str
    notes: str


class FertilizerProductDTO(BaseModel):
    name: str
    grade: str
    n_percent: float
    p2o5_percent: float
    k2o_percent: float
    description: str
