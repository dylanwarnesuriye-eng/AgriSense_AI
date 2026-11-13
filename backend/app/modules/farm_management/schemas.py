"""Schemas for Farm Management, Fields, and Typed Soil/Climate Telemetry."""
import uuid
from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class MeasurementSource(str, Enum):
    SENSOR = "sensor"
    LAB_TEST = "lab_test"
    SATELLITE = "satellite"
    MANUAL_ENTRY = "manual_entry"


class SoilClimateMeasurement(BaseModel):
    """Typed soil and climate measurement snapshot with explicit units.

    CRITICAL INVARIANT: Missing measurements must remain None and never be coerced to zero.
    """

    measurement_id: str = Field(
        default_factory=lambda: f"meas_{uuid.uuid4().hex[:10]}",
        description="Unique measurement identifier",
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 recording timestamp",
    )
    source: MeasurementSource = Field(
        default=MeasurementSource.MANUAL_ENTRY,
        description="Telemetry origin: sensor, lab_test, satellite, manual_entry",
    )
    units: dict[str, str] = Field(
        default_factory=lambda: {
            "nitrogen": "mg/kg",
            "phosphorus": "mg/kg",
            "potassium": "mg/kg",
            "ph": "pH_scale",
            "temperature": "celsius",
            "humidity": "percent",
            "rainfall": "mm",
            "soil_moisture": "percent_volumetric",
        },
        description="Explicit measurement units dictionary",
    )

    nitrogen: float | None = Field(
        default=None,
        description="Available soil nitrogen. None if unmeasured.",
    )
    phosphorus: float | None = Field(
        default=None,
        description="Available soil phosphorus. None if unmeasured.",
    )
    potassium: float | None = Field(
        default=None,
        description="Available soil potassium. None if unmeasured.",
    )
    ph: float | None = Field(
        default=None,
        ge=0.0,
        le=14.0,
        description="Soil pH (0-14). None if unmeasured.",
    )
    temperature: float | None = Field(
        default=None,
        ge=-20.0,
        le=60.0,
        description="Ambient temperature in degrees Celsius. None if unmeasured.",
    )
    humidity: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Relative humidity percentage (0-100). None if unmeasured.",
    )
    rainfall: float | None = Field(
        default=None,
        ge=0.0,
        description="Rainfall depth in mm. None if unmeasured.",
    )
    soil_moisture: float | None = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Volumetric soil moisture percentage (0-100). None if unmeasured.",
    )
    notes: str | None = Field(
        default=None,
        description="Optional agronomic observation notes",
    )

    @field_validator("nitrogen", "phosphorus", "potassium", "ph", "temperature", "humidity", "rainfall", "soil_moisture")
    @classmethod
    def prevent_zero_coercion_for_none(cls, v: float | None) -> float | None:
        """Preserve exact None representation; never treat missing values as zero."""
        return v


class FieldCreate(BaseModel):
    """Payload for creating a field within a farm."""

    name: str = Field(..., min_length=1, max_length=100, description="Field name or plot identifier")
    area_hectares: float = Field(..., gt=0.0, description="Field surface area in hectares")
    soil_type: str = Field(
        default="Clay Loam",
        description="Soil textural class (e.g. Sandy Loam, Clay Loam, Silt, Peat)",
    )
    crop_currently_planted: str | None = Field(
        default=None,
        description="Currently cultivated crop if any",
    )


class FieldModel(BaseModel):
    """Field entity representation."""

    field_id: str = Field(
        default_factory=lambda: f"fld_{uuid.uuid4().hex[:10]}",
        description="Unique field identifier",
    )
    farm_id: str = Field(..., description="Parent farm ID")
    name: str = Field(..., description="Field name")
    area_hectares: float = Field(..., gt=0.0, description="Area in hectares")
    soil_type: str = Field(default="Clay Loam", description="Soil texture type")
    crop_currently_planted: str | None = Field(default=None)
    measurements: list[SoilClimateMeasurement] = Field(
        default_factory=list,
        description="Telemetry and lab measurement history",
    )
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )


class FarmCreate(BaseModel):
    """Payload for creating a new farm."""

    name: str = Field(..., min_length=1, max_length=150, description="Farm name")
    location: str = Field(..., min_length=1, max_length=200, description="Geographic region or district")
    total_area_hectares: float = Field(..., gt=0.0, description="Total farm acreage in hectares")
    notes: str | None = Field(default=None, description="Optional farm profile notes")


class FarmUpdate(BaseModel):
    """Payload for updating farm profile attributes."""

    name: str | None = Field(default=None, min_length=1, max_length=150)
    location: str | None = Field(default=None, min_length=1, max_length=200)
    total_area_hectares: float | None = Field(default=None, gt=0.0)
    notes: str | None = Field(default=None)


class FarmModel(BaseModel):
    """Complete farm document representation."""

    farm_id: str = Field(
        default_factory=lambda: f"frm_{uuid.uuid4().hex[:10]}",
        description="Unique farm identifier",
    )
    owner_uid: str = Field(..., description="Authenticated Firebase UID of farm owner")
    name: str = Field(..., description="Farm name")
    location: str = Field(..., description="Geographic location")
    total_area_hectares: float = Field(..., description="Total farm area in hectares")
    notes: str | None = Field(default=None)
    fields: list[FieldModel] = Field(default_factory=list, description="Associated agricultural plots")
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
    )
