"""Mamdani Fuzzy Logic Inference Engine for Irrigation Advisory.

Implements:
  - Fuzzification via triangular & trapezoidal membership functions.
  - Conjunction (AND) via Minimum operator.
  - Rule activation via Minimum clipping.
  - Aggregation via Maximum operator.
  - Defuzzification via Centroid (Center of Gravity) method over discretized universe.
  - Comprehensive explanation and rule activation tracing.
  - Zero-activation fallback safety (returning unavailable status and null scores).
"""
from dataclasses import dataclass, field

from app.modules.irrigation_advisory.fuzzy_sets import (
    ATMOSPHERIC_DEMAND_SETS,
    EFFECTIVE_RAINFALL_SETS,
    IRRIGATION_URGENCY_SETS,
    SOIL_WATER_DEPLETION_SETS,
    fuzzify_variable,
)
from app.modules.irrigation_advisory.rules import (
    MAMDANI_RULES,
    RULE_VALIDATION_STATUS,
    RULE_VERSION,
    FuzzyRule,
)


@dataclass
class RuleActivationTrace:
    """Detailed trace of an activated fuzzy rule."""
    rule_id: str
    weight: float
    firing_strength: float
    antecedents: dict[str, str]
    consequent: str


@dataclass
class MamdaniEvaluationResult:
    """Complete result of Mamdani fuzzy inference evaluation."""
    urgency_score: float | None  # Centroid 0.0 to 100.0, or None if unavailable
    urgency_category: str | None
    assessment_status: str  # 'valid', 'unavailable'
    software_status: str = "evaluated"  # 'evaluated', 'unavailable', 'error'
    activated_rules: list[RuleActivationTrace] = field(default_factory=list)
    activated_rule_ids: list[str] = field(default_factory=list)
    input_fuzzification: dict[str, dict[str, float]] = field(default_factory=dict)
    aggregated_profile_sample: dict[int, float] = field(default_factory=dict)
    rule_version: str = RULE_VERSION
    validation_status: str = RULE_VALIDATION_STATUS
    warnings: list[str] = field(default_factory=list)


