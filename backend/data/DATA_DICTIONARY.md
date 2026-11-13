# Smart Agriculture AI — Data Dictionary & Agronomic Schema

This document formalizes the variables, measurement ranges, confirmed units, and unresolved measurement definitions across all project datasets, strictly adhering to agronomic verification principles.

---

## 1. Crop Recommendation Dataset (`Crop_recommendation.csv`)

- **Total Records**: 2,200 rows
- **Total Features**: 7 inputs + 1 categorical target
- **Target Variable**: `label` (22 distinct crop classes, exactly 100 samples per class)
- **Data Completeness**: 0 missing values, 0 duplicate records

| Column Name | Data Type | Role | Observed Range [Min, Max] | Central Tendency (Mean ± Std) | Confirmed Unit | Unresolved / Ambiguous Measurement Definitions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `N` | `int64` | Input Feature | [0, 140] | 50.55 ± 36.92 | **Unconfirmed** (Ratio or kg/ha index) | **Unresolved**: Exact physical unit (e.g., kg/ha vs. mg/kg vs. relative soil test index). Does NOT match the 0.5–3.0 scale in the yield dataset. |
| `P` | `int64` | Input Feature | [5, 145] | 53.36 ± 32.99 | **Unconfirmed** (Ratio or kg/ha index) | **Unresolved**: Soil test Phosphorus extraction method (Bray, Olsen, or Mehlich) and exact concentration unit unknown. |
| `K` | `int64` | Input Feature | [5, 205] | 48.15 ± 50.65 | **Unconfirmed** (Ratio or kg/ha index) | **Unresolved**: Exchangeable Potassium unit (kg/ha vs. mg/kg) not confirmed. Scale differs by orders of magnitude from yield dataset. |
| `temperature` | `float64` | Input Feature | [8.83, 43.68] | 25.62 ± 5.06 | Degrees Celsius (°C) | Confirmed ambient temperature, but sampling frequency (mean daily vs. seasonal) is unspecified. |
| `humidity` | `float64` | Input Feature | [14.26, 99.98] | 71.48 ± 22.26 | Percentage (%) | Confirmed relative humidity (0–100%). |
| `ph` | `float64` | Input Feature | [3.50, 9.94] | 6.47 ± 0.77 | Standard pH Units [0–14] | Confirmed soil reaction index (acidic to alkaline). |
| `rainfall` | `float64` | Input Feature | [20.21, 298.56] | 103.46 ± 54.96 | Millimeters (mm) | **Unresolved**: Observation time window unspecified (monthly precipitation vs. cumulative crop-growth cycle rainfall). |
| `label` | `object` | **Target Class** | 22 categories | 100 per crop | Categorical Label | Strictly bounded to 22 crops: `apple`, `banana`, `blackgram`, `chickpea`, `coconut`, `coffee`, `cotton`, `grapes`, `jute`, `kidneybeans`, `lentil`, `maize`, `mango`, `mothbeans`, `mungbean`, `muskmelon`, `orange`, `papaya`, `pigeonpeas`, `pomegranate`, `rice`, `watermelon`. |

---

## 2. Crop Yield Dataset (`crop_yield_train.csv` & `crop_yield_test.csv`)

- **Training Records**: 4,800 rows (17 features + 1 target)
- **Test Records**: 1,200 rows (17 features)
- **Target Variable**: `yield_tpha` (Continuous regression target)
- **Data Completeness**: 0 missing values, 0 duplicate records across train and test

