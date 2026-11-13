"""Agronomic rule definitions and schema structure.

NOTE: Per project constraints, soil nutrient thresholds and fertilizer quantities
must be verified from authoritative agronomic data. No invented numbers are inserted here.
"""


class AgronomicRule:
    def __init__(self, rule_id: str, crop: str, condition_desc: str, recommendation: str):
        self.rule_id = rule_id
        self.crop = crop
        self.condition_desc = condition_desc
        self.recommendation = recommendation


# Rule registry to be populated once agronomic source tables are verified
FERTILIZER_RULES_REGISTRY: list[AgronomicRule] = []
