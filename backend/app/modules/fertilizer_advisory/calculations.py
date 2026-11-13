"""Agronomic calculation service and stoichiometric conversions for Fertilizer Advisory.

Distinguishes:
  - Soil nutrient concentration (e.g., mg/kg, %, ppm)
  - Recommended nutrient application rate (kg N/ha, kg P2O5/ha, kg K2O/ha)
  - Fertilizer product quantity (kg product/ha)
  - Total field requirement (kg product for field)

Strict conversion factors (FAO / IUPAC):
  - P2O5 = P * 2.2914
  - P = P2O5 * 0.4364
  - K2O = K * 1.2046
  - K = K2O * 0.8302
"""
from dataclasses import dataclass

from app.modules.fertilizer_advisory.knowledge_base import (
    FERTILIZER_PRODUCTS,
)

# Conversion Constants
P_TO_P2O5_FACTOR = 2.2914
P2O5_TO_P_FACTOR = 0.4364
K_TO_K2O_FACTOR = 1.2046
K2O_TO_K_FACTOR = 0.8302


@dataclass(frozen=True)
class ProductApplicationPlan:
    product_name: str
    target_nutrient: str
    recommended_nutrient_rate_kgha: float
    nutrient_form: str  # 'N', 'P2O5', 'K2O'
    product_rate_kgha: float | None
    total_field_requirement_kg: float | None
    calculation_status: str  # 'calculated', 'unavailable', 'insufficient_data'
    warnings: list[str]


def elemental_p_to_oxide(p_kg: float) -> float:
    """Convert elemental Phosphorus (P) to Phosphate oxide (P2O5)."""
    return round(p_kg * P_TO_P2O5_FACTOR, 2)


def oxide_to_elemental_p(p2o5_kg: float) -> float:
    """Convert Phosphate oxide (P2O5) to elemental Phosphorus (P)."""
    return round(p2o5_kg * P2O5_TO_P_FACTOR, 2)


def elemental_k_to_oxide(k_kg: float) -> float:
    """Convert elemental Potassium (K) to Potash oxide (K2O)."""
    return round(k_kg * K_TO_K2O_FACTOR, 2)


def oxide_to_elemental_k(k2o_kg: float) -> float:
    """Convert Potash oxide (K2O) to elemental Potassium (K)."""
    return round(k2o_kg * K2O_TO_K_FACTOR, 2)


def calculate_lime_requirement(
    soil_ph: float,
    buffer_ph: float | None = None,
    exchangeable_acidity_cmole: float | None = None,
) -> tuple[float | None, list[str]]:
    """Evaluate lime requirement.

    CRITICAL SAFEGUARD: Soil pH alone cannot determine lime tonnage because buffering
    capacity, clay content, and exchangeable aluminum differ vastly across soil series.
    """
    warnings: list[str] = []
    if buffer_ph is None and exchangeable_acidity_cmole is None:
        warnings.append(
            "Lime requirement cannot be calculated from soil pH alone. Soil buffering capacity "
            "(e.g., SMP buffer pH) or exchangeable acidity (Al3+ + H+) is required to determine "
            "effective calcium carbonate equivalent (CCE) tonnage."
        )
        return None, warnings

    # If buffer pH is provided, a localized SMP table is required
    warnings.append(
        "Buffer pH provided, but localized soil-testing calibration table is required before operational liming."
    )
    return None, warnings


