"""Mathematical membership functions and linguistic fuzzy set definitions for Mamdani irrigation engine.

Agronomic Reconciled Definition:
Normalized soil-water depletion is defined relative to Readily Available Water:
    RAW = p * TAW = p * (theta_FC - theta_WP)
where p is the FAO-56 crop depletion fraction (typically 0.40 - 0.60 for upland crops).
100% depletion of RAW marks the agronomic threshold at which crop transpiration is restricted
and moisture stress begins.
"""
from collections.abc import Callable
from dataclasses import dataclass


def trimf(x: float, a: float, b: float, c: float) -> float:
    """Triangular membership function.

    Formula:
        mu(x) = max(0, min((x - a)/(b - a), (c - x)/(c - b)))
    Strict boundary: a <= b <= c.
    Returns membership degree in [0.0, 1.0].
    """
    if not (a <= b <= c):
        raise ValueError(f"Invalid triangular bounds: require a <= b <= c, got a={a}, b={b}, c={c}")

    if x <= a or x >= c:
        return 0.0
    if x == b:
        return 1.0

    left_slope = (x - a) / (b - a) if b > a else 1.0
    right_slope = (c - x) / (c - b) if c > b else 1.0

    degree = min(left_slope, right_slope)
    return max(0.0, min(1.0, float(degree)))


def trapmf(x: float, a: float, b: float, c: float, d: float) -> float:
    """Trapezoidal membership function.

    Formula:
        mu(x) = max(0, min((x - a)/(b - a), 1, (d - x)/(d - c)))
    Strict boundary: a <= b <= c <= d.
    Returns membership degree in [0.0, 1.0].
    """
    if not (a <= b <= c <= d):
        raise ValueError(
            f"Invalid trapezoidal bounds: require a <= b <= c <= d, got a={a}, b={b}, c={c}, d={d}"
        )

    if x <= a or x >= d:
        return 0.0
    if b <= x <= c:
        return 1.0

    left_slope = (x - a) / (b - a) if b > a else 1.0
    right_slope = (d - x) / (d - c) if d > c else 1.0

    degree = min(left_slope, 1.0, right_slope)
    return max(0.0, min(1.0, float(degree)))


@dataclass(frozen=True)
class FuzzySet:
    """Represents a named linguistic fuzzy set with a membership evaluation function."""
    name: str
    mf_type: str  # 'triangular' or 'trapezoidal'
    parameters: tuple[float, ...]
    eval_func: Callable[[float], float]

    def evaluate(self, x: float) -> float:
        return self.eval_func(x)


# -------------------------------------------------------------------------
# Linguistic Variables Definitions
# -------------------------------------------------------------------------

# 1. Soil-Water Depletion (0 - 100% of Readily Available Water, RAW)
# Represents fraction of RAW depleted before stress
SOIL_WATER_DEPLETION_SETS: dict[str, FuzzySet] = {
    "Low": FuzzySet(
        name="Low",
        mf_type="trapezoidal",
        parameters=(0.0, 0.0, 20.0, 35.0),
        eval_func=lambda x: trapmf(x, 0.0, 0.0, 20.0, 35.0),
    ),
    "Moderate": FuzzySet(
        name="Moderate",
        mf_type="triangular",
        parameters=(20.0, 45.0, 65.0),
        eval_func=lambda x: trimf(x, 20.0, 45.0, 65.0),
    ),
    "High": FuzzySet(
        name="High",
        mf_type="triangular",
        parameters=(55.0, 75.0, 90.0),
        eval_func=lambda x: trimf(x, 55.0, 75.0, 90.0),
    ),
    "Critical": FuzzySet(
        name="Critical",
        mf_type="trapezoidal",
        parameters=(80.0, 92.0, 100.0, 100.0),
        eval_func=lambda x: trapmf(x, 80.0, 92.0, 100.0, 100.0),
    ),
}

# 2. Atmospheric Water Demand (0 - 100 index)
# Evaporative demand index proxy (academic demo only)
ATMOSPHERIC_DEMAND_SETS: dict[str, FuzzySet] = {
    "Low": FuzzySet(
        name="Low",
        mf_type="trapezoidal",
        parameters=(0.0, 0.0, 25.0, 45.0),
        eval_func=lambda x: trapmf(x, 0.0, 0.0, 25.0, 45.0),
    ),
    "Medium": FuzzySet(
        name="Medium",
        mf_type="triangular",
        parameters=(30.0, 55.0, 75.0),
        eval_func=lambda x: trimf(x, 30.0, 55.0, 75.0),
    ),
    "High": FuzzySet(
        name="High",
        mf_type="trapezoidal",
        parameters=(65.0, 85.0, 100.0, 100.0),
        eval_func=lambda x: trapmf(x, 65.0, 85.0, 100.0, 100.0),
    ),
}

# 3. Short-Term Effective Rainfall (0 - 50 mm)
# Forecasted or recent effective rainfall penetrating root zone
EFFECTIVE_RAINFALL_SETS: dict[str, FuzzySet] = {
    "Low": FuzzySet(
        name="Low",
        mf_type="trapezoidal",
        parameters=(0.0, 0.0, 5.0, 15.0),
        eval_func=lambda x: trapmf(x, 0.0, 0.0, 5.0, 15.0),
    ),
    "Moderate": FuzzySet(
        name="Moderate",
        mf_type="triangular",
        parameters=(10.0, 22.0, 35.0),
        eval_func=lambda x: trimf(x, 10.0, 22.0, 35.0),
    ),
    "High": FuzzySet(
        name="High",
        mf_type="trapezoidal",
        parameters=(28.0, 40.0, 50.0, 50.0),
        eval_func=lambda x: trapmf(x, 28.0, 40.0, 50.0, 50.0),
    ),
}

# 4. Output: Irrigation Urgency (0 - 100 numerical decision index)
IRRIGATION_URGENCY_SETS: dict[str, FuzzySet] = {
    "No irrigation indicated": FuzzySet(
        name="No irrigation indicated",
        mf_type="trapezoidal",
        parameters=(0.0, 0.0, 15.0, 30.0),
        eval_func=lambda x: trapmf(x, 0.0, 0.0, 15.0, 30.0),
    ),
    "Monitor": FuzzySet(
        name="Monitor",
        mf_type="triangular",
        parameters=(20.0, 37.5, 55.0),
        eval_func=lambda x: trimf(x, 20.0, 37.5, 55.0),
    ),
    "Irrigation may be needed": FuzzySet(
        name="Irrigation may be needed",
        mf_type="triangular",
        parameters=(45.0, 62.5, 80.0),
        eval_func=lambda x: trimf(x, 45.0, 62.5, 80.0),
    ),
    "High priority": FuzzySet(
        name="High priority",
        mf_type="trapezoidal",
        parameters=(70.0, 85.0, 100.0, 100.0),
        eval_func=lambda x: trapmf(x, 70.0, 85.0, 100.0, 100.0),
    ),
}


def fuzzify_variable(value: float, variable_sets: dict[str, FuzzySet]) -> dict[str, float]:
    """Compute membership degrees for all terms of a linguistic variable."""
    return {term: fuzzy_set.evaluate(value) for term, fuzzy_set in variable_sets.items()}
