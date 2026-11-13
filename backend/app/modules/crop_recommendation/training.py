"""Model training pipeline for Crop Recommendation (Decision Tree).

Strictly decoupled from runtime inference.
Performs stratified 80/20 train/test split, stratified 5-fold CV,
hyperparameter grid search optimized on macro F1, test set evaluation,
and serialization of trusted model artifact and metadata.
"""
import hashlib
import json
import logging
import platform
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.tree import DecisionTreeClassifier

from app.modules.crop_recommendation.constants import SUPPORTED_RECOMMENDATION_CROPS

logger = logging.getLogger(__name__)

# Canonical feature list and strict order
FEATURE_NAMES: list[str] = [
    "N",
    "P",
    "K",
    "temperature",
    "humidity",
    "ph",
    "rainfall",
]
TARGET_COLUMN: str = "label"
RANDOM_STATE: int = 42
MODEL_VERSION: str = "v1.0"


def compute_file_sha256(filepath: Path) -> str:
    """Compute SHA256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def validate_dataset(df: pd.DataFrame) -> None:
    """Validate dataset structure, types, missing values, duplicates, and class balance."""
    # 1. Row count check
    if len(df) != 2200:
        raise ValueError(f"Expected exactly 2,200 records in dataset, found {len(df)}")

    # 2. Column existence & ordering
    expected_cols = FEATURE_NAMES + [TARGET_COLUMN]
    if list(df.columns) != expected_cols:
        raise ValueError(
            f"Columns mismatch.\nExpected: {expected_cols}\nActual: {list(df.columns)}"
        )

    # 3. Missing values check
    null_counts = df.isnull().sum()
    if null_counts.any():
        raise ValueError(f"Dataset contains missing values:\n{null_counts[null_counts > 0]}")

    # 4. Duplicate records check
    dup_count = df.duplicated().sum()
    if dup_count > 0:
        raise ValueError(f"Dataset contains {dup_count} duplicate records.")

    # 5. Numerical types check
    for col in FEATURE_NAMES:
        if not np.issubdtype(df[col].dtype, np.number):
            raise TypeError(f"Feature '{col}' must be numerical, found {df[col].dtype}")

    # 6. Target class validation
    unique_crops = sorted(df[TARGET_COLUMN].unique())
    if unique_crops != sorted(SUPPORTED_RECOMMENDATION_CROPS):
        raise ValueError(
            f"Dataset classes do not match supported 22 crops.\n"
            f"Expected: {sorted(SUPPORTED_RECOMMENDATION_CROPS)}\n"
            f"Actual: {unique_crops}"
        )

    # 7. Class balance check (100 samples per crop)
    class_counts = df[TARGET_COLUMN].value_counts()
    if (class_counts != 100).any():
        raise ValueError(f"Unbalanced crop classes detected:\n{class_counts}")

    logger.info("Dataset validation passed: 2,200 records, 22 classes (100 each), 0 missing, 0 duplicates.")


def train_and_evaluate_crop_model(
    data_path: Path,
    output_dir: Path,
) -> dict[str, Any]:
    """Execute complete training, tuning, evaluation, and serialization pipeline."""
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset file not found at: {data_path}")

    output_dir.mkdir(parents=True, exist_ok=True)
    dataset_checksum = compute_file_sha256(data_path)

    # Load dataset
    df = pd.read_csv(data_path)
    validate_dataset(df)

    X = df[FEATURE_NAMES]
    y = df[TARGET_COLUMN]

    # Stratified 80/20 train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    logger.info(f"Development set: {len(X_train)} samples; Untouched test set: {len(X_test)} samples.")

    # Define hyperparameter grid for Decision Tree
    param_grid = {
        "criterion": ["gini", "entropy", "log_loss"],
        "max_depth": [8, 10, 12, 15, 20, None],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4],
        "ccp_alpha": [0.0, 0.001, 0.003, 0.005],
    }

    base_estimator = DecisionTreeClassifier(random_state=RANDOM_STATE)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    grid_search = GridSearchCV(
        estimator=base_estimator,
        param_grid=param_grid,
        scoring="f1_macro",
        cv=cv,
        n_jobs=-1,
        refit=True,
        verbose=1,
    )

    logger.info("Initiating 5-fold cross-validation hyperparameter search...")
    grid_search.fit(X_train, y_train)

    best_estimator: DecisionTreeClassifier = grid_search.best_estimator_
    best_params = grid_search.best_params_
    best_cv_macro_f1 = float(grid_search.best_score_)
    logger.info(f"Best CV Macro F1: {best_cv_macro_f1:.4f} with params: {best_params}")

    # Evaluate best estimator on the UNTOUCHED holdout test set (20%)
    y_pred = best_estimator.predict(X_test)

    test_accuracy = float(accuracy_score(y_test, y_pred))
    test_macro_precision = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    test_macro_recall = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    test_macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))

    class_report_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    class_report_str = classification_report(y_test, y_pred, zero_division=0)

    cm = confusion_matrix(y_test, y_pred, labels=best_estimator.classes_)
    cm_list = cm.tolist()

    # Feature importances
    importances = dict(zip(FEATURE_NAMES, [float(v) for v in best_estimator.feature_importances_]))
    sorted_importances = dict(sorted(importances.items(), key=lambda item: item[1], reverse=True))

    tree_depth = int(best_estimator.get_depth())
    leaf_count = int(best_estimator.get_n_leaves())

    # Build model artifact
    artifact_filename = f"crop_decision_tree_{MODEL_VERSION}.joblib"
    artifact_path = output_dir / artifact_filename

    joblib.dump(best_estimator, artifact_path)
    logger.info(f"Serialized model artifact to: {artifact_path}")

    # Compile comprehensive metadata
    metadata = {
        "model_name": "Decision Tree Crop Recommendation",
        "model_version": MODEL_VERSION,
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "algorithm": "sklearn.tree.DecisionTreeClassifier",
        "dataset": {
            "path": str(data_path),
            "sha256": dataset_checksum,
            "total_records": len(df),
            "dev_records": len(X_train),
            "test_records": len(X_test),
        },
        "feature_schema": {
            "names": FEATURE_NAMES,
            "order": FEATURE_NAMES,
            "count": len(FEATURE_NAMES),
        },
        "target_classes": list(best_estimator.classes_),
        "training_configuration": {
            "random_state": RANDOM_STATE,
            "cv_strategy": "StratifiedKFold(n_splits=5, shuffle=True)",
            "selection_metric": "f1_macro",
            "search_space": {k: [str(x) if x is None else x for x in v] for k, v in param_grid.items()},
            "best_hyperparameters": best_params,
        },
        "tree_structure": {
            "depth": tree_depth,
            "n_leaves": leaf_count,
        },
        "feature_importances": sorted_importances,
        "metrics": {
            "cv_best_macro_f1": best_cv_macro_f1,
            "test_holdout_accuracy": test_accuracy,
            "test_holdout_macro_precision": test_macro_precision,
            "test_holdout_macro_recall": test_macro_recall,
            "test_holdout_macro_f1": test_macro_f1,
        },
        "environment": {
            "python_version": platform.python_version(),
            "scikit_learn_version": sklearn.__version__,
            "numpy_version": np.__version__,
            "pandas_version": pd.__version__,
            "joblib_version": joblib.__version__,
            "platform": platform.platform(),
        },
    }

    metadata_filename = f"crop_decision_tree_{MODEL_VERSION}_metadata.json"
    metadata_path = output_dir / metadata_filename
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved metadata to: {metadata_path}")

    # Generate human-readable evaluation report
    report_filename = f"crop_decision_tree_{MODEL_VERSION}_evaluation.md"
    report_path = output_dir / report_filename

    report_markdown = f"""# Decision Tree Crop Recommendation — Evaluation Report ({MODEL_VERSION})