class MamdaniIrrigationEngine:
    """Modular Mamdani Fuzzy Inference Engine."""

    def __init__(
        self,
        rules: list[FuzzyRule] | None = None,
        discretization_step: float = 1.0,
    ):
        self.rules = rules if rules is not None else MAMDANI_RULES
        self.discretization_step = discretization_step
        self.rule_version = RULE_VERSION
        self.validation_status = RULE_VALIDATION_STATUS

        # Precompute output universe grid [0.0, 100.0]
        self.universe_points: list[float] = []
        val = 0.0
        while val <= 100.0001:
            self.universe_points.append(round(val, 2))
            val += self.discretization_step

    def evaluate(
        self,
        soil_water_depletion: float,
        atmospheric_demand: float,
        effective_rainfall: float,
    ) -> MamdaniEvaluationResult:
        """Execute complete Mamdani fuzzy inference cycle.

        Args:
            soil_water_depletion: % depleted readily available water (RAW) [0.0, 100.0]
            atmospheric_demand: evaporative demand index [0.0, 100.0]
            effective_rainfall: short-term effective rainfall in mm [0.0, 50.0+]

        Returns:
            MamdaniEvaluationResult containing defuzzified score, category, and trace.
        """
        # 1. Clamp inputs to active definition domains safely
        d_val = max(0.0, min(100.0, float(soil_water_depletion)))
        e_val = max(0.0, min(100.0, float(atmospheric_demand)))
        r_val = max(0.0, min(50.0, float(effective_rainfall)))

        # 2. Fuzzification
        mu_depletion = fuzzify_variable(d_val, SOIL_WATER_DEPLETION_SETS)
        mu_demand = fuzzify_variable(e_val, ATMOSPHERIC_DEMAND_SETS)
        mu_rainfall = fuzzify_variable(r_val, EFFECTIVE_RAINFALL_SETS)

        input_fuzzification = {
            "soil_water_depletion": mu_depletion,
            "atmospheric_demand": mu_demand,
            "effective_rainfall": mu_rainfall,
        }

        # 3. Rule Evaluation & Activation (Min Conjunction)
        activated_rules: list[RuleActivationTrace] = []
        # Store max activation per consequent set
        consequent_activations: dict[str, float] = {
            term: 0.0 for term in IRRIGATION_URGENCY_SETS
        }

        for rule in self.rules:
            # Min operator across antecedents
            w_d = mu_depletion.get(rule.depletion, 0.0)
            w_e = mu_demand.get(rule.demand, 0.0)
            w_r = mu_rainfall.get(rule.rainfall, 0.0)
            firing_strength = rule.weight * min(w_d, w_e, w_r)

            if firing_strength > 0.0:
                activated_rules.append(
                    RuleActivationTrace(
                        rule_id=rule.id,
                        weight=rule.weight,
                        firing_strength=round(firing_strength, 4),
                        antecedents={
                            "depletion": rule.depletion,
                            "demand": rule.demand,
                            "rainfall": rule.rainfall,
                        },
                        consequent=rule.consequent,
                    )
                )
                consequent_activations[rule.consequent] = max(
                    consequent_activations[rule.consequent], firing_strength
                )

        # 4. Aggregation (Max Union across clipped consequents)
        aggregated_curve: list[float] = []
        for u in self.universe_points:
            mu_u = 0.0
            for term, clip_height in consequent_activations.items():
                if clip_height > 0.0:
                    term_mf = IRRIGATION_URGENCY_SETS[term].evaluate(u)
                    clipped_val = min(clip_height, term_mf)
                    mu_u = max(mu_u, clipped_val)
            aggregated_curve.append(mu_u)

        # 5. Defuzzification (Centroid Method)
        sum_area = sum(aggregated_curve)
        sum_moment = sum(u * mu for u, mu in zip(self.universe_points, aggregated_curve))

        warnings: list[str] = [
            (
                "Decision index reflects rule priority scaffold (v0.1-draft-scaffold). "
                "Not an irrigation volume in litres/mm or probability."
            )
        ]

        if sum_area <= 1e-9:
            # Zero-activation fallback safety: never interpret no rule activation as no irrigation required
            return MamdaniEvaluationResult(
                urgency_score=None,
                urgency_category=None,
                assessment_status="unavailable",
                software_status="unavailable",
                activated_rules=[],
                activated_rule_ids=[],
                input_fuzzification=input_fuzzification,
                aggregated_profile_sample={},
                rule_version=self.rule_version,
                validation_status=self.validation_status,
                warnings=warnings + [
                    (
                        "Zero rule activation: inputs fell outside responsive fuzzy partitions. "
                        "Irrigation advisory is unavailable; zero activation must never be interpreted as no irrigation required."
                    )
                ],
            )

        centroid = sum_moment / sum_area
        urgency_score = round(centroid, 2)

        # 6. Urgency Category Determination
        urgency_category = self._map_score_to_category(urgency_score, consequent_activations)

        # Sample aggregated curve for tracing/inspection (decimated sample)
        sample_profile = {
            int(u): round(mu, 4)
            for u, mu in zip(self.universe_points, aggregated_curve)
            if int(u) % 10 == 0
        }

        return MamdaniEvaluationResult(
            urgency_score=urgency_score,
            urgency_category=urgency_category,
            assessment_status="valid",
            software_status="evaluated",
            activated_rules=activated_rules,
            activated_rule_ids=[r.rule_id for r in activated_rules],
            input_fuzzification=input_fuzzification,
            aggregated_profile_sample=sample_profile,
            rule_version=self.rule_version,
            validation_status=self.validation_status,
            warnings=warnings,
        )

    def _map_score_to_category(
        self,
        score: float,
        consequent_activations: dict[str, float],
    ) -> str:
        """Map defuzzified score to primary qualitative category."""
        if score < 25.0:
            return "No irrigation indicated"
        elif score < 50.0:
            return "Monitor"
        elif score < 75.0:
            return "Irrigation may be needed"
        else:
            return "High priority"
