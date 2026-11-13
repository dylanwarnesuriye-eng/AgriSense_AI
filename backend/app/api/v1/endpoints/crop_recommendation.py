"""API endpoints for Crop Recommendation."""
from fastapi import APIRouter, HTTPException, status

from app.modules.crop_recommendation import (
    SUPPORTED_RECOMMENDATION_CROPS,
    CropRecommendationInput,
    CropRecommendationOutput,
    crop_service,
)
from app.modules.crop_recommendation.inference import UnverifiedUnitsError
from app.schemas.common import BaseResponse

router = APIRouter()


@router.get("/crops", response_model=BaseResponse[list[str]], summary="List supported recommendation crops")
async def list_supported_crops():
    """Returns the list of 22 crops supported by the recommendation module."""
    return BaseResponse(
        data=SUPPORTED_RECOMMENDATION_CROPS,
        message=f"Retrieved {len(SUPPORTED_RECOMMENDATION_CROPS)} supported crops for recommendation.",
    )


@router.post("/recommend", response_model=BaseResponse[CropRecommendationOutput], summary="Recommend crop")
async def recommend_crop(payload: CropRecommendationInput):
    """Run Decision Tree crop recommendation inference on soil & climate inputs."""
    try:
        result = crop_service.predict(payload)
        return BaseResponse(
            data=result,
            message="Crop recommendation evaluated successfully.",
        )
    except UnverifiedUnitsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
