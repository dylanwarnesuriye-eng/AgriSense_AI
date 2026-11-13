"""Constants and strict crop boundaries for Crop Yield Prediction module."""
from typing import Final

# The yield dataset supports ONLY these 5 crops
SUPPORTED_YIELD_CROPS: Final[list[str]] = [
    "wheat",
    "barley",
    "corn",
    "rice",
    "soybean",
]

# Canonical Titlecase crop names matching dataset categories
SUPPORTED_CROP_NAMES_TITLE: Final[list[str]] = [
    "Wheat",
    "Barley",
    "Corn",
    "Rice",
    "Soybean",
]

# Normalization mapping for case and common aliases
CROP_NORMALIZATION_MAP: Final[dict[str, str]] = {
    "wheat": "Wheat",
    "barley": "Barley",
    "corn": "Corn",
    "maize": "Corn",  # Maize maps directly to Corn
    "rice": "Rice",
    "soybean": "Soybean",
}

# Case-insensitive normalized set including common synonym
NORMALIZED_SUPPORTED_CROPS: Final[set[str]] = set(CROP_NORMALIZATION_MAP.keys())

# Cross-module integrated pathway: only Rice and Maize/Corn can transition from Crop Recommendation
INTEGRATED_PATHWAY_MAP: Final[dict[str, str]] = {
    "rice": "Rice",
    "maize": "Corn",
    "corn": "Corn",
}

INTEGRATED_PATHWAY_CROPS: Final[set[str]] = set(INTEGRATED_PATHWAY_MAP.keys())

# Canonical feature lists for yield model
CORE_NUMERICAL_FEATURES: Final[list[str]] = [
    "soil_ph",
    "soil_moisture",
    "avg_temperature",
    "total_rainfall",
    "nitrogen_content",
    "phosphorus_content",
    "potassium_content",
]

CORE_CATEGORICAL_FEATURES: Final[list[str]] = [
    "crop_type",
]

EXTENDED_NUMERICAL_FEATURES: Final[list[str]] = CORE_NUMERICAL_FEATURES + [
    "fertilizer_amount",
    "pesticide_usage",
    "sunlight_hours",
    "irrigation_frequency",
]

EXTENDED_CATEGORICAL_FEATURES: Final[list[str]] = CORE_CATEGORICAL_FEATURES + [
    "region",
    "season",
]

ALL_MODEL_FEATURES: Final[list[str]] = EXTENDED_NUMERICAL_FEATURES + EXTENDED_CATEGORICAL_FEATURES
