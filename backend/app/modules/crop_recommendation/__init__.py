"""Crop Recommendation Module (Decision Tree)."""
from app.modules.crop_recommendation.constants import SUPPORTED_RECOMMENDATION_CROPS
from app.modules.crop_recommendation.inference import (
    CropRecommendationService,
    crop_service,
)
from app.modules.crop_recommendation.schemas import (
    CropRecommendationInput,
    CropRecommendationOutput,
)

__all__ = [
    "SUPPORTED_RECOMMENDATION_CROPS",
    "CropRecommendationInput",
    "CropRecommendationOutput",
    "CropRecommendationService",
    "crop_service",
]
