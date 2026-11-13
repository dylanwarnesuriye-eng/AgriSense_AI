"""Internal developer & administrator system diagnostics endpoint."""
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.auth import AuthenticatedUser, require_admin
from app.core.config import settings

router = APIRouter()


class DatabaseDiagnosticInfo(BaseModel):
    persistence_layer: str
    allow_in_memory_fallback: bool
    allow_mock_tokens: bool
    environment: str


class SubsystemDiagnosticInfo(BaseModel):
    name: str
    type: str
    version: str
    status: str
    notes: str


class SystemDiagnosticsResponse(BaseModel):
    status: str = Field(..., description="Overall diagnostic status")
    authorized_admin: str = Field(..., description="UID of authorized administrator")
    role: str = Field(..., description="Verified role")
    api_environment: str
    api_version: str
    database: DatabaseDiagnosticInfo
    subsystems: list[SubsystemDiagnosticInfo]


@router.get(
    "/system/diagnostics",
    response_model=SystemDiagnosticsResponse,
    summary="Internal system diagnostics (Admin Only)",
)
async def get_system_diagnostics(
    admin_user: Annotated[AuthenticatedUser, Depends(require_admin)],
) -> SystemDiagnosticsResponse:
    """Provide internal system diagnostics, model registry, and infrastructure telemetry.

    Security Rule:
    Strictly restricted to users with role='admin' in Cloud Firestore.
    Farmer accounts and unauthenticated requests are denied with 403 / 401.
    """
    persistence_label = (
        "Cloud Firestore — Live Persistence"
        if not settings.ALLOW_IN_MEMORY_FALLBACK
        else "Cloud Firestore (Thread-Safe Fallback)"
    )

    return SystemDiagnosticsResponse(
        status="healthy",
        authorized_admin=admin_user.uid,
        role=admin_user.role,
        api_environment=settings.ENVIRONMENT,
        api_version=settings.VERSION,
        database=DatabaseDiagnosticInfo(
            persistence_layer=persistence_label,
            allow_in_memory_fallback=settings.ALLOW_IN_MEMORY_FALLBACK,
            allow_mock_tokens=settings.ALLOW_MOCK_TOKENS,
            environment=settings.ENVIRONMENT,
        ),
        subsystems=[
            SubsystemDiagnosticInfo(
                name="Crop Recommendation",
                type="Supervised Decision Tree",
                version="crop_decision_tree_v1.0",
                status="production_ready",
                notes="Gini impurity criterion, max depth 12. Input order: N, P, K, temp, humidity, pH, rainfall.",
            ),
            SubsystemDiagnosticInfo(
                name="Irrigation Advisory",
                type="Mamdani Fuzzy Inference",
                version="fuzzy_irrigation_v1.0",
                status="draft_unvalidated",
                notes="Models depletion %, ET demand, and effective rainfall. Dedicated standing-water depth for paddy rice.",
            ),
            SubsystemDiagnosticInfo(
                name="Fertilizer Advisory",
                type="Forward-Chaining Knowledge Base",
                version="kb_fertilizer_v0.1_draft",
                status="draft_unvalidated",
                notes="Derives N-P-K nutrient status and converts to chemical product application rates (Urea, DAP, MOP).",
            ),
            SubsystemDiagnosticInfo(
                name="Crop Yield Prediction",
                type="Grouped Ridge Regression",
                version="yield_regressor_v1.0",
                status="production_ready",
                notes="L2-regularized linear model with grouped state-level cross validation to prevent spatial data leakage.",
            ),
        ],
    )
