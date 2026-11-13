"""Firestore repository provider for Farms, Fields, and Assessments.

Provides audited persistence with live Firestore (or Firestore Emulator)
and an in-memory thread-safe fallback strictly restricted to explicit testing environments.
"""
import copy
import logging
import threading
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.services.firebase import get_firestore_client

logger = logging.getLogger(__name__)


class PersistenceUnavailableError(RuntimeError):
    """Raised when Firestore is unavailable and in-memory fallback is restricted."""


class FirestoreRepository:
    """Repository handling persistence for farms, fields, and assessments."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        # In-memory storage structures (strictly for test harnesses)
        self._users_store: dict[str, dict[str, Any]] = {}
        self._farms_store: dict[str, dict[str, Any]] = {}
        self._assessments_store: dict[str, dict[str, Any]] = {}

    def _is_firestore_available(self) -> bool:
        """Check if live Firestore client is operational."""
        return get_firestore_client() is not None

    def _check_fallback_permission(self, operation: str) -> None:
        """Ensure in-memory storage fallback is only permitted in explicit test environments."""
        if not settings.is_testing:
            logger.error(
                f"Persistence failure: Attempted in-memory fallback for '{operation}' "
                f"while in environment '{settings.ENVIRONMENT}'."
            )
            raise PersistenceUnavailableError(
                f"Cloud Firestore persistence is unavailable for {operation}. "
                "Silent in-memory fallback is strictly restricted to explicit testing environments."
            )

    # -------------------------------------------------------------------------
    # User Profile Persistence
    # -------------------------------------------------------------------------
    def sync_user(self, user_data: dict[str, Any]) -> dict[str, Any]:
        """Save or update authenticated user profile document in 'users' collection."""
        uid = user_data["uid"]
        now = datetime.now(timezone.utc).isoformat()
        user_data.setdefault("created_at", now)
        user_data["updated_at"] = now

        client = get_firestore_client()
        if client:
            try:
                doc_ref = client.collection("users").document(uid)
                doc = doc_ref.get()
                if doc.exists:
                    existing = doc.to_dict() or {}
                    # Preserve existing role unless explicitly specified
                    if "role" not in user_data:
                        user_data["role"] = existing.get("role", "farmer")
                else:
                    # New user profile creation strictly defaults to farmer
                    user_data.setdefault("role", "farmer")

                doc_ref.set(user_data, merge=True)
                user_data["_storage_backend"] = "firestore"
                logger.debug(f"User {uid} synced to Firestore with role '{user_data.get('role')}'.")
            except Exception as e:
                logger.error(f"Failed to persist user {uid} to Firestore: {e}")
                raise
        else:
            self._check_fallback_permission("sync_user")
            # In-memory test store
            if uid in self._users_store and "role" not in user_data:
                user_data["role"] = self._users_store[uid].get("role", "farmer")
            else:
                user_data.setdefault("role", "farmer")
            user_data["_storage_backend"] = "in_memory_test_mock"

        with self._lock:
            self._users_store[uid] = copy.deepcopy(user_data)

        return copy.deepcopy(user_data)

    def get_user(self, uid: str) -> dict[str, Any] | None:
        """Get user document by UID, ensuring role defaults safely to 'farmer'."""
        client = get_firestore_client()
        if client:
            try:
                doc = client.collection("users").document(uid).get()
                if doc.exists:
                    data = doc.to_dict() or {}
                    if not data.get("role"):
                        data["role"] = "farmer"
                    return data
                return None
            except Exception as e:
                logger.warning(f"Error fetching user {uid} from Firestore: {e}")
                raise

        self._check_fallback_permission("get_user")
        with self._lock:
            user = self._users_store.get(uid)
            if user:
                user_copy = copy.deepcopy(user)
                if not user_copy.get("role"):
                    user_copy["role"] = "farmer"
                return user_copy
            return None

    # -------------------------------------------------------------------------
    # Farm & Field Management
    # -------------------------------------------------------------------------
    def save_farm(self, farm_data: dict[str, Any]) -> dict[str, Any]:
        """Save or update farm document."""
        farm_id = farm_data["farm_id"]
        now = datetime.now(timezone.utc).isoformat()
        farm_data.setdefault("created_at", now)
        farm_data["updated_at"] = now

        client = get_firestore_client()
        if client:
            try:
                client.collection("farms").document(farm_id).set(farm_data)
                farm_data["_storage_backend"] = "firestore"
                logger.debug(f"Farm {farm_id} saved to Firestore.")
            except Exception as e:
                logger.error(f"Failed to persist farm {farm_id} to Firestore: {e}")
                raise
        else:
            self._check_fallback_permission("save_farm")
            farm_data["_storage_backend"] = "in_memory_test_mock"

        with self._lock:
            self._farms_store[farm_id] = copy.deepcopy(farm_data)

        return copy.deepcopy(farm_data)

    def get_farm(self, farm_id: str, owner_uid: str | None = None) -> dict[str, Any] | None:
        """Get farm document by ID with optional owner verification."""
        client = get_firestore_client()
        if client:
            try:
                doc = client.collection("farms").document(farm_id).get()
                if doc.exists:
                    data = doc.to_dict()
                    if owner_uid and data.get("owner_uid") != owner_uid:
                        return None
                    return data
                return None
            except Exception as e:
                logger.warning(f"Error fetching farm {farm_id} from Firestore: {e}")
                raise

        self._check_fallback_permission("get_farm")
        with self._lock:
            farm = self._farms_store.get(farm_id)
            if not farm:
                return None
            if owner_uid and farm.get("owner_uid") != owner_uid:
                return None
            return copy.deepcopy(farm)

    def list_farms(self, owner_uid: str) -> list[dict[str, Any]]:
        """List all farms owned by owner_uid."""
        client = get_firestore_client()
        if client:
            try:
                docs = client.collection("farms").where("owner_uid", "==", owner_uid).stream()
                results = [doc.to_dict() for doc in docs]
                return results
            except Exception as e:
                logger.warning(f"Error listing farms from Firestore: {e}")
                raise

        self._check_fallback_permission("list_farms")
        with self._lock:
            return [
                copy.deepcopy(f)
                for f in self._farms_store.values()
                if f.get("owner_uid") == owner_uid
            ]

    def delete_farm(self, farm_id: str, owner_uid: str) -> bool:
        """Delete farm if owned by owner_uid."""
        existing = self.get_farm(farm_id, owner_uid=owner_uid)
        if not existing:
            return False

        client = get_firestore_client()
        if client:
            try:
                client.collection("farms").document(farm_id).delete()
            except Exception as e:
                logger.error(f"Failed to delete farm from Firestore: {e}")
                raise
        else:
            self._check_fallback_permission("delete_farm")

        with self._lock:
            self._farms_store.pop(farm_id, None)
        return True

    # -------------------------------------------------------------------------
    # Assessment History Persistence
    # -------------------------------------------------------------------------
    def save_assessment(self, assessment_data: dict[str, Any]) -> dict[str, Any]:
        """Persist structured assessment run snapshot."""
        assessment_id = assessment_data["assessment_id"]
        now = datetime.now(timezone.utc).isoformat()
        assessment_data.setdefault("timestamp", now)

        client = get_firestore_client()
        if client:
            try:
                client.collection("assessments").document(assessment_id).set(assessment_data)
                assessment_data["_storage_backend"] = "firestore"
                logger.debug(f"Assessment {assessment_id} saved to Firestore.")
            except Exception as e:
                logger.error(f"Failed to persist assessment {assessment_id} to Firestore: {e}")
                raise
        else:
            self._check_fallback_permission("save_assessment")
            assessment_data["_storage_backend"] = "in_memory_test_mock"

        with self._lock:
            self._assessments_store[assessment_id] = copy.deepcopy(assessment_data)

        return copy.deepcopy(assessment_data)

    def get_assessment(self, assessment_id: str, owner_uid: str | None = None) -> dict[str, Any] | None:
        """Retrieve assessment run snapshot by ID."""
        client = get_firestore_client()
        if client:
            try:
                doc = client.collection("assessments").document(assessment_id).get()
                if doc.exists:
                    data = doc.to_dict()
                    if owner_uid and data.get("owner_uid") != owner_uid:
                        return None
                    return data
                return None
            except Exception as e:
                logger.warning(f"Error fetching assessment {assessment_id} from Firestore: {e}")
                raise

        self._check_fallback_permission("get_assessment")
        with self._lock:
            assessment = self._assessments_store.get(assessment_id)
            if not assessment:
                return None
            if owner_uid and assessment.get("owner_uid") != owner_uid:
                return None
            return copy.deepcopy(assessment)

    def list_assessments(self, owner_uid: str, farm_id: str | None = None) -> list[dict[str, Any]]:
        """List assessment history for user with optional farm filter."""
        client = get_firestore_client()
        if client:
            try:
                query = client.collection("assessments").where("owner_uid", "==", owner_uid)
                if farm_id:
                    query = query.where("farm_id", "==", farm_id)
                docs = query.stream()
                results = [doc.to_dict() for doc in docs]
                return sorted(results, key=lambda x: x.get("timestamp", ""), reverse=True)
            except Exception as e:
                logger.warning(f"Error listing assessments from Firestore: {e}")
                raise

        self._check_fallback_permission("list_assessments")
        with self._lock:
            filtered = [
                copy.deepcopy(a)
                for a in self._assessments_store.values()
                if a.get("owner_uid") == owner_uid
                and (farm_id is None or a.get("farm_id") == farm_id)
            ]
            return sorted(filtered, key=lambda x: x.get("timestamp", ""), reverse=True)

    def clear_in_memory_stores(self) -> None:
        """Reset in-memory storage (useful for isolated testing)."""
        with self._lock:
            self._users_store.clear()
            self._farms_store.clear()
            self._assessments_store.clear()


# Singleton repository instance
firestore_repo = FirestoreRepository()
