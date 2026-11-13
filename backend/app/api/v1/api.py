"""API v1 Router aggregator."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    assessment_orchestrator,
    crop_recommendation,
    diagnostics,
    farm_management,
    fertilizer_advisory,
    health,
    irrigation_advisory,
    users,
    yield_prediction,
)

api_router = APIRouter()

# Core system & user profile routes
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(users.router, prefix="/users", tags=["User Profile & Roles"])
api_router.include_router(diagnostics.router, tags=["Admin & Diagnostics"])

# Farm & Field Management
api_router.include_router(
    farm_management.router,
    prefix="/farms",
    tags=["Farm & Field Management"],
)

# Multi-Module Assessment Orchestrator
api_router.include_router(
    assessment_orchestrator.router,
    prefix="/orchestrator",
    tags=["Assessment Orchestrator"],
)

# Four AI Subsystems (Standalone Access)
api_router.include_router(
    crop_recommendation.router,
    prefix="/crops",
    tags=["1. Crop Recommendation (Decision Tree)"],
)
api_router.include_router(
    irrigation_advisory.router,
    prefix="/irrigation",
    tags=["2. Irrigation Advisory (Mamdani Fuzzy Logic)"],
)
api_router.include_router(
    fertilizer_advisory.router,
    prefix="/fertilizer",
    tags=["3. Fertilizer Advisory (Rule-Based Expert System)"],
)
api_router.include_router(
    yield_prediction.router,
    prefix="/yield",
    tags=["4. Crop Yield Prediction (Regression)"],
)

