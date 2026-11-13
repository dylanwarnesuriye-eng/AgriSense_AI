"""Crop profile configurations and routing for irrigation advisory.

Distinguishes between standard upland crops (evaluated via root-zone soil water depletion)
and flooded lowland crops (paddy rice) which require specialized ponding / AWD regimes.
"""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class CropProfile:
    canonical_name: str
    is_paddy: bool
    status: str  # 'approved_scaffold', 'validation_pending', 'unsupported'
    indicative_root_depth_cm: float | None
    fao56_depletion_fraction_p: float | None  # critical depletion fraction before stress
    advisory_notes: str
    aliases: list[str] = field(default_factory=list)


# Crop Registry
CROP_PROFILES: dict[str, CropProfile] = {
    "wheat": CropProfile(
        canonical_name="Wheat",
        is_paddy=False,
        status="approved_scaffold",
        indicative_root_depth_cm=100.0,
        fao56_depletion_fraction_p=0.55,
        advisory_notes="Upland cereal. Critical stages: crown root initiation, booting, flowering, grain filling.",
        aliases=["wheat", "triticum"],
    ),
    "maize": CropProfile(
        canonical_name="Maize",
        is_paddy=False,
        status="approved_scaffold",
        indicative_root_depth_cm=120.0,
        fao56_depletion_fraction_p=0.55,
        advisory_notes="Upland cereal. Highly sensitive to moisture stress during tasseling, silking, and early grain filling.",
        aliases=["maize", "corn", "zea mays"],
    ),
    "barley": CropProfile(
        canonical_name="Barley",
        is_paddy=False,
        status="approved_scaffold",
        indicative_root_depth_cm=90.0,
        fao56_depletion_fraction_p=0.55,
        advisory_notes="Moderate drought tolerance. Sensitive during flowering and milk stages.",
        aliases=["barley", "hordeum"],
    ),
    "soybean": CropProfile(
        canonical_name="Soybean",
        is_paddy=False,
        status="approved_scaffold",
        indicative_root_depth_cm=80.0,
        fao56_depletion_fraction_p=0.50,
        advisory_notes="Legume. Moisture stress during flowering and pod elongation drastically suppresses yield.",
        aliases=["soybean", "soya", "glycine max"],
    ),
    "cotton": CropProfile(
        canonical_name="Cotton",
        is_paddy=False,
        status="approved_scaffold",
        indicative_root_depth_cm=120.0,
        fao56_depletion_fraction_p=0.65,
        advisory_notes="Deep rooted. Sensitive during peak squaring and flowering stages.",
        aliases=["cotton", "gossypium"],
    ),
    "chickpea": CropProfile(
        canonical_name="Chickpea",
        is_paddy=False,
        status="approved_scaffold",
        indicative_root_depth_cm=70.0,
        fao56_depletion_fraction_p=0.60,
        advisory_notes="Sensitive to waterlogging. Moderate drought tolerance.",
        aliases=["chickpea", "gram"],
    ),
    # Lowland / Flooded Crop
    "rice": CropProfile(
        canonical_name="Rice",
        is_paddy=True,
        status="approved_scaffold",
        indicative_root_depth_cm=40.0,
        fao56_depletion_fraction_p=0.20,
        advisory_notes=(
            "Lowland paddy rice requires standing water (3–5 cm ponding layer) or "
            "monitored Alternate Wetting and Drying (AWD) via a field water tube ('pani pipe'). "
            "Upland soil-water depletion rules do not apply to ponded rice cultivation."
        ),
        aliases=["rice", "paddy", "oryza sativa"],
    ),
}


def normalize_crop_name(name: str | None) -> str | None:
    """Normalize input crop name string."""
    if not name or not name.strip():
        return None
    return name.strip().lower()


def get_crop_profile(crop_name: str | None) -> CropProfile | None:
    """Retrieve crop profile by canonical name or alias."""
    norm = normalize_crop_name(crop_name)
    if not norm:
        return None

    # Check direct keys
    if norm in CROP_PROFILES:
        return CROP_PROFILES[norm]

    # Check aliases
    for profile in CROP_PROFILES.values():
        if norm in profile.aliases or norm == profile.canonical_name.lower():
            return profile

    return None
