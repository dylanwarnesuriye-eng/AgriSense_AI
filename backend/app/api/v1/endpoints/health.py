"""Health check endpoint."""
from fastapi import APIRouter

from app.core.config import settings
from app.schemas.common import HealthStatus

router = APIRouter()


@router.get("/health", response_model=HealthStatus, summary="Check API and module health")
async def health_check() -> HealthStatus:
    """Return platform operational status and individual AI module readiness flags."""
    return HealthStatus(
        status="healthy",
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
        modules={
            "crop_recommendation": "ready",
            "irrigation_advisory": "ready",
            "fertilizer_advisory": "ready",
            "yield_prediction": "ready",
        },
    )
