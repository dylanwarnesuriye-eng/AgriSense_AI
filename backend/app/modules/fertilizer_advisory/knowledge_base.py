"""Structured, versioned agricultural knowledge base for Fertilizer Advisory.

Defines:
  - Soil test standards & valid units
  - Nutrient status classification thresholds
  - Fertilizer product compositions
  - Declarative forward-chaining agronomic production rules
  - Rule approval metadata (v0.1-draft-scaffold)
"""
from dataclasses import dataclass
from typing import Any

RULE_BASE_VERSION = "v0.1-draft-scaffold"
RULE_APPROVAL_STATUS = "draft_unvalidated"


@dataclass(frozen=True)
class SoilTestStandard:
    method_name: str
    target_nutrient: str
    standard_units: list[str]
    description: str


@dataclass(frozen=True)
class FertilizerProduct:
    name: str
    grade: str
    n_percent: float
    p2o5_percent: float
    k2o_percent: float
    description: str


@dataclass(frozen=True)
class AgronomicRule:
    """Production rule for forward-chaining expert inference."""
    rule_id: str
    crop: str
    region: str | None
    cultivation_condition: str | None  # 'irrigated', 'rainfed', None for all
    growth_stage: str | None  # 'basal', 'tillering', 'panicle_initiation', None
    required_soil_test_method: str | None
    antecedents: dict[str, Any]  # e.g., {'nutrient': 'P', 'status': 'Deficient'}
    consequent_nutrients_kgha: dict[str, float]  # {'N': 40.0, 'P2O5': 30.0, 'K2O': 25.0}
    consequent_recommendation: str
    precedence: int = 10  # Higher integer evaluates first
    evidence_source_id: str = "SRC_DOA_RICE_2020"
    approval_status: str = RULE_APPROVAL_STATUS
    version: str = RULE_BASE_VERSION


# -------------------------------------------------------------------------
# 1. Soil Test Standards
# -------------------------------------------------------------------------
SOIL_TEST_STANDARDS: dict[str, SoilTestStandard] = {
    "Kjeldahl": SoilTestStandard(
        method_name="Kjeldahl",
        target_nutrient="N",
        standard_units=["%", "mg/kg", "ppm"],
        description="Standard sulfuric acid digestion for Total Soil Nitrogen.",
    ),
    "Olsen": SoilTestStandard(
        method_name="Olsen",
        target_nutrient="P",
        standard_units=["mg/kg", "ppm"],
        description="Sodium bicarbonate extraction for available phosphorus in neutral to alkaline soils.",
    ),
    "Bray-1": SoilTestStandard(
        method_name="Bray-1",
        target_nutrient="P",
        standard_units=["mg/kg", "ppm"],
        description="Acid ammonium fluoride extraction for available phosphorus in acid soils.",
    ),
    "NH4OAc": SoilTestStandard(
        method_name="NH4OAc",
        target_nutrient="K",
        standard_units=["mg/kg", "ppm", "meq/100g"],
        description="Neutral 1N ammonium acetate extraction for exchangeable potassium.",
    ),
}

# -------------------------------------------------------------------------
# 2. Commercial Fertilizer Products
# -------------------------------------------------------------------------
FERTILIZER_PRODUCTS: dict[str, FertilizerProduct] = {
    "Urea": FertilizerProduct(
        name="Urea",
        grade="46-0-0",
        n_percent=46.0,
        p2o5_percent=0.0,
        k2o_percent=0.0,
        description="Prilled nitrogen fertilizer (46% elemental N).",
    ),
    "TSP": FertilizerProduct(
        name="Triple Super Phosphate (TSP)",
        grade="0-46-0",
        n_percent=0.0,
        p2o5_percent=46.0,
        k2o_percent=0.0,
        description="High-analysis phosphate fertilizer (46% P2O5, 20.1% elemental P).",
    ),
    "MOP": FertilizerProduct(
        name="Muriate of Potash (MOP)",
        grade="0-0-60",
        n_percent=0.0,
        p2o5_percent=0.0,
        k2o_percent=60.0,
        description="Potassium chloride fertilizer (60% K2O, 49.8% elemental K).",
    ),
    "DAP": FertilizerProduct(
        name="Diammonium Phosphate (DAP)",
        grade="18-46-0",
        n_percent=18.0,
        p2o5_percent=46.0,
        k2o_percent=0.0,
        description="Complex nitrogen-phosphorus fertilizer (18% N, 46% P2O5).",
    ),
}

