"""Service for managing farms, fields, and measurement histories."""
import logging

from fastapi import HTTPException, status

from app.modules.farm_management.schemas import (
    FarmCreate,
    FarmModel,
    FarmUpdate,
    FieldCreate,
    FieldModel,
    SoilClimateMeasurement,
)
from app.services.firestore_repo import PersistenceUnavailableError, firestore_repo

logger = logging.getLogger(__name__)


class FarmService:
    """Business logic for farm and field management with user access control."""

    def create_farm(self, farm_in: FarmCreate, owner_uid: str) -> FarmModel:
        """Create a new farm entity for the authenticated user."""
        farm = FarmModel(
            owner_uid=owner_uid,
            name=farm_in.name,
            location=farm_in.location,
            total_area_hectares=farm_in.total_area_hectares,
            notes=farm_in.notes,
        )
        try:
            saved_dict = firestore_repo.save_farm(farm.model_dump())
        except PersistenceUnavailableError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            ) from e
        logger.info(f"Created farm {farm.farm_id} for user {owner_uid}.")
        return FarmModel.model_validate(saved_dict)

    def list_farms(self, owner_uid: str) -> list[FarmModel]:
        """List all farms owned by the user."""
        try:
            farm_dicts = firestore_repo.list_farms(owner_uid)
        except PersistenceUnavailableError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            ) from e
        return [FarmModel.model_validate(d) for d in farm_dicts]

    def get_farm(self, farm_id: str, owner_uid: str) -> FarmModel:
        """Fetch farm by ID with strict ownership validation."""
        try:
            farm_dict = firestore_repo.get_farm(farm_id)
        except PersistenceUnavailableError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            ) from e
        if not farm_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farm '{farm_id}' was not found.",
            )
        if farm_dict.get("owner_uid") != owner_uid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to view or modify this farm.",
            )
        return FarmModel.model_validate(farm_dict)

    def update_farm(self, farm_id: str, farm_update: FarmUpdate, owner_uid: str) -> FarmModel:
        """Update farm profile attributes."""
        farm = self.get_farm(farm_id, owner_uid)
        update_data = farm_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(farm, key, value)

        try:
            saved_dict = firestore_repo.save_farm(farm.model_dump())
        except PersistenceUnavailableError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            ) from e
        logger.info(f"Updated farm {farm_id} for user {owner_uid}.")
        return FarmModel.model_validate(saved_dict)

    def create_field(self, farm_id: str, field_in: FieldCreate, owner_uid: str) -> FieldModel:
        """Add a field plot to an existing farm."""
        farm = self.get_farm(farm_id, owner_uid)
        new_field = FieldModel(
            farm_id=farm_id,
            name=field_in.name,
            area_hectares=field_in.area_hectares,
            soil_type=field_in.soil_type,
            crop_currently_planted=field_in.crop_currently_planted,
        )
        farm.fields.append(new_field)
        try:
            firestore_repo.save_farm(farm.model_dump())
        except PersistenceUnavailableError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            ) from e
        logger.info(f"Added field {new_field.field_id} to farm {farm_id}.")
        return new_field

    def add_measurement(
        self,
        farm_id: str,
        field_id: str,
        measurement: SoilClimateMeasurement,
        owner_uid: str,
    ) -> SoilClimateMeasurement:
        """Append a typed soil/climate measurement to field history."""
        farm = self.get_farm(farm_id, owner_uid)
        target_field = next((f for f in farm.fields if f.field_id == field_id), None)
        if not target_field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Field '{field_id}' was not found on farm '{farm_id}'.",
            )

        target_field.measurements.append(measurement)
        try:
            firestore_repo.save_farm(farm.model_dump())
        except PersistenceUnavailableError as e:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            ) from e
        logger.info(
            f"Logged measurement {measurement.measurement_id} on field {field_id} "
            f"(missing values preserved as None)."
        )
        return measurement

    def get_measurements(
        self,
        farm_id: str,
        field_id: str,
        owner_uid: str,
    ) -> list[SoilClimateMeasurement]:
        """Retrieve complete measurement history for a field."""
        farm = self.get_farm(farm_id, owner_uid)
        target_field = next((f for f in farm.fields if f.field_id == field_id), None)
        if not target_field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Field '{field_id}' was not found on farm '{farm_id}'.",
            )
        return target_field.measurements


farm_service = FarmService()