def calculate_product_requirement(
    recommended_nutrients: dict[str, float],
    previous_applications: dict[str, float] | None = None,
    field_area_ha: float | None = None,
    selected_products: dict[str, str] | None = None,
    academic_demo_mode: bool = True,
    is_rule_approved: bool = False,
) -> tuple[list[ProductApplicationPlan], list[str]]:
    """Calculate commercial fertilizer quantities from recommended nutrient rates.

    Args:
        recommended_nutrients: e.g. {'N': 60.0, 'P2O5': 45.0, 'K2O': 40.0}
        previous_applications: nutrient amounts already applied this season
        field_area_ha: total farm field size in hectares
        selected_products: mapping from nutrient to product name, e.g. {'N': 'Urea', 'P2O5': 'TSP', 'K2O': 'MOP'}
        academic_demo_mode: whether calculations are run in demonstration mode
        is_rule_approved: whether the governing agronomic rule is officially verified

    Returns:
        tuple of (list of ProductApplicationPlan, list of calculation warnings)
    """
    plans: list[ProductApplicationPlan] = []
    global_warnings: list[str] = []

    if not is_rule_approved and not academic_demo_mode:
        global_warnings.append(
            "Commercial fertilizer product quantities are suppressed in production mode because the "
            "governing agronomic rule base is unverified."
        )
        return [], global_warnings

    default_product_map = {
        "N": "Urea",
        "P2O5": "TSP",
        "K2O": "MOP",
    }
    prod_map = selected_products or default_product_map
    prev = previous_applications or {}

    for nutrient, raw_rate in recommended_nutrients.items():
        prior_applied = prev.get(nutrient, 0.0)
        net_rate = max(0.0, raw_rate - prior_applied)

        plan_warnings: list[str] = []
        if prior_applied > 0.0:
            plan_warnings.append(
                f"Deducted {prior_applied:.1f} kg {nutrient}/ha from prior application(s); net requirement is {net_rate:.1f} kg/ha."
            )

        prod_name = prod_map.get(nutrient)
        if not prod_name or prod_name not in FERTILIZER_PRODUCTS:
            plans.append(
                ProductApplicationPlan(
                    product_name=prod_name or "Unknown",
                    target_nutrient=nutrient,
                    recommended_nutrient_rate_kgha=net_rate,
                    nutrient_form=nutrient,
                    product_rate_kgha=None,
                    total_field_requirement_kg=None,
                    calculation_status="unavailable",
                    warnings=plan_warnings + [f"No verified composition found for product '{prod_name}'."],
                )
            )
            continue

        prod = FERTILIZER_PRODUCTS[prod_name]
        nutrient_pct = 0.0
        if nutrient == "N":
            nutrient_pct = prod.n_percent
        elif nutrient == "P2O5":
            nutrient_pct = prod.p2o5_percent
        elif nutrient == "K2O":
            nutrient_pct = prod.k2o_percent

        if nutrient_pct <= 0.0:
            plans.append(
                ProductApplicationPlan(
                    product_name=prod.name,
                    target_nutrient=nutrient,
                    recommended_nutrient_rate_kgha=net_rate,
                    nutrient_form=nutrient,
                    product_rate_kgha=None,
                    total_field_requirement_kg=None,
                    calculation_status="unavailable",
                    warnings=plan_warnings + [f"Product '{prod.name}' contains 0% {nutrient}."],
                )
            )
            continue

        # Calculate rate per hectare
        product_rate_kgha = round((net_rate / (nutrient_pct / 100.0)), 2)

        # Calculate total field requirement if field area is valid
        total_field_kg: float | None = None
        if field_area_ha is not None and field_area_ha > 0.0:
            total_field_kg = round(product_rate_kgha * field_area_ha, 2)
        else:
            plan_warnings.append("Total field requirement unavailable: field area in hectares was not provided.")

        if not is_rule_approved:
            plan_warnings.append(
                "Calculated product dosages are demonstration simulations based on scaffold rule v0.1."
            )

        plans.append(
            ProductApplicationPlan(
                product_name=prod.name,
                target_nutrient=nutrient,
                recommended_nutrient_rate_kgha=net_rate,
                nutrient_form=nutrient,
                product_rate_kgha=product_rate_kgha,
                total_field_requirement_kg=total_field_kg,
                calculation_status="calculated",
                warnings=plan_warnings,
            )
        )

    return plans, global_warnings