# -------------------------------------------------------------------------
# 3. Nutrient Status Interpretation Functions
# -------------------------------------------------------------------------
def classify_soil_nitrogen(val_pct: float) -> str:
    """Classify Total Soil Nitrogen (Kjeldahl, %)."""
    if val_pct < 0.10:
        return "Deficient"
    elif val_pct <= 0.20:
        return "Moderate"
    else:
        return "Sufficient"


def classify_soil_phosphorus(val_mgkg: float) -> str:
    """Classify Available Phosphorus (Olsen P, mg/kg or ppm)."""
    if val_mgkg < 10.0:
        return "Deficient"
    elif val_mgkg <= 20.0:
        return "Moderate"
    else:
        return "Sufficient"


def classify_soil_potassium(val_mgkg: float) -> str:
    """Classify Exchangeable Potassium (NH4OAc K, mg/kg or ppm)."""
    if val_mgkg < 60.0:
        return "Deficient"
    elif val_mgkg <= 120.0:
        return "Moderate"
    else:
        return "Sufficient"


# -------------------------------------------------------------------------
# 4. Declarative Production Rules Base
# -------------------------------------------------------------------------
FERTILIZER_RULES: list[AgronomicRule] = [
    # --- RICE (Lowland / Paddy) ---
    AgronomicRule(
        rule_id="RULE_RICE_N_DEF",
        crop="Rice",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="Kjeldahl",
        antecedents={"nutrient": "N", "status": "Deficient"},
        consequent_nutrients_kgha={"N": 60.0},
        consequent_recommendation="Apply basal nitrogen to compensate for low soil reserve.",
        precedence=20,
        evidence_source_id="SRC_DOA_RICE_2020",
    ),
    AgronomicRule(
        rule_id="RULE_RICE_N_MOD",
        crop="Rice",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="Kjeldahl",
        antecedents={"nutrient": "N", "status": "Moderate"},
        consequent_nutrients_kgha={"N": 35.0},
        consequent_recommendation="Apply maintenance basal nitrogen.",
        precedence=15,
        evidence_source_id="SRC_DOA_RICE_2020",
    ),
    AgronomicRule(
        rule_id="RULE_RICE_N_SUF",
        crop="Rice",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="Kjeldahl",
        antecedents={"nutrient": "N", "status": "Sufficient"},
        consequent_nutrients_kgha={"N": 0.0},
        consequent_recommendation="Soil nitrogen adequate; omit basal nitrogen application to prevent lodging.",
        precedence=10,
        evidence_source_id="SRC_DOA_RICE_2020",
    ),
    AgronomicRule(
        rule_id="RULE_RICE_P_DEF",
        crop="Rice",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="Olsen",
        antecedents={"nutrient": "P", "status": "Deficient"},
        consequent_nutrients_kgha={"P2O5": 45.0},
        consequent_recommendation="Apply basal phosphate to build soil phosphorus reserves.",
        precedence=20,
        evidence_source_id="SRC_DOA_RICE_2020",
    ),
    AgronomicRule(
        rule_id="RULE_RICE_P_MOD",
        crop="Rice",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="Olsen",
        antecedents={"nutrient": "P", "status": "Moderate"},
        consequent_nutrients_kgha={"P2O5": 25.0},
        consequent_recommendation="Apply maintenance phosphate at land preparation.",
        precedence=15,
        evidence_source_id="SRC_DOA_RICE_2020",
    ),
    AgronomicRule(
        rule_id="RULE_RICE_P_SUF",
        crop="Rice",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="Olsen",
        antecedents={"nutrient": "P", "status": "Sufficient"},
        consequent_nutrients_kgha={"P2O5": 0.0},
        consequent_recommendation="Soil available phosphorus adequate; skip phosphate fertilizer for this season.",
        precedence=10,
        evidence_source_id="SRC_DOA_RICE_2020",
    ),
    AgronomicRule(
        rule_id="RULE_RICE_K_DEF",
        crop="Rice",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="NH4OAc",
        antecedents={"nutrient": "K", "status": "Deficient"},
        consequent_nutrients_kgha={"K2O": 40.0},
        consequent_recommendation="Apply basal muriate of potash to correct severe potassium deficiency.",
        precedence=20,
        evidence_source_id="SRC_DOA_RICE_2020",
    ),
    AgronomicRule(
        rule_id="RULE_RICE_K_MOD",
        crop="Rice",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="NH4OAc",
        antecedents={"nutrient": "K", "status": "Moderate"},
        consequent_nutrients_kgha={"K2O": 20.0},
        consequent_recommendation="Apply moderate potassium maintenance dose.",
        precedence=15,
        evidence_source_id="SRC_DOA_RICE_2020",
    ),
    AgronomicRule(
        rule_id="RULE_RICE_K_SUF",
        crop="Rice",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="NH4OAc",
        antecedents={"nutrient": "K", "status": "Sufficient"},
        consequent_nutrients_kgha={"K2O": 0.0},
        consequent_recommendation="Exchangeable potassium is sufficient; no basal potash required.",
        precedence=10,
        evidence_source_id="SRC_DOA_RICE_2020",
    ),

    # --- MAIZE / CORN ---
    AgronomicRule(
        rule_id="RULE_MAIZE_N_DEF",
        crop="Maize",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="Kjeldahl",
        antecedents={"nutrient": "N", "status": "Deficient"},
        consequent_nutrients_kgha={"N": 75.0},
        consequent_recommendation="Maize has high nitrogen demand. Apply split basal N.",
        precedence=20,
        evidence_source_id="SRC_DOA_OFC_2019",
    ),
    AgronomicRule(
        rule_id="RULE_MAIZE_P_DEF",
        crop="Maize",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="Olsen",
        antecedents={"nutrient": "P", "status": "Deficient"},
        consequent_nutrients_kgha={"P2O5": 50.0},
        consequent_recommendation="Apply basal phosphate to support maize root development.",
        precedence=20,
        evidence_source_id="SRC_DOA_OFC_2019",
    ),
    AgronomicRule(
        rule_id="RULE_MAIZE_K_DEF",
        crop="Maize",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="NH4OAc",
        antecedents={"nutrient": "K", "status": "Deficient"},
        consequent_nutrients_kgha={"K2O": 40.0},
        consequent_recommendation="Apply basal potassium to prevent stalk breakage and moisture stress.",
        precedence=20,
        evidence_source_id="SRC_DOA_OFC_2019",
    ),

    # --- WHEAT ---
    AgronomicRule(
        rule_id="RULE_WHEAT_N_DEF",
        crop="Wheat",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="Kjeldahl",
        antecedents={"nutrient": "N", "status": "Deficient"},
        consequent_nutrients_kgha={"N": 60.0},
        consequent_recommendation="Apply basal nitrogen to encourage tillering.",
        precedence=20,
        evidence_source_id="SRC_FAO_SOIL_FERT_2006",
    ),
    AgronomicRule(
        rule_id="RULE_WHEAT_P_DEF",
        crop="Wheat",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="Olsen",
        antecedents={"nutrient": "P", "status": "Deficient"},
        consequent_nutrients_kgha={"P2O5": 40.0},
        consequent_recommendation="Apply basal phosphorus for root establishment.",
        precedence=20,
        evidence_source_id="SRC_FAO_SOIL_FERT_2006",
    ),
    AgronomicRule(
        rule_id="RULE_WHEAT_K_DEF",
        crop="Wheat",
        region=None,
        cultivation_condition=None,
        growth_stage="basal",
        required_soil_test_method="NH4OAc",
        antecedents={"nutrient": "K", "status": "Deficient"},
        consequent_nutrients_kgha={"K2O": 30.0},
        consequent_recommendation="Apply basal potassium.",
        precedence=20,
        evidence_source_id="SRC_FAO_SOIL_FERT_2006",
    ),
]
