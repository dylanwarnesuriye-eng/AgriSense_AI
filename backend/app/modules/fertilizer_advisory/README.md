# Knowledge-Based Fertilizer Advisory System

## 1. Overview
The Fertilizer Advisory component (AI Component 3) is a deterministic forward-chaining expert knowledge system designed to diagnose soil macronutrient balances ($N, P, K$) and recommend commercial fertilizer applications with strict stoichiometric and agronomic safeguards.

Like the Mamdani Irrigation Advisory module, this system does **not** train an empirical ML model on yield data. Historical fertilizer amounts in observational datasets (e.g. `crop_yield_train.csv`) reflect arbitrary historical farmer practices rather than calibrated nutrient-response curves.

---

## 2. Knowledge Representation

### 2.1 Soil Test Analytical Standards
Soil nutrient observations must specify extraction standards to be valid:
- **Total Soil Nitrogen ($N$)**: Evaluated via Kjeldahl digestion ($\%$, or converted from $\text{mg/kg}$).
  - *Deficient*: $< 0.10\%$
  - *Moderate*: $0.10\text{--}0.20\%$
  - *Sufficient*: $> 0.20\%$
- **Available Soil Phosphorus ($P$)**: Evaluated via sodium bicarbonate extraction (Olsen $P$, $\text{mg/kg}$ or $\text{ppm}$).
  - *Deficient*: $< 10.0\text{ mg/kg}$
  - *Moderate*: $10.0\text{--}20.0\text{ mg/kg}$
  - *Sufficient*: $> 20.0\text{ mg/kg}$
- **Exchangeable Soil Potassium ($K$)**: Evaluated via neutral $1\text{N}$ ammonium acetate extraction ($\text{NH}_4\text{OAc } K$, $\text{mg/kg}$ or $\text{ppm}$).
  - *Deficient*: $< 60.0\text{ mg/kg}$
  - *Moderate*: $60.0\text{--}120.0\text{ mg/kg}$
  - *Sufficient*: $> 120.0\text{ mg/kg}$

### 2.2 Production Rules
Every rule is structured declaratively with metadata and source provenance:
```python
@dataclass(frozen=True)
class AgronomicRule:
    rule_id: str
    crop: str
    region: str | None
    cultivation_condition: str | None
    growth_stage: str | None
    required_soil_test_method: str | None
    antecedents: dict[str, Any]
    consequent_nutrients_kgha: dict[str, float]
    consequent_recommendation: str
    precedence: int
    evidence_source_id: str
    approval_status: str
    version: str
```

---

## 3. Inference Algorithm: Deterministic Forward Chaining

The forward-chaining engine evaluates facts iteratively until reaching a fixpoint:

1. **Fact Assertion**: Ingests crisp farm facts (crop, soil test values, region, growth stage, prior applications).
2. **Intermediate Fact Derivation**: Classifies raw concentrations into qualitative categories (`"Deficient"`, `"Moderate"`, `"Sufficient"`).
3. **Applicability Matching**: Filters rules matching target crop, growth stage, and nutrient antecedents.
4. **Precedence Sorting & Execution**: Evaluates rules sorted by precedence (descending) and rule ID.
5. **Cycle / Loop Detection**: Halts if rule state repeats or maximum iterations ($20$) are exceeded without reaching a fixpoint.
6. **Conflict Resolution**:
   - If two rules recommend rates for the same nutrient, the rule with higher precedence takes priority.
   - If two rules have identical precedence and differing rates, an explicit conflict warning is logged (`conflict_detected`).
7. **Trace Logging**: Every fact derivation and rule activation is logged in `explanation_trace`.

---

## 4. Calculation Safeguards & Stoichiometry

### 4.1 Elemental vs Oxide Conventions
Fertilizer grades conventionally report phosphorus as phosphate oxide ($P_2O_5$) and potassium as potash oxide ($K_2O$). The calculation service enforces exact stoichiometric conversions:
$$P_2O_5 = P \times 2.2914, \quad P = P_2O_5 \times 0.4364$$
$$K_2O = K \times 1.2046, \quad K = K_2O \times 0.8302$$

