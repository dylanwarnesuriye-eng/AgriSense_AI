# Serialized Machine Learning Models

## Directory Layout
- `saved/`: Production and candidate model binaries (e.g., `.joblib`, `.pkl`, `.onnx`). Ignored by git via `.gitignore`.

## Principles
1. **Separation of Training and Inference**: Training scripts in `app/modules/*/training.py` write artifacts to this directory. Runtime inference services in `app/modules/*/inference.py` load these artifacts in read-only mode.
2. **Deterministic Artifact Naming**: Artifacts should include model type and version tag (e.g., `crop_dt_v1.0.joblib`, `yield_regressor_v1.0.joblib`).
3. **No Premature Training**: In Task 1 (foundation milestone), model weights are intentionally omitted pending agronomic data verification.
