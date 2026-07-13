"""Tests for model artifact helper behavior."""

from __future__ import annotations

import json

import joblib
import numpy as np

from ai.config import FEATURE_COLUMNS, TARGET_COLUMN
from ai.evaluation import extract_feature_importance, extract_feature_importance_from_artifacts
from ai.feature_engineering import engineer_features
from ai.predict import load_artifacts
from ai.train import build_pipeline
from tests.test_feature_engineering import valid_record


def test_model_save_load_and_feature_importance(tmp_path) -> None:
    records = []
    for index in range(16):
        record = valid_record()
        record["subject"] = "math" if index % 2 == 0 else "portuguese"
        record["G1"] = 6 + index % 10
        record["G2"] = 7 + index % 10
        record["G3"] = 1 if index < 8 else 15
        records.append(record)

    data = engineer_features(__import__("pandas").DataFrame(records), include_target=True)
    pipeline = build_pipeline()
    pipeline.fit(data[FEATURE_COLUMNS], data[TARGET_COLUMN])

    importance = extract_feature_importance(pipeline, top_n=5)
    assert not importance.empty
    assert set(importance.columns) == {"feature", "importance"}

    preprocess_path = tmp_path / "preprocess.pkl"
    model_path = tmp_path / "model.pkl"
    feature_columns_path = tmp_path / "feature_columns.json"

    joblib.dump(pipeline.named_steps["preprocessor"], preprocess_path)
    joblib.dump(pipeline.named_steps["model"], model_path)
    feature_columns_path.write_text(
        json.dumps({"feature_columns": FEATURE_COLUMNS, "model_version": "test", "random_seed": 42}),
        encoding="utf-8",
    )

    artifacts = load_artifacts(
        preprocess_path=preprocess_path,
        model_path=model_path,
        feature_columns_path=feature_columns_path,
    )
    assert artifacts.feature_columns == FEATURE_COLUMNS
    assert artifacts.model_version == "test"
    # Split artifacts should behave identically to the original combined pipeline.
    transformed = artifacts.preprocessor.transform(data[FEATURE_COLUMNS])
    split_predictions = artifacts.classifier.predict_proba(transformed)[:, 1]
    combined_predictions = pipeline.predict_proba(data[FEATURE_COLUMNS])[:, 1]
    # RandomForestClassifier uses n_jobs=-1, so the exact floating-point
    # summation order across trees can vary slightly between calls even with
    # the same fitted model; compare with a tolerance instead of exact ==.
    assert np.isclose(split_predictions, combined_predictions, atol=1e-9).all()

    split_importance = extract_feature_importance_from_artifacts(
        artifacts.preprocessor, artifacts.classifier, top_n=5
    )
    assert not split_importance.empty
    assert set(split_importance.columns) == {"feature", "importance"}
