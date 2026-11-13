"""Runtime inference service for Crop Recommendation.

Decoupled from model training logic. Loads serialized Decision Tree model artifact.
Enforces strict feature ordering, input bounds, and agronomic unit warnings.
"""
import json
import logging
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.modules.crop_recommendation.constants import SUPPORTED_RECOMMENDATION_CROPS
from app.modules.crop_recommendation.schemas import (
    CropRecommendationInput,
    CropRecommendationOutput,
)

logger = logging.getLogger(__name__)

# Feature names in the exact sequence expected by the trained model
FEATURE_NAMES: list[str] = [
    "N",
    "P",
    "K",
    "temperature",
    "humidity",
    "ph",
    "rainfall",
]


class UnverifiedUnitsError(ValueError):
    """Raised when live production prediction is attempted without verified agronomic calibration."""


class CropRecommendationService:
    def __init__(self, model_path: Path | None = None, metadata_path: Path | None = None):
        if model_path is None:
            # Default to canonical saved model location
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.model_path = base_dir / "models" / "saved" / "crop_decision_tree_v1.0.joblib"
            self.metadata_path = base_dir / "models" / "saved" / "crop_decision_tree_v1.0_metadata.json"
        else:
            self.model_path = model_path
            self.metadata_path = metadata_path

        self._model: Any = None
        self._metadata: dict[str, Any] = {}
        self.supported_crops = SUPPORTED_RECOMMENDATION_CROPS
        # Integrated recommendation-to-yield pathway is strictly supported for Rice and Maize/Corn
        self._pathway_supported = {"rice", "maize"}

        # Attempt to load model artifact if available
        self.load_model()

    def is_model_loaded(self) -> bool:
        return self._model is not None

    def load_model(self) -> bool:
        """Load trained Decision Tree model and metadata from local trusted artifact."""
        if not (self.model_path and self.model_path.exists()):
            logger.warning(f"Model artifact not found at {self.model_path}. Service will run in uninitialized state.")
            return False

        try:
            self._model = joblib.load(self.model_path)
            logger.info(f"Successfully loaded Decision Tree model from: {self.model_path}")

            if self.metadata_path and self.metadata_path.exists():
                with open(self.metadata_path, encoding="utf-8") as f:
                    self._metadata = json.load(f)
                logger.info(f"Loaded model metadata version: {self._metadata.get('model_version')}")

            return True
        except (OSError, ValueError, TypeError, KeyError, RuntimeError) as e:
            logger.error(f"Error loading model artifact from {self.model_path}: {e}")
            self._model = None
            return False

    @property
    def model_version(self) -> str:
        return self._metadata.get("model_version", "v1.0")

    def predict(self, features: CropRecommendationInput) -> CropRecommendationOutput:
        """Execute Decision Tree inference on validated input features."""
        # 1. Guard against unverified units in production mode
        if not features.academic_demo_mode:
            raise UnverifiedUnitsError(
                "Live production inference is restricted because soil NPK measurement "
                "units and climatic observation windows require certified agronomic calibration. "
                "Enable 'academic_demo_mode=True' to evaluate on dataset-compatible scales."
            )

        # 2. Check model readiness
        if not self.is_model_loaded():
            raise RuntimeError("Decision Tree model is not loaded. Ensure the training pipeline has been executed.")

        # 3. Assemble feature DataFrame in strict canonical order with verified column names
        feature_df = pd.DataFrame(
            [
                {
                    "N": float(features.nitrogen),
                    "P": float(features.phosphorus),
                    "K": float(features.potassium),
                    "temperature": float(features.temperature),
                    "humidity": float(features.humidity),
                    "ph": float(features.ph),
                    "rainfall": float(features.rainfall),
                }
            ],
            columns=FEATURE_NAMES,
        )

        # 4. Perform prediction
        raw_prediction = self._model.predict(feature_df)[0]
        recommended_crop = str(raw_prediction).strip().lower()

        # 5. Probability distribution kept internal per guidelines
        # self._model.predict_proba(feature_df) is withheld until formal calibration

        # 6. Check integrated pathway availability (Rice and Maize only)
        is_pathway = recommended_crop in self._pathway_supported

        # 7. Agronomic warnings
        warnings = [
            "Academic Demonstration Mode: Input values are evaluated against the benchmark 22-crop dataset distribution.",
            "Soil nutrient and climatic units require localized agronomic calibration prior to actual field application.",
        ]
        if is_pathway:
            warnings.append(
                f"Crop '{recommended_crop}' supports an integrated recommendation-to-yield estimation pathway."
            )

        return CropRecommendationOutput(
            recommended_crop=recommended_crop,
            model_version=self.model_version,
            prediction_status="success",
            confidence=None,  # Kept internal until probability calibration
            available_crops=self.supported_crops,
            pathway_available=is_pathway,
            units_verified=False,
            warnings=warnings,
        )


crop_service = CropRecommendationService()
