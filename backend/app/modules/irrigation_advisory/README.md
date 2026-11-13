# Mamdani Fuzzy Logic Irrigation Advisory System

## 1. Overview
The Irrigation Advisory component (AI Component 2) is an expert-defined Mamdani fuzzy logic inference engine designed to evaluate irrigation urgency without inventing unverified physical volumes or schedules.

Unlike supervised machine learning models (e.g. Decision Trees or Ridge Regression), this expert system does not fit parameters against observational yield datasets. Historical irrigation records in datasets reflect arbitrary farmer practices rather than optimal water-balance thresholds.

---

## 2. Mathematical Foundations

### 2.1 Membership Functions

#### Triangular Membership Function ($\text{trimf}$)
$$\mu(x; a, b, c) = \max\left(0, \min\left(\frac{x - a}{b - a}, \frac{c - x}{c - b}\right)\right)$$
*Condition:* $a \le b \le c$. When $x = b$, $\mu(x) = 1.0$.

#### Trapezoidal Membership Function ($\text{trapmf}$)
$$\mu(x; a, b, c, d) = \max\left(0, \min\left(\frac{x - a}{b - a}, 1, \frac{d - x}{d - c}\right)\right)$$
*Condition:* $a \le b \le c \le d$. For all $x \in [b, c]$, $\mu(x) = 1.0$.

---

### 2.2 Mamdani Inference Cycle

1. **Fuzzification**:
   Given crisp inputs $D$ (Soil-Water Depletion), $E$ (Atmospheric Demand), and $R$ (Effective Rainfall), membership degrees $\mu_{A_i}(x)$ are computed across all defined linguistic terms.

2. **Rule Conjunction (AND Operator)**:
   For rule $r$ with antecedents $D \in A_r$, $E \in B_r$, $R \in C_r$, the rule firing strength $w_r$ is determined via the minimum operator:
   $$w_r = \text{weight}_r \times \min\Big(\mu_{A_r}(D), \mu_{B_r}(E), \mu_{C_r}(R)\Big)$$

