"""Deterministic forward-chaining inference engine for Fertilizer Advisory.

Implements:
  1. Fact validation and state tracking.
  2. Rule condition matching across crop, region, and nutrient statuses.
  3. Forward-chaining deduction with conflict detection.
  4. Rule precedence resolution.
  5. Infinite-loop / cycle prevention.
  6. Comprehensive, reproducible explanation traces.
"""
from dataclasses import dataclass, field
from typing import Any

from app.modules.fertilizer_advisory.knowledge_base import (
    FERTILIZER_RULES,
    RULE_APPROVAL_STATUS,
    RULE_BASE_VERSION,
    AgronomicRule,
    classify_soil_nitrogen,
    classify_soil_phosphorus,
    classify_soil_potassium,
)


@dataclass
class ForwardChainingResult:
    """Output from deterministic forward-chaining evaluation."""
    crop_name: str
    assessment_status: str  # 'valid', 'conflict_detected', 'insufficient_data', 'loop_error'
    nutrient_status: dict[str, str]
    recommended_nutrients_kgha: dict[str, float]
    activated_rules: list[AgronomicRule]
    activated_rule_ids: list[str]
    conflicts_detected: list[str]
    explanation_trace: list[str]
    evidence_sources: list[str]
    rule_version: str = RULE_BASE_VERSION
    approval_status: str = RULE_APPROVAL_STATUS
    warnings: list[str] = field(default_factory=list)


