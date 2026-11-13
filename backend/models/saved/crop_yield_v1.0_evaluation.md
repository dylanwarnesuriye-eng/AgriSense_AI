# Crop Yield Regression — Evaluation Report (v1.0)

**Generated at**: 2026-09-22 03:54:30 UTC
**Model Artifact**: `yield_regressor_v1.0.joblib`
**Dataset SHA256**: `e42e7896f4830154185835fe0437e18dfeffddd9d1e86998326852bc271971f0`
**Validation Strategy**: 5-Fold Grouped Cross-Validation grouped by `field_id` (Zero Spatial Data Leakage)

---

## 1. Executive Summary

- **Selected Model**: **Ridge Regression Pipeline (`alpha=1.0`)**
- **Selected Feature Set**: **Extended Features** (Soil, Climate & Crop Management Inputs)
- **Holdout Test MAE**: `0.5180 t/ha`
- **Holdout Test RMSE**: `0.6424 t/ha`
- **Holdout Test R²**: `0.6846`
- **Prediction Bias (Mean Residual)**: `-0.0271 t/ha`
- **Residual Standard Deviation**: `0.6422 t/ha`
- **Training Dev MAE**: `0.5081 t/ha` (Demonstrating excellent generalization with near-identical train/holdout performance)

---

## 2. Model & Feature Set Comparison (5-Fold Grouped Cross-Validation)

| Feature Set | Model / Baseline | CV MAE (t/ha) | CV RMSE (t/ha) | CV R² |
| :--- | :--- | :--- | :--- | :--- |
| **Core Features** (Pre-planting) | Global Mean Baseline | 0.9410 | 1.1549 | -0.0010 |
| Core Features | Crop-Specific Mean Baseline | 0.9422 | 1.1568 | -0.0043 |
| Core Features | Ridge Regression | 0.9225 | 1.1274 | 0.0461 |
| Core Features | Decision Tree Regressor | 0.9970 | 1.2318 | -0.1387 |
| Core Features | Random Forest Regressor | 0.9294 | 1.1388 | 0.0268 |
| Core Features | Gradient Boosting Regressor | 0.9255 | 1.1325 | 0.0375 |
| **Extended Features** (Full Season) | Global Mean Baseline | 0.9410 | 1.1549 | -0.0010 |
| Extended Features | Crop-Specific Mean Baseline | 0.9422 | 1.1568 | -0.0043 |
| Extended Features | **Ridge Regression** | **0.5110** | **0.6433** | **0.6893** |
| Extended Features | Decision Tree Regressor | 0.5951 | 0.7490 | 0.5789 |
| Extended Features | Random Forest Regressor | 0.5208 | 0.6550 | 0.6780 |
| Extended Features | Gradient Boosting Regressor | 0.5122 | 0.6438 | 0.6889 |

---

## 3. Per-Crop Evaluation (Untouched Grouped Holdout: 935 records)

| Crop Name | Samples | Mean Actual (t/ha) | Mean Pred (t/ha) | MAE (t/ha) | RMSE (t/ha) | R² |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Wheat** | 190 | 6.23 | 6.18 | 0.5189 | 0.6351 | 0.7101 |
| **Barley** | 183 | 6.35 | 6.29 | 0.5623 | 0.6915 | 0.6248 |
| **Corn** | 198 | 6.26 | 6.26 | 0.4874 | 0.6037 | 0.7342 |
| **Rice** | 184 | 6.20 | 6.17 | 0.4795 | 0.6010 | 0.6946 |
| **Soybean** | 180 | 6.26 | 6.25 | 0.5450 | 0.6797 | 0.6457 |

---

## 4. Top Feature Coefficients (Standardized Scale)

| Rank | Transformed Feature | Coefficient | Direction & Significance |
| :--- | :--- | :--- | :--- |
| 1 | `num__fertilizer_amount` | `+0.8793` | Positive (+) |
| 2 | `num__pesticide_usage` | `-0.2675` | Negative (-) |
| 3 | `num__total_rainfall` | `+0.2055` | Positive (+) |
| 4 | `num__soil_moisture` | `+0.0765` | Positive (+) |
| 5 | `num__nitrogen_content` | `+0.0667` | Positive (+) |
| 6 | `num__avg_temperature` | `-0.0649` | Negative (-) |
| 7 | `num__potassium_content` | `+0.0645` | Positive (+) |
| 8 | `cat__region_North` | `+0.0643` | Positive (+) |
| 9 | `cat__crop_type_Soybean` | `+0.0329` | Positive (+) |
| 10 | `num__phosphorus_content` | `+0.0279` | Positive (+) |

---

## 5. Agronomic Boundaries & Leakage Elimination

1. **Grouped Cross-Validation**: Data leakage was strictly prevented by ensuring all records belonging to each `field_id` were isolated exclusively into either train or test folds (`0` overlapping fields).
2. **Crop Scope Limitation**: Predictions are strictly restricted to **Wheat, Barley, Corn, Rice, and Soybean**. All other crops are blocked.
3. **Integrated Cross-Module Mapping**:
   - `rice` (Crop Recommendation) $\rightarrow$ `Rice` (Yield Prediction)
   - `maize` (Crop Recommendation) $\rightarrow$ `Corn` (Yield Prediction)
   - Other 20 recommendation crops correctly return `yield_supported: false`.
4. **Academic Demonstration Mode**: Because commercial fertilizer/pesticide units in the challenge dataset represent uncertified physical units, predictions operate under academic demonstration mode with explicit advisory warnings.
