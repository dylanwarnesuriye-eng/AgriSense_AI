"""Runtime inference service for Crop Yield Prediction.

Loads serialized Ridge regression pipeline artifact.
Enforces strict 5-crop whitelist, canonical feature sequence,
grouped validation assurance, and agronomic unit warnings.
"""
import json
import logging
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.modules.yield_prediction.constants import (
    ALL_MODEL_FEATURES,
    CROP_NORMALIZATION_MAP,
    INTEGRATED_PATHWAY_MAP,
    NORMALIZED_SUPPORTED_CROPS,
    SUPPORTED_YIELD_CROPS,
)
from app.modules.yield_prediction.schemas import (
    YieldPredictionInput,
    YieldPredictionOutput,
)

logger = logging.getLogger(__name__)


class UnsupportedCropYieldError(ValueError):
    """Raised when yield prediction is requested for an unsupported crop."""


class YieldPredictionService:
    def __init__(self, model_path: Path | None = None, metadata_path: Path | None = None):
        if model_path is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.model_path = base_dir / "models" / "saved" / "yield_regressor_v1.0.joblib"
            self.metadata_path = base_dir / "models" / "saved" / "yield_regressor_v1.0_metadata.json"
        else:
            self.model_path = model_path
            self.metadata_path = metadata_path

        self._pipeline: Any = None
        self._metadata: dict[str, Any] = {}
        self.load_model()

    def is_model_loaded(self) -> bool:
        return self._pipeline is not None

    def load_model(self) -> bool:
        """Load trained regression pipeline and metadata from local trusted artifact."""
        if not (self.model_path and self.model_path.exists()):
            logger.warning(f"Yield regression artifact not found at {self.model_path}.")
            return False

        try:
            self._pipeline = joblib.load(self.model_path)
            logger.info(f"Loaded yield regression pipeline from: {self.model_path}")

            if self.metadata_path and self.metadata_path.exists():
                with open(self.metadata_path, encoding="utf-8") as f:
                    self._metadata = json.load(f)
                logger.info(f"Loaded yield model metadata: {self._metadata.get('model_name')}")

            return True
        except (OSError, ValueError, TypeError, KeyError, RuntimeError) as e:
            logger.error(f"Error loading yield model from {self.model_path}: {e}")
            self._pipeline = None
            return False

    @property
    def model_version(self) -> str:
        return self._metadata.get("model_version", "v1.0")

    def check_integrated_pathway(self, recommendation_crop: str) -> dict[str, Any]:
        """Check if a crop from the Crop Recommendation system has an integrated yield pathway."""
        norm = recommendation_crop.strip().lower()
        if norm in INTEGRATED_PATHWAY_MAP:
            return {
                "yield_supported": True,
                "pathway_available": True,
                "target_crop": INTEGRATED_PATHWAY_MAP[norm],
                "message": f"Crop '{recommendation_crop}' maps directly to '{INTEGRATED_PATHWAY_MAP[norm]}' in Yield Prediction.",
            }
        return {
            "yield_supported": False,
            "pathway_available": False,
            "target_crop": None,
            "message": f"Crop '{recommendation_crop}' does not have an integrated yield pathway. Yield prediction supports only Wheat, Barley, Corn, Rice, and Soybean.",
        }

    def predict(self, features: YieldPredictionInput) -> YieldPredictionOutput:
        """Execute regression yield inference on validated input features."""
        crop_input = features.crop_name.strip().lower()
        if crop_input not in NORMALIZED_SUPPORTED_CROPS:
            raise UnsupportedCropYieldError(
                f"Crop '{features.crop_name}' is not supported for yield prediction. "
                f"Yield prediction supports ONLY: {', '.join(SUPPORTED_YIELD_CROPS)}."
            )

        canonical_crop_name = CROP_NORMALIZATION_MAP[crop_input]

        if not self.is_model_loaded():
            raise RuntimeError("Yield regression model is not loaded. Ensure the training pipeline has been executed.")

        # Construct DataFrame strictly following ALL_MODEL_FEATURES order
        input_data = {
            "soil_ph": float(features.soil_ph),
            "soil_moisture": float(features.soil_moisture),
            "avg_temperature": float(features.avg_temperature),
            "total_rainfall": float(features.total_rainfall),
            "nitrogen_content": float(features.nitrogen_content),
            "phosphorus_content": float(features.phosphorus_content),
            "potassium_content": float(features.potassium_content),
            "fertilizer_amount": float(features.fertilizer_amount) if features.fertilizer_amount is not None else None,
            "pesticide_usage": float(features.pesticide_usage) if features.pesticide_usage is not None else None,
            "sunlight_hours": float(features.sunlight_hours) if features.sunlight_hours is not None else None,
            "irrigation_frequency": int(features.irrigation_frequency) if features.irrigation_frequency is not None else None,
            "crop_type": canonical_crop_name,
            "region": str(features.region),
            "season": str(features.season),
        }

        feature_df = pd.DataFrame([input_data], columns=ALL_MODEL_FEATURES)

        # Predict yield in tonnes per hectare (t/ha)
        raw_yield = float(self._pipeline.predict(feature_df)[0])
        # Ensure biological non-negativity
        yield_tpha = round(max(0.0, raw_yield), 2)

        area = float(features.area_hectares) if features.area_hectares else 1.0
        total_yield = round(yield_tpha * area, 2)

        warnings = [
            "Academic Demonstration Mode: Inputs are evaluated against the challenge dataset distribution.",
            "Yield prediction metric is expressed in metric tonnes per hectare (t/ha).",
            "Soil NPK percentages and agrochemical application amounts require local soil lab calibration before commercial field deployment.",
        ]

        if features.prediction_mode == "prospective" or features.fertilizer_amount is None:
            warnings.append(
                "Prospective Planning Mode: Unobserved seasonal management features were imputed with dataset medians."
            )

        return YieldPredictionOutput(
            crop_name=canonical_crop_name,
            area_hectares=area,
            predicted_yield_tpha=yield_tpha,
            predicted_yield_per_hectare=yield_tpha,
            predicted_yield_total=total_yield,
            prediction_mode=features.prediction_mode,
            model_version=self.model_version,
            prediction_status="success",
            yield_supported=True,
            units_verified=False,
            warnings=warnings,
        )


yield_service = YieldPredictionService()