**Generated at**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
**Model Artifact**: `{artifact_filename}`
**Dataset SHA256**: `{dataset_checksum}`

---

## 1. Executive Summary

- **Cross-Validation Macro F1**: `{best_cv_macro_f1:.4f}`
- **Holdout Test Accuracy**: `{test_accuracy * 100:.2f}%` ({int(test_accuracy * len(X_test))}/{len(X_test)} correct)
- **Holdout Test Macro F1**: `{test_macro_f1:.4f}`
- **Holdout Test Macro Precision**: `{test_macro_precision:.4f}`
- **Holdout Test Macro Recall**: `{test_macro_recall:.4f}`
- **Tree Depth**: `{tree_depth}`
- **Leaf Nodes**: `{leaf_count}`

---

## 2. Selected Hyperparameters

Selected via 5-fold Stratified Cross-Validation on the 80% development set (1,760 samples) optimizing for **macro F1**:
```json
{json.dumps(best_params, indent=2)}
```

---

## 3. Feature Importance

| Rank | Feature | Importance Score | Percentage |
| :--- | :--- | :--- | :--- |
"""
    for rank, (feat, imp) in enumerate(sorted_importances.items(), 1):
        report_markdown += f"| {rank} | `{feat}` | {imp:.4f} | {imp * 100:.1f}% |\n"

    report_markdown += f"""
---

## 4. Per-Crop Classification Report (Untouched Test Holdout: 440 samples)

```
{class_report_str}
```

---

## 5. Confusion Matrix Summary

- Evaluated across {len(best_estimator.classes_)} classes ({len(X_test) // len(best_estimator.classes_)} samples per class in holdout).
- Total classification errors on holdout: {int((1.0 - test_accuracy) * len(X_test))}.

---

## 6. Agronomic Integrity & Boundary Verification

1. **Dataset Units**: The model operates directly on raw dataset features without unverified unit conversions.
2. **Probability Calibration**: Class probability distributions are kept internal until formal calibration is evaluated.
3. **Integrated Cross-Module Pathway**: Rice and Maize/Corn are confirmed as the sole recommendation crops with an agronomic pathway into the Yield Prediction engine.
4. **Academic Demonstration Guard**: In production, unverified unit inputs trigger explicit warnings.
"""

    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_markdown)
    logger.info(f"Saved evaluation markdown report to: {report_path}")

    return {
        "metadata": metadata,
        "artifact_path": str(artifact_path),
        "metadata_path": str(metadata_path),
        "report_path": str(report_path),
        "test_metrics": {
            "accuracy": test_accuracy,
            "macro_f1": test_macro_f1,
            "macro_precision": test_macro_precision,
            "macro_recall": test_macro_recall,
        },
        "best_params": best_params,
        "classification_report": class_report_dict,
        "confusion_matrix": cm_list,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    data_file = base_dir / "data" / "raw" / "Crop_recommendation.csv"
    models_dir = base_dir / "models" / "saved"

    print(f"Executing Decision Tree training with dataset: {data_file}")
    results = train_and_evaluate_crop_model(data_path=data_file, output_dir=models_dir)
    print("\nTraining and Evaluation Complete!")
    print(f"Artifact: {results['artifact_path']}")
    print(f"Holdout Accuracy: {results['test_metrics']['accuracy'] * 100:.2f}%")
    print(f"Holdout Macro F1: {results['test_metrics']['macro_f1']:.4f}")
