"""Pydantic schemas for Crop Recommendation."""
import math

from pydantic import BaseModel, Field, field_validator


class CropRecommendationInput(BaseModel):
    """Input features for Crop Recommendation Decision Tree.

    Input features must be ordered consistently:
    N, P, K, temperature, humidity, ph, rainfall.
    """
    nitrogen: float = Field(..., ge=0.0, le=300.0, description="Soil Nitrogen (N) content value")
    phosphorus: float = Field(..., ge=0.0, le=300.0, description="Soil Phosphorus (P) content value")
    potassium: float = Field(..., ge=0.0, le=400.0, description="Soil Potassium (K) content value")
    temperature: float = Field(..., ge=-10.0, le=60.0, description="Ambient temperature in °C")
    humidity: float = Field(..., ge=0.0, le=100.0, description="Relative humidity in %")
    ph: float = Field(..., ge=0.0, le=14.0, description="Soil pH value (0-14)")
    rainfall: float = Field(..., ge=0.0, le=2000.0, description="Rainfall measurement value in mm")
    academic_demo_mode: bool = Field(
        True,
        description="Whether to run in academic demonstration mode using dataset-compatible scale",
    )

    @field_validator(
        "nitrogen",
        "phosphorus",
        "potassium",
        "temperature",
        "humidity",
        "ph",
        "rainfall",
        mode="before",
    )
    @classmethod
    def validate_finite(cls, v: float, info) -> float:
        try:
            val = float(v)
        except (ValueError, TypeError):
            raise ValueError(f"Feature '{info.field_name}' must be a valid numerical value.")
        if not math.isfinite(val):
            raise ValueError(f"Feature '{info.field_name}' must be a finite numerical value (received {val}).")
        return val


class CropRecommendationOutput(BaseModel):
    """Output schema for recommended crop."""
    recommended_crop: str = Field(..., description="Recommended crop label from supported 22 crops")
    model_version: str = Field("v1.0", description="Version of the inference model")
    prediction_status: str = Field("success", description="Status of the prediction inference")
    confidence: float | None = Field(
        None,
        description="Calibrated model prediction probability if available (kept internal until calibrated)",
    )
    available_crops: list[str] = Field(default=[], description="List of all supported crops")
    pathway_available: bool = Field(
        False,
        description="Whether an integrated recommendation-to-yield pathway exists for this crop (Rice and Maize only)",
    )
    units_verified: bool = Field(
        False,
        description="Whether input physical units and thresholds have been certified against agronomic standards",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Operational and agronomic cautionary warnings",
    )