class FertilizerRuleEngine:
    """Deterministic forward-chaining rule engine."""

    def __init__(self, rules: list[AgronomicRule] | None = None, max_iterations: int = 20):
        self.rules = rules if rules is not None else FERTILIZER_RULES
        self.max_iterations = max_iterations

    def evaluate_farm_facts(
        self,
        crop_name: str,
        nitrogen: float | None = None,
        phosphorus: float | None = None,
        potassium: float | None = None,
        ph: float | None = None,
        region: str | None = None,
        cultivation_condition: str | None = None,
        growth_stage: str | None = None,
        soil_test_method: str | None = None,
    ) -> ForwardChainingResult:
        """Run forward-chaining deduction on farm observations."""
        trace: list[str] = []
        warnings: list[str] = []
        conflicts: list[str] = []

        norm_crop = crop_name.strip().title()
        trace.append(f"Initialized inference for crop '{norm_crop}'.")

        # -----------------------------------------------------------------
        # 1. Deduce Soil Nutrient Categories (Intermediate Facts)
        # -----------------------------------------------------------------
        nutrient_status: dict[str, str] = {}

        if nitrogen is not None:
            n_cat = classify_soil_nitrogen(nitrogen)
            nutrient_status["N"] = n_cat
            trace.append(f"Fact derived: Soil Nitrogen = {nitrogen:.2f} -> Category '{n_cat}'.")
        else:
            warnings.append("Soil Nitrogen measurement not provided.")

        if phosphorus is not None:
            p_cat = classify_soil_phosphorus(phosphorus)
            nutrient_status["P"] = p_cat
            trace.append(f"Fact derived: Soil Phosphorus = {phosphorus:.2f} mg/kg -> Category '{p_cat}'.")
        else:
            warnings.append("Soil Phosphorus measurement not provided.")

        if potassium is not None:
            k_cat = classify_soil_potassium(potassium)
            nutrient_status["K"] = k_cat
            trace.append(f"Fact derived: Soil Potassium = {potassium:.2f} mg/kg -> Category '{k_cat}'.")
        else:
            warnings.append("Soil Potassium measurement not provided.")

        if ph is not None:
            trace.append(f"Fact observed: Soil pH = {ph:.2f}.")

        # -----------------------------------------------------------------
        # 2. Forward Chaining Loop with Cycle Prevention
        # -----------------------------------------------------------------
        # Working Memory Facts
        facts: dict[str, Any] = {
            "crop": norm_crop,
            "region": region,
            "cultivation_condition": cultivation_condition,
            "growth_stage": growth_stage or "basal",
            "soil_test_method": soil_test_method,
            "N_status": nutrient_status.get("N"),
            "P_status": nutrient_status.get("P"),
            "K_status": nutrient_status.get("K"),
        }

        fired_rule_ids: set[str] = set()
        activated_rules: list[AgronomicRule] = []
        # Stores candidate nutrient recommendations: {nutrient: list of (rule, rate)}
        nutrient_candidates: dict[str, list[tuple[AgronomicRule, float]]] = {}

        iteration = 0
        hit_fixpoint = False

        while iteration < self.max_iterations:
            iteration += 1
            new_rules_fired_this_pass = 0

            # Sort candidate rules deterministically by precedence (descending), then rule_id
            applicable_rules = sorted(
                self.rules,
                key=lambda r: (-r.precedence, r.rule_id),
            )

            for rule in applicable_rules:
                if rule.rule_id in fired_rule_ids:
                    continue

                # Evaluate Antecedents
                if not self._matches_rule(rule, facts):
                    continue

                # Rule fires
                fired_rule_ids.add(rule.rule_id)
                activated_rules.append(rule)
                new_rules_fired_this_pass += 1
                trace.append(
                    f"Iteration {iteration}: Rule '{rule.rule_id}' fired (Precedence {rule.precedence}). "
                    f"Action: {rule.consequent_recommendation}"
                )

                # Record consequent nutrient rates
                for nut, rate in rule.consequent_nutrients_kgha.items():
                    if nut not in nutrient_candidates:
                        nutrient_candidates[nut] = []
                    nutrient_candidates[nut].append((rule, rate))

            if new_rules_fired_this_pass == 0:
                trace.append(f"Forward chaining reached fixpoint at iteration {iteration}.")
                hit_fixpoint = True
                break

        if not hit_fixpoint and self.max_iterations > 0:
            warnings.append("Forward-chaining reached maximum iteration depth without fixpoint. Halting inference.")
            return ForwardChainingResult(
                crop_name=norm_crop,
                assessment_status="loop_error",
                nutrient_status=nutrient_status,
                recommended_nutrients_kgha={},
                activated_rules=activated_rules,
                activated_rule_ids=list(fired_rule_ids),
                conflicts_detected=["Rule execution cycle detected."],
                explanation_trace=trace,
                evidence_sources=[],
                warnings=warnings,
            )

        # -----------------------------------------------------------------
        # 3. Conflict Detection & Precedence Resolution
        # -----------------------------------------------------------------
        recommended_nutrients: dict[str, float] = {}

        for nut, candidates in nutrient_candidates.items():
            if len(candidates) == 1:
                _winning_rule, winning_rate = candidates[0]
                recommended_nutrients[nut] = winning_rate
            else:
                # Multiple rules recommended for same nutrient: inspect conflicts
                # Sort by precedence descending
                sorted_cands = sorted(candidates, key=lambda pair: -pair[0].precedence)
                top_rule, top_rate = sorted_cands[0]
                second_rule, second_rate = sorted_cands[1]

                if top_rule.precedence == second_rule.precedence and top_rate != second_rate:
                    # Unresolvable conflict!
                    conflict_msg = (
                        f"Unresolvable conflict for nutrient '{nut}': Rule '{top_rule.rule_id}' ({top_rate} kg/ha) "
                        f"and Rule '{second_rule.rule_id}' ({second_rate} kg/ha) share precedence {top_rule.precedence}."
                    )
                    conflicts.append(conflict_msg)
                    trace.append(f"CONFLICT: {conflict_msg}")
                    recommended_nutrients[nut] = max(top_rate, second_rate)  # conservative fallback
                else:
                    # Resolved via precedence
                    trace.append(
                        f"Conflict resolved for '{nut}': Selected '{top_rule.rule_id}' ({top_rate} kg/ha) "
                        f"over '{second_rule.rule_id}' ({second_rate} kg/ha) based on higher precedence."
                    )
                    recommended_nutrients[nut] = top_rate

        evidence_sources = sorted({r.evidence_source_id for r in activated_rules})

        assessment_status = "conflict_detected" if conflicts else "valid"
        if not activated_rules and not nutrient_status:
            assessment_status = "insufficient_data"

        return ForwardChainingResult(
            crop_name=norm_crop,
            assessment_status=assessment_status,
            nutrient_status=nutrient_status,
            recommended_nutrients_kgha=recommended_nutrients,
            activated_rules=activated_rules,
            activated_rule_ids=[r.rule_id for r in activated_rules],
            conflicts_detected=conflicts,
            explanation_trace=trace,
            evidence_sources=evidence_sources,
            warnings=warnings,
        )

    def _matches_rule(self, rule: AgronomicRule, facts: dict[str, Any]) -> bool:
        """Evaluate if an agronomic rule matches current working facts."""
        # 1. Check Crop
        if rule.crop.lower() != facts["crop"].lower():
            return False

        # 2. Check Region if specified
        if rule.region is not None and facts.get("region") is not None and rule.region.lower() != facts["region"].lower():
            return False

        # 3. Check Cultivation Condition
        if rule.cultivation_condition is not None and facts.get("cultivation_condition") is not None and rule.cultivation_condition.lower() != facts["cultivation_condition"].lower():
            return False

        # 4. Check Growth Stage
        if rule.growth_stage is not None and facts.get("growth_stage") is not None and rule.growth_stage.lower() != facts["growth_stage"].lower():
            return False

        # 5. Check Antecedents (e.g. nutrient status)
        for key, expected_val in rule.antecedents.items():
            if key == "nutrient":
                continue
            if key == "status":
                target_nut = rule.antecedents.get("nutrient")
                if not target_nut:
                    return False
                actual_status = facts.get(f"{target_nut}_status")
                if actual_status != expected_val:
                    return False
            else:
                if facts.get(key) != expected_val:
                    return False

        return True
