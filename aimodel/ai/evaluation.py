"""Model evaluation helpers for classification tasks."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def evaluate_classifier(y_true: np.ndarray, y_pred: np.ndarray, y_probability: np.ndarray | None) -> dict[str, Any]:
    """Calculate classification metrics.

    Args:
        y_true: Ground-truth binary labels.
        y_pred: Predicted binary labels.
        y_probability: Probability for the positive class, if available.

    Returns:
        Dictionary of metrics.
    """

    metrics: dict[str, Any] = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1_score": float(f1_score(y_true, y_pred, zero_division=0)),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }

    if y_probability is not None and len(set(y_true)) > 1:
        metrics["roc_auc"] = float(roc_auc_score(y_true, y_probability))
    else:
        metrics["roc_auc"] = None

    return metrics


def print_classification_report(metrics: dict[str, Any]) -> None:
    """Print classification metrics in a stable CLI format.

    Args:
        metrics: Metrics dictionary from evaluate_classifier.
    """

    print("Evaluation Metrics")
    print(f"Accuracy : {metrics['accuracy']:.4f}")
    print(f"Precision: {metrics['precision']:.4f}")
    print(f"Recall   : {metrics['recall']:.4f}")
    print(f"F1 Score : {metrics['f1_score']:.4f}")
    if metrics["roc_auc"] is not None:
        print(f"ROC-AUC  : {metrics['roc_auc']:.4f}")
    else:
        print("ROC-AUC  : N/A")
    print(f"Confusion Matrix: {metrics['confusion_matrix']}")


def extract_feature_importance(model: Any, top_n: int = 20) -> pd.DataFrame:
    """Extract feature importance from a fitted preprocessing pipeline.

    Args:
        model: Fitted sklearn Pipeline with preprocessor and Random Forest model.
        top_n: Number of rows to return.

    Returns:
        Dataframe with feature and importance columns.
    """

    preprocessor = model.named_steps["preprocessor"]
    classifier = model.named_steps["model"]
    return extract_feature_importance_from_artifacts(preprocessor, classifier, top_n=top_n)


def extract_feature_importance_from_artifacts(preprocessor: Any, classifier: Any, top_n: int = 20) -> pd.DataFrame:
    """Extract feature importance from the split preprocess/model artifacts.

    Training saves the fitted ``ColumnTransformer`` and classifier separately
    (see ``ai.train.train_model`` and ``ai.predict.load_artifacts``). This
    variant lets any caller compute feature importance after loading those
    two pieces directly, without needing to reassemble a full Pipeline.

    Args:
        preprocessor: Fitted ColumnTransformer.
        classifier: Fitted classifier with a ``feature_importances_`` attribute.
        top_n: Number of rows to return.

    Returns:
        Dataframe with feature and importance columns.
    """

    feature_names = preprocessor.get_feature_names_out()
    importances = classifier.feature_importances_
    frame = pd.DataFrame(
        {
            "feature": feature_names,
            "importance": importances,
        }
    ).sort_values("importance", ascending=False)
    return frame.head(top_n).reset_index(drop=True)


def print_feature_importance(feature_importance: pd.DataFrame) -> None:
    """Print top feature importance rows.

    Args:
        feature_importance: Dataframe returned by extract_feature_importance.
    """

    print("Top Feature Importance")
    for row in feature_importance.itertuples(index=False):
        print(f"{row.feature}: {row.importance:.6f}")
