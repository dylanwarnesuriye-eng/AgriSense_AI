# Agricultural Data Assets

## Directory Layout
- `raw/`: Canonical, immutable raw dataset files (e.g. CSVs, tabular spreadsheets).
- `processed/`: Cleaned, feature-engineered, and validated splits ready for model training pipelines.

## Dataset Constraints & Notes
1. **Crop Recommendation Dataset**:
   - Supports strictly 22 target crops.
   - Features: N, P, K, Temperature, Relative Humidity, pH, Rainfall.
2. **Crop Yield Prediction Dataset**:
   - Strictly limited to 5 crops: Wheat, Barley, Corn (Maize), Rice, and Soybean.
   - Requires verification of units (e.g., metric tons vs. kilograms vs. bushels) before ingestion.
3. **Agronomic Data Integrity**:
   - Do not perform ad-hoc unit conversions without verified citation.
   - Maintain reproducible data loading scripts.
