"""Fertilizer Advisory Module (Rule-Based Knowledge System)."""
from app.modules.fertilizer_advisory.calculations import (
    calculate_lime_requirement,
    calculate_product_requirement,
    elemental_k_to_oxide,
    elemental_p_to_oxide,
    oxide_to_elemental_k,
    oxide_to_elemental_p,
)
from app.modules.fertilizer_advisory.engine import (
    FertilizerRuleEngine,
    ForwardChainingResult,
)
from app.modules.fertilizer_advisory.inference import (
    FertilizerAdvisoryService,
    fertilizer_service,
)
from app.modules.fertilizer_advisory.knowledge_base import (
    FERTILIZER_PRODUCTS,
    FERTILIZER_RULES,
    RULE_APPROVAL_STATUS,
    RULE_BASE_VERSION,
    SOIL_TEST_STANDARDS,
    AgronomicRule,
    FertilizerProduct,
    SoilTestStandard,
)
from app.modules.fertilizer_advisory.references import (
    REFERENCE_REGISTRY,
    AgronomicSource,
    get_source,
    list_sources,
)
from app.modules.fertilizer_advisory.schemas import (
    AgronomicRuleDTO,
    AgronomicSourceDTO,
    FertilizerAdvisoryInput,
    FertilizerAdvisoryOutput,
    FertilizerProductDTO,
    FertilizerProductRecommendation,
    PreviousFertilizerApplication,
)

__all__ = [
    "FERTILIZER_PRODUCTS",
    "FERTILIZER_RULES",
    "REFERENCE_REGISTRY",
    "RULE_APPROVAL_STATUS",
    "RULE_BASE_VERSION",
    "SOIL_TEST_STANDARDS",
    "AgronomicRule",
    "AgronomicRuleDTO",
    "AgronomicSource",
    "AgronomicSourceDTO",
    "FertilizerAdvisoryInput",
    "FertilizerAdvisoryOutput",
    "FertilizerAdvisoryService",
    "FertilizerProduct",
    "FertilizerProductDTO",
    "FertilizerProductRecommendation",
    "FertilizerRuleEngine",
    "ForwardChainingResult",
    "PreviousFertilizerApplication",
    "SoilTestStandard",
    "calculate_lime_requirement",
    "calculate_product_requirement",
    "elemental_k_to_oxide",
    "elemental_p_to_oxide",
    "fertilizer_service",
    "get_source",
    "list_sources",
    "oxide_to_elemental_k",
    "oxide_to_elemental_p",
]