| Column Name | Data Type | Role | Observed Range [Min, Max] | Central Tendency (Mean ± Std) | Confirmed Unit | Unresolved / Ambiguous Measurement Definitions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `int64` | Identifier | [0, 4799] (train) / [0, 1199] (test) | N/A | Row index | Arbitrary sample sequence; must be excluded from feature matrices. |
| `soil_ph` | `float64` | Input Feature | [4.50, 8.50] | 6.49 ± 1.16 | Standard pH Units [0–14] | Confirmed soil pH. |
| `soil_moisture` | `float64` | Input Feature | [10.01, 49.99] | 29.77 ± 11.45 | Volumetric / % | **Unresolved**: Volumetric water content (%) vs. gravimetric moisture percentage. |
| `avg_temperature` | `float64` | Input Feature | [10.01, 35.00] | 22.61 ± 7.22 | Degrees Celsius (°C) | Confirmed mean temperature over growing period. |
| `total_rainfall` | `float64` | Input Feature | [100.05, 1199.89] | 664.90 ± 317.14 | Millimeters (mm) | Confirmed cumulative rainfall over the complete crop growth cycle. |
| `fertilizer_amount` | `float64` | Input Feature | [50.05, 299.93] | 174.12 ± 71.01 | **Unconfirmed** (kg/ha or lbs/acre) | **Unresolved**: Physical application unit not stated; blend formulation/grade (e.g., urea, DAP, NPK composite) unspecified. Strongly correlated with yield (r = +0.765). |
| `pesticide_usage` | `float64` | Input Feature | [0.00008, 14.997] | 7.50 ± 4.32 | **Unconfirmed** (kg/ha, L/ha, or a.i./ha) | **Unresolved**: Active ingredient vs. formulation volume; active chemical family unstated. Negatively correlated with yield (r = -0.259). |
| `sunlight_hours` | `float64` | Input Feature | [1001.19, 2998.54] | 1998.42 ± 580.12 | Hours (hrs) | Confirmed total cumulative sunshine hours during season. |
| `nitrogen_content` | `float64` | Input Feature | [0.50, 3.00] | 1.74 ± 0.73 | **Unconfirmed** (% dry weight or g/kg) | **Unresolved**: Appears to represent percentage organic/total nitrogen in soil (0.5%–3.0%). **Incompatible with `N` in recommendation dataset (0–140)**. |
| `phosphorus_content`| `float64` | Input Feature | [0.20, 1.50] | 0.85 ± 0.37 | **Unconfirmed** (% dry weight or g/kg) | **Unresolved**: Low fractional values (0.2%–1.5%). **Incompatible with `P` in recommendation dataset (5–145)**. |
| `potassium_content` | `float64` | Input Feature | [0.50, 2.00] | 1.26 ± 0.43 | **Unconfirmed** (% dry weight or g/kg) | **Unresolved**: Fractional values (0.5%–2.0%). **Incompatible with `K` in recommendation dataset (5–205)**. |
| `irrigation_frequency` | `int64` | Input Feature | [1, 6] | 3.52 ± 1.70 | Integer Count | **Unresolved**: Event count duration undefined (e.g., cycles per week, month, or total seasonal irrigation passes). |
| `crop_type` | `object` | Input Feature | 5 categories | Balanced (~950/crop) | Categorical Label | Strictly 5 crops: `Barley`, `Corn`, `Rice`, `Soybean`, `Wheat`. |
| `region` | `object` | Input Feature | 5 categories | Balanced (~960/region)| Categorical Label | Five geographic zones: `Central`, `East`, `North`, `South`, `West`. |
| `season` | `object` | Input Feature | 3 categories | Balanced (~1600/season)| Categorical Label | Three growing seasons: `Autumn`, `Spring`, `Summer`. |
| `harvest_date` | `object` | Input Feature | [2021-01-01, 2021-12-31] | N/A | ISO Date (`YYYY-MM-DD`) | Single calendar year (2021). |
| `field_id` | `object` | Grouping ID | 498 unique IDs | 10–12 records/field | Alphanumeric (`F0001`–`F0500`) | Identifies distinct plots. 456 of 457 test fields exist in the training set (99.8% field overlap). |
| `yield_tpha` | `float64` | **Target Metric** | [2.34, 9.54] | 6.27 ± 1.15 | **Metric Tonnes per Hectare (t/ha)** | Confirmed by column suffix `_tpha`. |

---

## 3. Cross-Dataset Incompatibilities & Agronomic Constraints

1. **Macronutrient Units Disparity (NPK)**:
   - In `Crop_recommendation.csv`: `N` $\in [0, 140]$, `P` $\in [5, 145]$, `K` $\in [5, 205]$.
   - In `crop_yield_train.csv`: `nitrogen_content` $\in [0.5, 3.0]$, `phosphorus_content` $\in [0.2, 1.5]$, `potassium_content` $\in [0.5, 2.0]$.
   - **Crucial Rule**: Direct numerical substitution of NPK from the recommendation dataset into the yield model is forbidden because the underlying scales and physical units represent different physical quantities (e.g. index/available kg/ha vs. percentage concentration).

2. **Crop Scope Mismatch**:
   - Recommendation supports 22 crops; Yield prediction supports ONLY 5 crops.
   - **Integrated Flow**: Only `Rice` and `Maize` (`Corn`) exist in both domains.
   - Yield predictions cannot be executed for the other 20 recommendation crops (`apple`, `banana`, `coffee`, etc.) without fabricating unsupported data.

3. **Field ID Data Leakage**:
   - 99.8% of fields in `crop_yield_test.csv` are present in `crop_yield_train.csv`.
   - Cross-validation schemes must use `GroupKFold(groups=field_id)` to evaluate generalization to unseen plots, preventing target leakage through field memorization.
