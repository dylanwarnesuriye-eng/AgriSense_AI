"""FastAPI endpoints for Farm, Field, and Soil/Climate Management."""
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.modules.farm_management.schemas import (
    FarmCreate,
    FarmModel,
    FarmUpdate,
    FieldCreate,
    FieldModel,
    SoilClimateMeasurement,
)
from app.modules.farm_management.service import farm_service
from app.schemas.common import ApiResponse

router = APIRouter()


@router.post("", response_model=ApiResponse[FarmModel], status_code=status.HTTP_201_CREATED)
async def create_farm(
    farm_in: FarmCreate,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Create a new farm for the authenticated user."""
    farm = farm_service.create_farm(farm_in, owner_uid=current_user.uid)
    return ApiResponse(
        success=True,
        data=farm,
        message="Farm created successfully.",
    )


@router.get("", response_model=ApiResponse[list[FarmModel]])
async def list_farms(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """List all farms owned by the authenticated user."""
    farms = farm_service.list_farms(owner_uid=current_user.uid)
    return ApiResponse(
        success=True,
        data=farms,
        message=f"Retrieved {len(farms)} farm(s).",
    )


@router.get("/{farm_id}", response_model=ApiResponse[FarmModel])
async def get_farm(
    farm_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Retrieve details and fields for a specific farm owned by user."""
    farm = farm_service.get_farm(farm_id=farm_id, owner_uid=current_user.uid)
    return ApiResponse(
        success=True,
        data=farm,
        message="Farm retrieved successfully.",
    )


@router.put("/{farm_id}", response_model=ApiResponse[FarmModel])
async def update_farm(
    farm_id: str,
    farm_update: FarmUpdate,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Update farm profile information."""
    updated = farm_service.update_farm(
        farm_id=farm_id,
        farm_update=farm_update,
        owner_uid=current_user.uid,
    )
    return ApiResponse(
        success=True,
        data=updated,
        message="Farm profile updated successfully.",
    )


@router.post("/{farm_id}/fields", response_model=ApiResponse[FieldModel], status_code=status.HTTP_201_CREATED)
async def create_field(
    farm_id: str,
    field_in: FieldCreate,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Add a new agricultural plot/field to the farm."""
    field = farm_service.create_field(
        farm_id=farm_id,
        field_in=field_in,
        owner_uid=current_user.uid,
    )
    return ApiResponse(
        success=True,
        data=field,
        message="Field created successfully.",
    )


@router.post(
    "/{farm_id}/fields/{field_id}/measurements",
    response_model=ApiResponse[SoilClimateMeasurement],
    status_code=status.HTTP_201_CREATED,
)
async def log_field_measurement(
    farm_id: str,
    field_id: str,
    measurement: SoilClimateMeasurement,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Record a typed soil and climate measurement snapshot on a field.

    Missing measurement fields are strictly preserved as None without zero coercion.
    """
    saved_measurement = farm_service.add_measurement(
        farm_id=farm_id,
        field_id=field_id,
        measurement=measurement,
        owner_uid=current_user.uid,
    )
    return ApiResponse(
        success=True,
        data=saved_measurement,
        message="Soil and climate measurement logged successfully.",
    )


@router.get(
    "/{farm_id}/fields/{field_id}/measurements",
    response_model=ApiResponse[list[SoilClimateMeasurement]],
)
async def get_field_measurements(
    farm_id: str,
    field_id: str,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
):
    """Retrieve full chronological measurement history for a field."""
    measurements = farm_service.get_measurements(
        farm_id=farm_id,
        field_id=field_id,
        owner_uid=current_user.uid,
    )
    return ApiResponse(
        success=True,
        data=measurements,
        message=f"Retrieved {len(measurements)} measurement(s).",
    )
