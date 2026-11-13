# Crop Yield Prediction AI Module

## Overview
Predicts expected crop yield (regression) based on land area, rainfall, weather, and input treatments.

## Strict Crop Scope
- The underlying yield dataset supports **ONLY 5 crops**:
  - `Wheat`
  - `Barley`
  - `Corn` (Maize)
  - `Rice`
  - `Soybean`
- **Enforcement**: Any inference request for any crop outside these five will be rejected immediately with an HTTP 422/400 validation error.

## Integrated Recommendation-to-Yield Pathway
- Only **Rice** and **Corn/Maize** have an integrated pathway from the Crop Recommendation module.
- `Wheat`, `Barley`, and `Soybean` can be directly predicted in the yield module, but do not originate from the 22-crop recommendation integration.

## Unit Calibration Constraint
- Exact yield metric units (e.g. Metric Tonnes per Hectare vs. kg vs. bushels) require dataset schema verification before numerical predictions are exposed.
