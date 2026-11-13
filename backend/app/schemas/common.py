"""Common shared schemas across API endpoints and AI modules."""
from datetime import datetime, timezone
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class BaseResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: T | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Alias for backward and forward API compatibility
ApiResponse = BaseResponse


class HealthStatus(BaseModel):
    status: str
    environment: str
    version: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    modules: dict[str, str] = Field(
        default_factory=lambda: {
            "crop_recommendation": "ready",
            "irrigation_advisory": "ready",
            "fertilizer_advisory": "ready",
            "yield_prediction": "ready",
        }
    )