3. **Implication (Consequent Activation)**:
   The consequent fuzzy set $O_r$ is clipped at height $w_r$:
   $$\mu_{O'_r}(u) = \min\Big(w_r, \mu_{O_r}(u)\Big)$$

4. **Aggregation**:
   All 36 clipped consequent sets are combined across the output universe $U \in [0, 100]$ using the maximum union operator:
   $$\mu_{\text{agg}}(u) = \max_{r=1}^{36} \mu_{O'_r}(u)$$

5. **Centroid Defuzzification (Center of Gravity)**:
   The crisp numerical Urgency Score $U^*$ is evaluated by numerical integration over 101 discrete points $u_i \in \{0.0, 1.0, 2.0, \dots, 100.0\}$ ($\Delta u = 1.0$):
   $$U^* = \frac{\sum_{i=0}^{100} u_i \cdot \mu_{\text{agg}}(u_i)}{\sum_{i=0}^{100} \mu_{\text{agg}}(u_i)}$$

6. **Zero-Activation Fallback**:
   If $\sum_{i=0}^{100} \mu_{\text{agg}}(u_i) = 0$, $U^* = 0.0$, category = `"No irrigation indicated"`, and assessment status = `"zero_activation"`.

---

## 3. Linguistic Variables and Partition Boundaries

### Input 1: Soil-Water Depletion ($D$) $\in [0, 100\%]$
*Depleted fraction of Total Available Water (TAW) in crop root zone.*
- **Low**: $\text{trapmf}(0.0, 0.0, 20.0, 35.0)$
- **Moderate**: $\text{trimf}(20.0, 45.0, 65.0)$
- **High**: $\text{trimf}(55.0, 75.0, 90.0)$
- **Critical**: $\text{trapmf}(80.0, 92.0, 100.0, 100.0)$

### Input 2: Atmospheric Water Demand ($E$) $\in [0, 100]$
*Index proxy for vapor pressure deficit and reference evapotranspiration rate.*
- **Low**: $\text{trapmf}(0.0, 0.0, 25.0, 45.0)$
- **Medium**: $\text{trimf}(30.0, 55.0, 75.0)$
- **High**: $\text{trapmf}(65.0, 85.0, 100.0, 100.0)$

### Input 3: Short-Term Effective Rainfall ($R$) $\in [0, 50\text{ mm}]$
*Forecasted or recent rainfall penetrating effective root zone.*
- **Low**: $\text{trapmf}(0.0, 0.0, 5.0, 15.0)$
- **Moderate**: $\text{trimf}(10.0, 22.0, 35.0)$
- **High**: $\text{trapmf}(28.0, 40.0, 50.0, 50.0)$

### Output: Irrigation Urgency ($U$) $\in [0, 100]$
*Dimensionless decision index (0–100).*
- **No irrigation indicated**: $\text{trapmf}(0.0, 0.0, 15.0, 30.0)$
- **Monitor**: $\text{trimf}(20.0, 37.5, 55.0)$
- **Irrigation may be needed**: $\text{trimf}(45.0, 62.5, 80.0)$
- **High priority**: $\text{trapmf}(70.0, 85.0, 100.0, 100.0)$

---

## 4. Rule Base Configuration (36 Rules)

| Rule ID | Soil Depletion | Atmospheric Demand | Effective Rain | Consequent Urgency |
| :--- | :--- | :--- | :--- | :--- |
| `RULE_01` | Low | Low | High | No irrigation indicated |
| `RULE_02` | Low | Medium | High | No irrigation indicated |
| `RULE_03` | Low | High | High | No irrigation indicated |
| `RULE_04` | Low | Low | Moderate | No irrigation indicated |
| `RULE_05` | Low | Medium | Moderate | No irrigation indicated |
| `RULE_06` | Low | High | Moderate | No irrigation indicated |
| `RULE_07` | Low | Low | Low | No irrigation indicated |
| `RULE_08` | Low | Medium | Low | No irrigation indicated |
| `RULE_09` | Low | High | Low | Monitor |
| `RULE_10` | Moderate | Low | High | No irrigation indicated |
| `RULE_11` | Moderate | Medium | High | No irrigation indicated |
| `RULE_12` | Moderate | High | High | No irrigation indicated |
| `RULE_13` | Moderate | Low | Moderate | No irrigation indicated |
| `RULE_14` | Moderate | Medium | Moderate | Monitor |
| `RULE_15` | Moderate | High | Moderate | Monitor |
| `RULE_16` | Moderate | Low | Low | Monitor |
| `RULE_17` | Moderate | Medium | Low | Irrigation may be needed |
| `RULE_18` | Moderate | High | Low | Irrigation may be needed |
| `RULE_19` | High | Low | High | Monitor |
| `RULE_20` | High | Medium | High | Monitor |
| `RULE_21` | High | High | High | Monitor |
| `RULE_22` | High | Low | Moderate | Monitor |
| `RULE_23` | High | Medium | Moderate | Irrigation may be needed |
| `RULE_24` | High | High | Moderate | Irrigation may be needed |
| `RULE_25` | High | Low | Low | Irrigation may be needed |
| `RULE_26` | High | Medium | Low | High priority |
| `RULE_27` | High | High | Low | High priority |
| `RULE_28` | Critical | Low | High | Irrigation may be needed |
| `RULE_29` | Critical | Medium | High | Irrigation may be needed |
| `RULE_30` | Critical | High | High | Irrigation may be needed |
| `RULE_31` | Critical | Low | Moderate | Irrigation may be needed |
| `RULE_32` | Critical | Medium | Moderate | High priority |
| `RULE_33` | Critical | High | Moderate | High priority |
| `RULE_34` | Critical | Low | Low | High priority |
| `RULE_35` | Critical | Medium | Low | High priority |
| `RULE_36` | Critical | High | Low | High priority |

### Coverage and Conflict Verification
- Total combinations possible: $4 \times 3 \times 3 = 36$.
- Coverage ratio: $100\%$ ($36/36$ present).
- Conflicts detected: $0$.

---

## 5. Agronomic Boundaries & Crop Routing

### 5.1 Upland Crops
Crops such as Wheat, Maize, Barley, Soybean, and Cotton are evaluated via root-zone soil water depletion. Irrigation urgency depends on depletion relative to the crop depletion fraction $p$ (FAO-56).

### 5.2 Lowland Paddy Rice Isolation
Lowland paddy rice (*Oryza sativa*) is cultivated under flooded ponding conditions. Applying upland root-zone depletion metrics causes catastrophic yield loss or incorrect drying recommendations.
- **Routing**: Rice requests are intercepted and assigned `paddy_special_handling`.
- **Advisory Protocol**: Maintain 3–5 cm standing water layer during vegetative and reproductive stages, or monitor water depth using a perforated field tube (*pani pipe*) for Alternate Wetting and Drying (AWD). Upland root-zone rules are suspended.

### 5.3 Sensor Calibration Guardrails
Uncalibrated soil moisture sensors reporting raw percentages cannot be converted into root-zone depletion without:
1. Soil Field Capacity ($\theta_{\text{FC}}$).
2. Permanent Wilting Point ($\theta_{\text{WP}}$).
3. Effective Rooting Depth ($Z_r$).

If sensor calibration parameters are absent:
- In `academic_demo_mode = True`, provisional simulation approximations are computed with explicit disclaimers.
- In `academic_demo_mode = False` (production), the engine returns `insufficient_data` status.

---

## 6. Software Verification vs Agricultural Validation

| Dimension | Software Verification Status | Agricultural / Field Validation Status |
| :--- | :--- | :--- |
| **Logic & Engine** | Fully Verified (42 passing unit/integration tests). | Unvalidated (requires controlled field trials). |
| **Rule Base** | Complete 36/36 coverage, 0 conflicts. | Scaffold prototype (`v0.1-draft-scaffold`). |
| **Membership Bounds** | Strictly bounded in $[0, 1]$, non-negative widths. | Indicative; requires local soil-water retention curves. |
| **Defuzzification** | Centroid integration numerically verified. | Decision index (0–100); **NOT** volume (litres/mm). |
| **Crop Routing** | Automated paddy rice isolation & unsupported crop guards. | Crop coefficients ($K_c$) pending local agronomist sign-off. |

---

## 7. API Endpoints

- `POST /api/v1/irrigation/evaluate`: Evaluates irrigation urgency from derived or calibrated sensor inputs.
- `GET /api/v1/irrigation/rules`: Returns complete 36-rule base status, coverage ratio, and conflict report.
- `GET /api/v1/irrigation/crops`: Returns supported crops and their routing classification (Upland vs Ponded/AWD).
