"""Irrigation Advisory Module (Mamdani Fuzzy Logic)."""
from app.modules.irrigation_advisory.crop_profiles import (
    CROP_PROFILES,
    CropProfile,
    get_crop_profile,
)
from app.modules.irrigation_advisory.engine import (
    MamdaniEvaluationResult,
    MamdaniIrrigationEngine,
    RuleActivationTrace,
)
from app.modules.irrigation_advisory.fuzzy_sets import (
    ATMOSPHERIC_DEMAND_SETS,
    EFFECTIVE_RAINFALL_SETS,
    IRRIGATION_URGENCY_SETS,
    SOIL_WATER_DEPLETION_SETS,
    FuzzySet,
    fuzzify_variable,
    trapmf,
    trimf,
)
from app.modules.irrigation_advisory.inference import (
    IrrigationAdvisoryService,
    irrigation_service,
)
from app.modules.irrigation_advisory.rules import (
    MAMDANI_RULES,
    RULE_VALIDATION_STATUS,
    RULE_VERSION,
    FuzzyRule,
    detect_rule_conflicts,
    verify_rule_coverage,
)
from app.modules.irrigation_advisory.schemas import (
    IrrigationAdvisoryInput,
    IrrigationAdvisoryOutput,
    RuleBaseStatusResponse,
    RuleDefinitionDTO,
    SupportedCropDTO,
)

__all__ = [
    "ATMOSPHERIC_DEMAND_SETS",
    "CROP_PROFILES",
    "EFFECTIVE_RAINFALL_SETS",
    "IRRIGATION_URGENCY_SETS",
    "MAMDANI_RULES",
    "RULE_VALIDATION_STATUS",
    "RULE_VERSION",
    "SOIL_WATER_DEPLETION_SETS",
    "CropProfile",
    "FuzzyRule",
    "FuzzySet",
    "IrrigationAdvisoryInput",
    "IrrigationAdvisoryOutput",
    "IrrigationAdvisoryService",
    "MamdaniEvaluationResult",
    "MamdaniIrrigationEngine",
    "RuleActivationTrace",
    "RuleBaseStatusResponse",
    "RuleDefinitionDTO",
    "SupportedCropDTO",
    "detect_rule_conflicts",
    "fuzzify_variable",
    "get_crop_profile",
    "irrigation_service",
    "trapmf",
    "trimf",
    "verify_rule_coverage",
]
