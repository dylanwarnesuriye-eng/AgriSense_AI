"""Authoritative agricultural reference registry for fertilizer advisory knowledge base.

Maintains provenance for every agronomic rule.
Prioritizes guidance from the Sri Lankan Department of Agriculture (DOA) and FAO,
with explicit review and validation status tags.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class AgronomicSource:
    source_id: str
    institution: str
    publication_title: str
    document_reference: str
    publication_year: int
    applicable_crops: list[str]
    geographic_applicability: str
    review_status: str  # 'unvalidated_draft', 'expert_reviewed', 'approved'
    reviewer: str | None = None
    rule_version: str = "v0.1-draft-scaffold"
    notes: str = ""


# Reference Registry
REFERENCE_REGISTRY: dict[str, AgronomicSource] = {
    "SRC_DOA_RICE_2020": AgronomicSource(
        source_id="SRC_DOA_RICE_2020",
        institution="Department of Agriculture (DOA), Sri Lanka",
        publication_title="Fertilizer Recommendations for Rice Cultivation in Sri Lanka",
        document_reference="DOA Technical Bulletin No. 42 / Rice Research and Development Institute (RRDI) Batalagoda",
        publication_year=2020,
        applicable_crops=["Rice", "Paddy"],
        geographic_applicability="Sri Lanka (Low Country Wet, Intermediate, and Dry Zones)",
        review_status="unvalidated_draft",
        reviewer=None,
        rule_version="v0.1-draft-scaffold",
        notes="Awaiting formal localized soil-testing calibration sign-off before operational use.",
    ),
    "SRC_DOA_OFC_2019": AgronomicSource(
        source_id="SRC_DOA_OFC_2019",
        institution="Department of Agriculture (DOA), Sri Lanka",
        publication_title="Crop Management Guidelines for Other Field Crops (Maize, Soybean, Grain Legumes)",
        document_reference="Field Crops Research and Development Institute (FCRDI) Mahailluppallama",
        publication_year=2019,
        applicable_crops=["Maize", "Soybean", "Chickpea", "Mungbean", "Blackgram"],
        geographic_applicability="Sri Lanka Dry and Intermediate Zones",
        review_status="unvalidated_draft",
        reviewer=None,
        rule_version="v0.1-draft-scaffold",
        notes="Scaffold rules representing baseline nutrient recommendations for other field crops.",
    ),
    "SRC_FAO_56_1998": AgronomicSource(
        source_id="SRC_FAO_56_1998",
        institution="Food and Agriculture Organization of the United Nations (FAO)",
        publication_title="Crop Evapotranspiration - Guidelines for Computing Crop Water Requirements",
        document_reference="FAO Irrigation and Drainage Paper 56",
        publication_year=1998,
        applicable_crops=["Wheat", "Maize", "Barley", "Rice", "Soybean", "Cotton"],
        geographic_applicability="Global (Requires local calibration)",
        review_status="unvalidated_draft",
        reviewer=None,
        rule_version="v0.1-draft-scaffold",
        notes="International reference standard for crop depletion fractions (p) and phenological stages.",
    ),
    "SRC_FAO_SOIL_FERT_2006": AgronomicSource(
        source_id="SRC_FAO_SOIL_FERT_2006",
        institution="Food and Agriculture Organization of the United Nations (FAO)",
        publication_title="Plant Nutrition for Food Security: A Guide for Integrated Nutrient Management",
        document_reference="FAO Fertilizer and Plant Nutrition Bulletin 16",
        publication_year=2006,
        applicable_crops=["Wheat", "Barley", "Corn", "Rice", "Soybean"],
        geographic_applicability="Global (Requires local soil testing standard)",
        review_status="unvalidated_draft",
        reviewer=None,
        rule_version="v0.1-draft-scaffold",
        notes="General framework for soil macronutrient status classification and oxide conversion formulas.",
    ),
}


def get_source(source_id: str) -> AgronomicSource | None:
    """Retrieve an agronomic reference source by ID."""
    return REFERENCE_REGISTRY.get(source_id)


def list_sources() -> list[AgronomicSource]:
    """Return all registered reference sources."""
    return list(REFERENCE_REGISTRY.values())
