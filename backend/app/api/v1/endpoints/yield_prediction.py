"""API endpoints for Crop Yield Prediction."""
from fastapi import APIRouter, HTTPException, status

from app.modules.yield_prediction import (
    INTEGRATED_PATHWAY_CROPS,
    SUPPORTED_CROP_NAMES_TITLE,
    SUPPORTED_YIELD_CROPS,
    UnsupportedCropYieldError,
    YieldPredictionInput,
    YieldPredictionOutput,
    yield_service,
)
from app.schemas.common import BaseResponse

router = APIRouter()


@router.get("/supported-crops", response_model=BaseResponse[dict], summary="List supported yield crops")
async def list_supported_yield_crops():
    """Returns the list of 5 crops supported for yield prediction and the integrated pathway subset."""
    return BaseResponse(
        data={
            "supported_crops": SUPPORTED_YIELD_CROPS,
            "supported_crop_names": SUPPORTED_CROP_NAMES_TITLE,
            "integrated_pathway_crops": list(INTEGRATED_PATHWAY_CROPS),
            "total_supported": len(SUPPORTED_YIELD_CROPS),
        },
        message="Yield prediction is restricted strictly to Wheat, Barley, Corn, Rice, and Soybean.",
    )


@router.get("/pathway/{crop_name}", response_model=BaseResponse[dict], summary="Check recommendation-to-yield pathway")
async def check_crop_pathway(crop_name: str):
    """Check if a crop from the Recommendation system (22 crops) has an integrated yield pathway."""
    pathway_info = yield_service.check_integrated_pathway(crop_name)
    return BaseResponse(
        data=pathway_info,
        message=pathway_info["message"],
    )


@router.post("/predict", response_model=BaseResponse[YieldPredictionOutput], summary="Predict crop yield")
async def predict_yield(payload: YieldPredictionInput):
    """Run regression yield estimation for a supported crop.

    Strictly restricted to Wheat, Barley, Corn (Maize), Rice, and Soybean.
    Unsupported crops will return an HTTP 400 Bad Request error.
    """
    try:
        prediction = yield_service.predict(payload)
        return BaseResponse(
            data=prediction,
            message="Crop yield predicted successfully.",
        )
    except UnsupportedCropYieldError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
