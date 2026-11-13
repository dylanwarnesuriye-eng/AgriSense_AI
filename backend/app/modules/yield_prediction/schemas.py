"""Pydantic schemas for Crop Yield Prediction (Regression)."""
import math
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

from app.modules.yield_prediction.constants import (
    CROP_NORMALIZATION_MAP,
    NORMALIZED_SUPPORTED_CROPS,
    SUPPORTED_YIELD_CROPS,
)


class YieldPredictionInput(BaseModel):
    """Input features for Crop Yield Prediction regression model.

    Strictly limited to Wheat, Barley, Corn (Maize), Rice, and Soybean.
    Supports both Core and Extended features, with backward-compatibility aliases.
    """
    crop_name: str = Field(..., description="Crop name. Must be one of: Wheat, Barley, Corn (Maize), Rice, Soybean")
    soil_ph: float = Field(6.5, ge=0.0, le=14.0, description="Soil pH value (0-14)")
    soil_moisture: float = Field(30.0, ge=0.0, le=100.0, description="Soil moisture percentage (0-100%)")
    avg_temperature: float = Field(22.0, ge=-10.0, le=60.0, description="Average temperature in °C")
    total_rainfall: float = Field(650.0, ge=0.0, le=3000.0, description="Total cumulative rainfall in mm")
    nitrogen_content: float = Field(1.75, ge=0.0, le=10.0, description="Soil nitrogen content percentage")
    phosphorus_content: float = Field(0.85, ge=0.0, le=10.0, description="Soil phosphorus content percentage")
    potassium_content: float = Field(1.25, ge=0.0, le=10.0, description="Soil potassium content percentage")

    # Extended / Management features (optional for prospective planning mode)
    fertilizer_amount: float | None = Field(None, ge=0.0, le=1000.0, description="Fertilizer application amount")
    pesticide_usage: float | None = Field(None, ge=0.0, le=100.0, description="Pesticide usage amount")
    sunlight_hours: float | None = Field(None, ge=0.0, le=5000.0, description="Total cumulative sunlight hours")
    irrigation_frequency: int | None = Field(None, ge=0, le=30, description="Irrigation event frequency")
    region: str = Field("Central", description="Geographic agricultural region (North, South, East, West, Central)")
    season: str = Field("Spring", description="Cropping season (Spring, Summer, Autumn/Fall)")

    # Farm sizing & operational mode
    area_hectares: float = Field(1.0, gt=0.0, description="Cultivated land area in hectares for total yield computation")
    prediction_mode: str = Field(
        "full_season",
        description="Prediction operational mode: 'full_season' (with inputs) or 'prospective' (soil & climate only)",
    )
    academic_demo_mode: bool = Field(
        True,
        description="Whether to evaluate in academic demonstration mode with dataset-compatible scales",
    )

    # Backward compatibility aliases
    annual_rainfall_mm: float | None = None
    rainfall_mm: float | None = None
    fertilizer_usage_kg_per_ha: float | None = None
    fertilizer_kg_per_ha: float | None = None
    pesticide_kg_per_ha: float | None = None
    average_temperature_c: float | None = None
    temperature_c: float | None = None

    @field_validator("region", mode="before")
    @classmethod
    def normalize_region(cls, v: Any) -> str:
        if isinstance(v, str):
            clean = v.strip().title()
            if clean in {"North", "South", "East", "West", "Central"}:
                return clean
            mapping = {
                "dry zone": "North",
                "dry_zone": "North",
                "wet zone": "South",
                "wet_zone": "South",
                "intermediate zone": "Central",
                "intermediate_zone": "Central",
                "arid": "West",
                "humid": "East",
            }
            if v.strip().lower() in mapping:
                return mapping[v.strip().lower()]
        return "Central"

    @model_validator(mode="before")
    @classmethod
    def map_backward_compatible_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Map annual_rainfall_mm / rainfall_mm -> total_rainfall
            if "total_rainfall" not in data:
                if "annual_rainfall_mm" in data:
                    data["total_rainfall"] = data["annual_rainfall_mm"]
                elif "rainfall_mm" in data:
                    data["total_rainfall"] = data["rainfall_mm"]

            # Map fertilizer_usage_kg_per_ha / fertilizer_kg_per_ha -> fertilizer_amount
            if "fertilizer_amount" not in data:
                if "fertilizer_usage_kg_per_ha" in data:
                    data["fertilizer_amount"] = data["fertilizer_usage_kg_per_ha"]
                elif "fertilizer_kg_per_ha" in data:
                    data["fertilizer_amount"] = data["fertilizer_kg_per_ha"]

            # Map pesticide_kg_per_ha -> pesticide_usage
            if "pesticide_usage" not in data and "pesticide_kg_per_ha" in data:
                data["pesticide_usage"] = data["pesticide_kg_per_ha"]

            # Map average_temperature_c / temperature_c -> avg_temperature
            if "avg_temperature" not in data:
                if "average_temperature_c" in data:
                    data["avg_temperature"] = data["average_temperature_c"]
                elif "temperature_c" in data:
                    data["avg_temperature"] = data["temperature_c"]
        return data


    @field_validator("crop_name")
    @classmethod
    def validate_crop_supported(cls, v: str) -> str:
        normalized = v.strip().lower()
        if normalized not in NORMALIZED_SUPPORTED_CROPS:
            raise ValueError(
                f"Crop '{v}' is not supported for yield prediction. "
                f"Supported crops are strictly: {', '.join(SUPPORTED_YIELD_CROPS)}."
            )
        return CROP_NORMALIZATION_MAP[normalized]

    @field_validator(
        "soil_ph",
        "soil_moisture",
        "avg_temperature",
        "total_rainfall",
        "nitrogen_content",
        "phosphorus_content",
        "potassium_content",
        "fertilizer_amount",
        "pesticide_usage",
        "sunlight_hours",
        "area_hectares",
        mode="before",
    )
    @classmethod
    def validate_finite(cls, v: Any, info) -> Any:
        if v is None:
            return None
        try:
            val = float(v)
        except (ValueError, TypeError):
            raise ValueError(f"Feature '{info.field_name}' must be a valid numerical value.")
        if not math.isfinite(val):
            raise ValueError(f"Feature '{info.field_name}' must be a finite numerical value (received {val}).")
        return val


class YieldPredictionOutput(BaseModel):
    """Output schema for crop yield prediction."""
    crop_name: str
    area_hectares: float
    predicted_yield_tpha: float | None = Field(None, description="Estimated crop yield in metric tonnes per hectare (t/ha)")
    predicted_yield_per_hectare: float | None = Field(None, description="Alias for predicted_yield_tpha for backward compatibility")
    predicted_yield_total: float | None = Field(None, description="Total estimated harvest (area_hectares * predicted_yield_tpha)")
    prediction_mode: str = Field("full_season", description="Operating prediction mode")
    model_version: str = Field("v1.0", description="Model version")
    prediction_status: str = Field("success", description="Prediction status")
    yield_supported: bool = Field(True, description="Whether the requested crop is supported for yield regression")
    units_verified: bool = Field(
        False,
        description="Flag indicating exact physical units require verified agronomic laboratory calibration",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Operational, seasonal, and agronomic cautionary warnings",
    )
