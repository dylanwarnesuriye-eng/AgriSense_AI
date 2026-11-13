"""Expert-defined 36-rule base for Mamdani irrigation fuzzy inference.

Rule Base Version: v0.1-draft-scaffold
Validation Status: draft_unvalidated

All 36 combinations of:
  - Soil-Water Depletion (Low, Moderate, High, Critical)
  - Atmospheric Water Demand (Low, Medium, High)
  - Short-Term Effective Rainfall (Low, Moderate, High)
are covered deterministically without conflict.
"""
from dataclasses import dataclass
from itertools import product

RULE_VERSION = "v0.1-draft-scaffold"
RULE_VALIDATION_STATUS = "draft_unvalidated"


@dataclass(frozen=True)
class FuzzyRule:
    """Single Mamdani fuzzy rule representation."""
    id: str
    depletion: str
    demand: str
    rainfall: str
    consequent: str
    weight: float = 1.0


# 36 Complete rules
MAMDANI_RULES: list[FuzzyRule] = [
    # --- LOW DEPLETION ---
    # High Rainfall
    FuzzyRule("RULE_01", "Low", "Low", "High", "No irrigation indicated"),
    FuzzyRule("RULE_02", "Low", "Medium", "High", "No irrigation indicated"),
    FuzzyRule("RULE_03", "Low", "High", "High", "No irrigation indicated"),
    # Moderate Rainfall
    FuzzyRule("RULE_04", "Low", "Low", "Moderate", "No irrigation indicated"),
    FuzzyRule("RULE_05", "Low", "Medium", "Moderate", "No irrigation indicated"),
    FuzzyRule("RULE_06", "Low", "High", "Moderate", "No irrigation indicated"),
    # Low Rainfall
    FuzzyRule("RULE_07", "Low", "Low", "Low", "No irrigation indicated"),
    FuzzyRule("RULE_08", "Low", "Medium", "Low", "No irrigation indicated"),
    FuzzyRule("RULE_09", "Low", "High", "Low", "Monitor"),

    # --- MODERATE DEPLETION ---
    # High Rainfall
    FuzzyRule("RULE_10", "Moderate", "Low", "High", "No irrigation indicated"),
    FuzzyRule("RULE_11", "Moderate", "Medium", "High", "No irrigation indicated"),
    FuzzyRule("RULE_12", "Moderate", "High", "High", "No irrigation indicated"),
    # Moderate Rainfall
    FuzzyRule("RULE_13", "Moderate", "Low", "Moderate", "No irrigation indicated"),
    FuzzyRule("RULE_14", "Moderate", "Medium", "Moderate", "Monitor"),
    FuzzyRule("RULE_15", "Moderate", "High", "Moderate", "Monitor"),
    # Low Rainfall
    FuzzyRule("RULE_16", "Moderate", "Low", "Low", "Monitor"),
    FuzzyRule("RULE_17", "Moderate", "Medium", "Low", "Irrigation may be needed"),
    FuzzyRule("RULE_18", "Moderate", "High", "Low", "Irrigation may be needed"),

    # --- HIGH DEPLETION ---
    # High Rainfall
    FuzzyRule("RULE_19", "High", "Low", "High", "Monitor"),
    FuzzyRule("RULE_20", "High", "Medium", "High", "Monitor"),
    FuzzyRule("RULE_21", "High", "High", "High", "Monitor"),
    # Moderate Rainfall
    FuzzyRule("RULE_22", "High", "Low", "Moderate", "Monitor"),
    FuzzyRule("RULE_23", "High", "Medium", "Moderate", "Irrigation may be needed"),
    FuzzyRule("RULE_24", "High", "High", "Moderate", "Irrigation may be needed"),
    # Low Rainfall
    FuzzyRule("RULE_25", "High", "Low", "Low", "Irrigation may be needed"),
    FuzzyRule("RULE_26", "High", "Medium", "Low", "High priority"),
    FuzzyRule("RULE_27", "High", "High", "Low", "High priority"),

    # --- CRITICAL DEPLETION ---
    # High Rainfall
    FuzzyRule("RULE_28", "Critical", "Low", "High", "Irrigation may be needed"),
    FuzzyRule("RULE_29", "Critical", "Medium", "High", "Irrigation may be needed"),
    FuzzyRule("RULE_30", "Critical", "High", "High", "Irrigation may be needed"),
    # Moderate Rainfall
    FuzzyRule("RULE_31", "Critical", "Low", "Moderate", "Irrigation may be needed"),
    FuzzyRule("RULE_32", "Critical", "Medium", "Moderate", "High priority"),
    FuzzyRule("RULE_33", "Critical", "High", "Moderate", "High priority"),
    # Low Rainfall
    FuzzyRule("RULE_34", "Critical", "Low", "Low", "High priority"),
    FuzzyRule("RULE_35", "Critical", "Medium", "Low", "High priority"),
    FuzzyRule("RULE_36", "Critical", "High", "Low", "High priority"),
]


def verify_rule_coverage(rules: list[FuzzyRule]) -> dict[str, object]:
    """Verify that all 36 combinations of (4 depletion x 3 demand x 3 rainfall) are covered."""
    expected_depletion = {"Low", "Moderate", "High", "Critical"}
    expected_demand = {"Low", "Medium", "High"}
    expected_rainfall = {"Low", "Moderate", "High"}

    all_expected = set(product(expected_depletion, expected_demand, expected_rainfall))
    present_combinations = set()

    for rule in rules:
        combo = (rule.depletion, rule.demand, rule.rainfall)
        present_combinations.add(combo)

    missing = all_expected - present_combinations
    coverage_ratio = len(present_combinations) / len(all_expected)

    return {
        "total_expected": len(all_expected),
        "total_present": len(present_combinations),
        "is_complete": len(missing) == 0,
        "coverage_ratio": coverage_ratio,
        "missing_combinations": sorted(missing),
    }


def detect_rule_conflicts(rules: list[FuzzyRule]) -> list[dict[str, str]]:
    """Detect rules with identical antecedents but conflicting consequents."""
    seen_antecedents: dict[tuple[str, str, str], FuzzyRule] = {}
    conflicts: list[dict[str, str]] = []

    for rule in rules:
        antecedent = (rule.depletion, rule.demand, rule.rainfall)
        if antecedent in seen_antecedents:
            prev = seen_antecedents[antecedent]
            if prev.consequent != rule.consequent:
                conflicts.append({
                    "antecedent": f"Depletion={rule.depletion}, Demand={rule.demand}, Rainfall={rule.rainfall}",
                    "rule_1": f"{prev.id} -> {prev.consequent}",
                    "rule_2": f"{rule.id} -> {rule.consequent}",
                })
        else:
            seen_antecedents[antecedent] = rule

    return conflicts
