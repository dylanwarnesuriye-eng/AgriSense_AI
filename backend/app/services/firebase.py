"""Firebase Admin SDK service provider.

Initializes Firebase Admin gracefully, supporting service account credentials or local emulator.
Never logs or prints private keys or sensitive credential contents.
"""
import logging
import os
import threading
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_app: Any = None
_init_lock = threading.Lock()


def init_firebase_admin() -> bool:
    """Initialize Firebase Admin SDK exactly once if valid credentials or emulators are configured."""
    global _firebase_app
    if _firebase_app is not None:
        return True

    with _init_lock:
        if _firebase_app is not None:
            return True

        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            # 1. Prioritize explicit FIREBASE_CREDENTIALS_PATH
            cred_path = settings.FIREBASE_CREDENTIALS_PATH.strip() if settings.FIREBASE_CREDENTIALS_PATH else ""
            if cred_path:
                if not os.path.exists(cred_path) and not os.path.isabs(cred_path):
                    # Check relative to backend directory
                    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
                    alt_path = os.path.normpath(os.path.join(backend_root, cred_path))
                    if os.path.exists(alt_path):
                        cred_path = alt_path

                if not os.path.exists(cred_path):
                    logger.error(f"Configured FIREBASE_CREDENTIALS_PATH does not exist: {cred_path}")
                    return False

                cred = credentials.Certificate(cred_path)
                _firebase_app = firebase_admin.initialize_app(cred)
                # Verify that Firestore client can be instantiated
                _ = firestore.client()
                project_id = getattr(cred, "project_id", None) or getattr(_firebase_app, "project_id", "configured")
                logger.info(f"Firebase Admin initialized successfully with service account for project: {project_id}")
                return True

            # 2. Check for Firebase Emulators or Google Application Default Credentials
            has_emulator = bool(os.environ.get("FIRESTORE_EMULATOR_HOST") or os.environ.get("FIREBASE_AUTH_EMULATOR_HOST") or settings.FIRESTORE_EMULATOR_HOST or settings.FIREBASE_AUTH_EMULATOR_HOST)
            has_adc = bool(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))

            if has_emulator or has_adc:
                _firebase_app = firebase_admin.initialize_app()
                _ = firestore.client()
                logger.info("Firebase Admin initialized with emulator or Application Default Credentials.")
                return True

            # 3. No credentials provided
            logger.warning(
                "Firebase Admin SDK not initialized: No valid FIREBASE_CREDENTIALS_PATH, "
                "GOOGLE_APPLICATION_CREDENTIALS, or active emulators found."
            )
            return False

        except Exception as e:  # noqa: BLE001
            logger.warning(
                f"Firebase Admin SDK initialization failed: {type(e).__name__}: {e}. "
                "Cloud Firestore and live Firebase Authentication will be unavailable."
            )
            _firebase_app = None
            return False


def get_firestore_client():
    """Retrieve Firestore client if Firebase Admin is initialized."""
    if not init_firebase_admin():
        return None

    try:
        from firebase_admin import firestore

        return firestore.client()
    except Exception as e:  # noqa: BLE001
        logger.debug(f"Firestore client unavailable: {e}")
        return None


def get_firebase_project_id() -> str | None:
    """Retrieve active Firebase project ID if initialized."""
    if _firebase_app is None:
        init_firebase_admin()
    if _firebase_app is None:
        return None
    return getattr(_firebase_app, "project_id", None)