### 4.2 Commercial Fertilizer Dosage
$$\text{Product Quantity (kg/ha)} = \frac{\text{Net Recommended Nutrient Rate (kg/ha)}}{\text{Product Nutrient Fraction}}$$
- **Urea** ($46\% \text{ N}$): Rate $\text{kg/ha} = \text{Net N} / 0.46$.
- **Triple Super Phosphate (TSP)** ($46\% \text{ } P_2O_5$): Rate $\text{kg/ha} = \text{Net } P_2O_5 / 0.46$.
- **Muriate of Potash (MOP)** ($60\% \text{ } K_2O$): Rate $\text{kg/ha} = \text{Net } K_2O / 0.60$.
- **Diammonium Phosphate (DAP)** ($18\% \text{ N}, 46\% \text{ } P_2O_5$).

### 4.3 Total Field Requirement
$$\text{Total Product Mass (kg)} = \text{Product Rate (kg/ha)} \times \text{Field Area (ha)}$$
If field area is omitted, total field requirement is reported as `None`.

### 4.4 Deduction of Prior Applications
$$\text{Net Nutrient Rate} = \max\Big(0.0, \text{Recommended Rate} - \text{Previously Applied Nutrient}\Big)$$

### 4.5 Liming Safeguard
Soil pH alone cannot determine lime tonnage because soil buffering capacity and exchangeable acidity ($\text{Al}^{3+} + \text{H}^+$) vary across soil textures. The system refuses to calculate lime dosages from soil pH alone.

---

## 5. Authoritative References & Agronomic Source Registry

All rules cite registered literature sources:
- `SRC_DOA_RICE_2020`: Department of Agriculture (DOA), Sri Lanka — *Fertilizer Recommendations for Rice Cultivation in Sri Lanka*, RRDI Batalagoda.
- `SRC_DOA_OFC_2019`: Department of Agriculture (DOA), Sri Lanka — *Crop Management Guidelines for Other Field Crops (Maize, Soybean)*, FCRDI Mahailluppallama.
- `SRC_FAO_SOIL_FERT_2006`: Food and Agriculture Organization (FAO) — *Plant Nutrition for Food Security: A Guide for Integrated Nutrient Management*.

*All scaffold rules are tagged as `draft_unvalidated` (`v0.1-draft-scaffold`).*

---

## 6. Software Verification vs Agricultural Validation

| Dimension | Software Verification Status | Agricultural / Field Validation Status |
| :--- | :--- | :--- |
| **Engine Execution** | Deterministic forward chaining verified (16 automated tests). | Unvalidated (requires regional soil calibration). |
| **Stoichiometry** | Exact elemental/oxide factors verified ($P \leftrightarrow P_2O_5$, $K \leftrightarrow K_2O$). | Chemical conversions are exact; field recovery fractions depend on soil series. |
| **Conflict & Loop Safety**| Halts on loops, resolves precedence, flags conflicts. | Rule thresholds represent prototype engineering scaffolds. |
| **Production Gating** | Blocks draft rules when `academic_demo_mode = False`. | Requires local agronomist sign-off before operational use. |
| **Product Dosage** | Prior deductions & field scaling verified. | Application split timings require localized field trials. |

---

## 7. API Endpoints

- `POST /api/v1/fertilizer/diagnose`: Evaluates soil nutrient measurements and computes commercial fertilizer dosages.
- `GET /api/v1/fertilizer/rules`: Lists all registered agronomic production rules and approval statuses.
- `GET /api/v1/fertilizer/references`: Lists authoritative literature sources and review status.
- `GET /api/v1/fertilizer/products`: Lists commercial fertilizer products and $N\text{-}P_2O_5\text{-}K_2O$ percentage grades.
