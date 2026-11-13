# Decision Tree Crop Recommendation — Evaluation Report (v1.0)

**Generated at**: 2026-09-22 03:40:43 UTC
**Model Artifact**: `crop_decision_tree_v1.0.joblib`
**Dataset SHA256**: `54a5a6e5408668e668667efc50de2fc867c1b875e0431b4f54dd331b0a109a4e`

---

## 1. Executive Summary

- **Cross-Validation Macro F1**: `0.9864`
- **Holdout Test Accuracy**: `97.95%` (431/440 correct)
- **Holdout Test Macro F1**: `0.9794`
- **Holdout Test Macro Precision**: `0.9810`
- **Holdout Test Macro Recall**: `0.9795`
- **Tree Depth**: `12`
- **Leaf Nodes**: `31`

---

## 2. Selected Hyperparameters

Selected via 5-fold Stratified Cross-Validation on the 80% development set (1,760 samples) optimizing for **macro F1**:
```json
{
  "ccp_alpha": 0.0,
  "criterion": "gini",
  "max_depth": 12,
  "min_samples_leaf": 1,
  "min_samples_split": 5
}
```

---

## 3. Feature Importance

| Rank | Feature | Importance Score | Percentage |
| :--- | :--- | :--- | :--- |
| 1 | `rainfall` | 0.3210 | 32.1% |
| 2 | `P` | 0.2259 | 22.6% |
| 3 | `humidity` | 0.2003 | 20.0% |
| 4 | `N` | 0.1446 | 14.5% |
| 5 | `K` | 0.0987 | 9.9% |
| 6 | `ph` | 0.0061 | 0.6% |
| 7 | `temperature` | 0.0034 | 0.3% |

---

## 4. Per-Crop Classification Report (Untouched Test Holdout: 440 samples)

```
              precision    recall  f1-score   support

       apple       1.00      1.00      1.00        20
      banana       1.00      1.00      1.00        20
   blackgram       1.00      0.80      0.89        20
    chickpea       1.00      1.00      1.00        20
     coconut       1.00      1.00      1.00        20
      coffee       1.00      1.00      1.00        20
      cotton       1.00      1.00      1.00        20
      grapes       1.00      1.00      1.00        20
        jute       0.91      1.00      0.95        20
 kidneybeans       1.00      1.00      1.00        20
      lentil       0.86      0.90      0.88        20
       maize       0.95      1.00      0.98        20
       mango       1.00      1.00      1.00        20
   mothbeans       0.86      0.95      0.90        20
    mungbean       1.00      1.00      1.00        20
   muskmelon       1.00      1.00      1.00        20
      orange       1.00      1.00      1.00        20
      papaya       1.00      1.00      1.00        20
  pigeonpeas       1.00      1.00      1.00        20
 pomegranate       1.00      1.00      1.00        20
        rice       1.00      0.90      0.95        20
  watermelon       1.00      1.00      1.00        20

    accuracy                           0.98       440
   macro avg       0.98      0.98      0.98       440
weighted avg       0.98      0.98      0.98       440

```

---

## 5. Confusion Matrix Summary

- Evaluated across 22 classes (20 samples per class in holdout).
- Total classification errors on holdout: 9.

---

## 6. Agronomic Integrity & Boundary Verification

1. **Dataset Units**: The model operates directly on raw dataset features without unverified unit conversions.
2. **Probability Calibration**: Class probability distributions are kept internal until formal calibration is evaluated.
3. **Integrated Cross-Module Pathway**: Rice and Maize/Corn are confirmed as the sole recommendation crops with an agronomic pathway into the Yield Prediction engine.
4. **Academic Demonstration Guard**: In production, unverified unit inputs trigger explicit warnings.
