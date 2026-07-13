"""Train and persist the self-study recommendation model."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import joblib
import matplotlib.pyplot as plt
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import GridSearchCV, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ai.config import (
    CATEGORICAL_FEATURES,
    FEATURE_COLUMNS,
    FEATURE_COLUMNS_PATH,
    FEATURE_IMPORTANCE_PATH,
    FEATURE_IMPORTANCE_PLOT_PATH,
    METADATA_PATH,
    MIN_ROWS_FOR_MODEL,
    MODEL_PATH,
    MODEL_VERSION,
    NUMERIC_FEATURES,
    PREPROCESS_PATH,
    RANDOM_SEED,
    REPORT_PATH,
    TrainingConfig,
    ensure_directories,
)
from ai.evaluation import (
    evaluate_classifier,
    extract_feature_importance,
    print_classification_report,
    print_feature_importance,
)
from ai.feature_engineering import prepare_training_data
from ai.reporting import build_validation_report


def build_pipeline() -> Pipeline:
    """Build the sklearn preprocessing and Random Forest pipeline.

    Returns:
        Configured sklearn Pipeline.
    """

    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            ("categorical", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )
    classifier = RandomForestClassifier(
        random_state=RANDOM_SEED,
        class_weight="balanced",
        n_jobs=-1,
    )
    return Pipeline(steps=[("preprocessor", preprocessor), ("model", classifier)])


def save_feature_importance_plot(feature_importance, output_path=FEATURE_IMPORTANCE_PLOT_PATH) -> None:
    """Save a horizontal bar chart for feature importance.

    Args:
        feature_importance: Dataframe from extract_feature_importance.
        output_path: PNG output path.
    """

    if feature_importance.empty:
        return
    plot_frame = feature_importance.sort_values("importance", ascending=True)
    plt.figure(figsize=(10, 6))
    plt.barh(plot_frame["feature"], plot_frame["importance"])
    plt.xlabel("Importance")
    plt.ylabel("Feature")
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()


def train_model(config: TrainingConfig | None = None) -> dict[str, Any]:
    """Train the model, evaluate it, and save artifacts.

    Args:
        config: Optional training configuration.

    Returns:
        Metadata dictionary written to metadata.json.

    Raises:
        ValueError: If there are too few rows for model training.
    """

    active_config = config or TrainingConfig()
    ensure_directories()

    x, y = prepare_training_data()
    if len(x) < MIN_ROWS_FOR_MODEL:
        raise ValueError(
            f"Need at least {MIN_ROWS_FOR_MODEL} rows for Random Forest training; got {len(x)}."
        )

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=active_config.test_size,
        random_state=active_config.random_seed,
        stratify=y,
    )

    pipeline = build_pipeline()
    param_grid = {
        "model__n_estimators": [100, 200],
        "model__max_depth": [None, 8, 14],
        "model__min_samples_leaf": [1, 3],
    }
    search = GridSearchCV(
        estimator=pipeline,
        param_grid=param_grid,
        scoring="f1",
        cv=active_config.cv_folds,
        n_jobs=-1,
        refit=True,
    )
    search.fit(x_train, y_train)

    best_model = search.best_estimator_
    y_pred = best_model.predict(x_test)
    y_probability = best_model.predict_proba(x_test)[:, 1]
    metrics = evaluate_classifier(y_test.to_numpy(), y_pred, y_probability)

    cv_scores = cross_val_score(
        best_model,
        x,
        y,
        cv=active_config.cv_folds,
        scoring="f1",
        n_jobs=-1,
    )
    feature_importance = extract_feature_importance(best_model, top_n=20)
    feature_importance.to_csv(FEATURE_IMPORTANCE_PATH, index=False, encoding="utf-8")
    save_feature_importance_plot(feature_importance)

    # 구조 개선: 전처리기(ColumnTransformer)와 분류기(RandomForestClassifier)를
    # 분리해서 저장한다. 두 아티팩트를 나누면 나중에 분류기만 교체하거나(예:
    # 다른 모델 알고리즘 시도) 전처리 로직만 바꾸는 재학습이 훨씬 쉬워지고,
    # predict.py가 각 아티팩트를 독립적으로 불러와 예측 결과는 기존과 동일하게
    # 유지된다 (preprocessor.transform 후 classifier.predict_proba를 그대로 호출).
    fitted_preprocessor = best_model.named_steps["preprocessor"]
    fitted_classifier = best_model.named_steps["model"]
    joblib.dump(fitted_preprocessor, PREPROCESS_PATH)
    joblib.dump(fitted_classifier, MODEL_PATH)
    FEATURE_COLUMNS_PATH.write_text(
        json.dumps(
            {
                "feature_columns": FEATURE_COLUMNS,
                "numeric_features": NUMERIC_FEATURES,
                "categorical_features": CATEGORICAL_FEATURES,
                "model_version": MODEL_VERSION,
                "random_seed": RANDOM_SEED,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    metadata: dict[str, Any] = {
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "data_count": int(len(x)),
        "feature_columns": FEATURE_COLUMNS,
        "accuracy": metrics["accuracy"],
        "precision": metrics["precision"],
        "recall": metrics["recall"],
        "f1_score": metrics["f1_score"],
        "roc_auc": metrics["roc_auc"],
        "confusion_matrix": metrics["confusion_matrix"],
        "random_seed": RANDOM_SEED,
        "best_params": search.best_params_,
        "cross_validation_f1_mean": float(cv_scores.mean()),
        "cross_validation_f1_std": float(cv_scores.std()),
        "feature_importance": feature_importance.to_dict(orient="records"),
        "feature_importance_path": str(FEATURE_IMPORTANCE_PATH),
        "feature_importance_plot_path": str(FEATURE_IMPORTANCE_PLOT_PATH),
        "model_path": str(MODEL_PATH),
        "preprocess_path": str(PREPROCESS_PATH),
        "feature_columns_path": str(FEATURE_COLUMNS_PATH),
    }

    METADATA_PATH.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    REPORT_PATH.write_text(build_validation_report(metadata), encoding="utf-8")
    print_classification_report(metrics)
    print_feature_importance(feature_importance)
    print(f"Cross Validation F1: {metadata['cross_validation_f1_mean']:.4f} +/- {metadata['cross_validation_f1_std']:.4f}")
    print(f"Saved preprocessor: {PREPROCESS_PATH}")
    print(f"Saved model: {MODEL_PATH}")
    print(f"Saved feature columns: {FEATURE_COLUMNS_PATH}")
    print(f"Saved metadata: {METADATA_PATH}")
    print(f"Saved feature importance: {FEATURE_IMPORTANCE_PATH}")
    print(f"Saved feature importance plot: {FEATURE_IMPORTANCE_PLOT_PATH}")
    print(f"Saved validation report: {REPORT_PATH}")
    return metadata


if __name__ == "__main__":
    train_model()
