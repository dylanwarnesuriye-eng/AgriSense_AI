"""FastAPI endpoints for the Two-Stage Assessment Orchestrator."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.modules.assessment_orchestrator.orchestrator import orchestrator
from app.modules.assessment_orchestrator.schemas import (
    StageARequest,
    StageAResponse,
    StageBRequest,
    StageBResponse,
)
from app.schemas.common import ApiResponse
from app.services.firestore_repo import firestore_repo

router = APIRouter()


@router.post(
    "/stage-a/recommend-crop",
    response_model=ApiResponse[StageAResponse],
    summary="Stage A: Crop Recommendation (Decision Tree)",
)
async def run_stage_a_recommendation(
    payload: StageARequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Run Stage A crop recommendation based on 7 soil and climate inputs.

    Returns candidate crop advice.
    INVARIANT: The candidate crop is NOT treated as confirmed without farmer action.
    """
    result = orchestrator.execute_stage_a(payload)
    return ApiResponse(
        success=True,
        data=result,
        message="Stage A recommendation evaluated. Farmer confirmation required for Stage B.",
    )


@router.post(
    "/stage-b/evaluate-crop",
    response_model=ApiResponse[StageBResponse],
    summary="Stage B: Multi-Component Evaluation (Irrigation, Fertilizer, Yield)",
)
async def run_stage_b_evaluation(
    payload: StageBRequest,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Run Stage B evaluation across all eligible AI components for the farmer-confirmed crop.

    Components are executed independently; failure in one subsystem does not erase others.
    Persists assessment audit record to Firestore under the authenticated user.
    """
    result = orchestrator.execute_stage_b(payload, owner_uid=current_user.uid)
    return ApiResponse(
        success=True,
        data=result,
        message=f"Stage B assessment completed for confirmed crop '{result.farmer_confirmed_crop}'.",
    )


@router.get(
    "/assessments",
    response_model=ApiResponse[list[dict]],
    summary="List past assessment history for authenticated user",
)
async def list_user_assessments(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    farm_id: str | None = Query(default=None, description="Optional farm filter"),
):
    """Retrieve chronological history of past multi-subsystem assessments for the user."""
    assessments = firestore_repo.list_assessments(
        owner_uid=current_user.uid,
        farm_id=farm_id,
    )
    return ApiResponse(
        success=True,
        data=assessments,
        message=f"Retrieved {len(assessments)} past assessment(s).",
    )


@router.get(
    "/assessments/{assessment_id}",
    response_model=ApiResponse[dict],
    summary="Get single assessment details",
)
async def get_assessment_detail(
    assessment_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Retrieve full assessment snapshot by ID with ownership verification."""
    assessment = firestore_repo.get_assessment(assessment_id)
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment '{assessment_id}' was not found.",
        )
    if assessment.get("owner_uid") != current_user.uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view this assessment.",
        )
    return ApiResponse(
        success=True,
        data=assessment,
        message="Assessment details retrieved successfully.",
    )
