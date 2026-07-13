"""Tests for prediction output shape with a trained lightweight model."""

from __future__ import annotations

import json

import joblib
import pytest

from ai.config import CATEGORICAL_FEATURES, FEATURE_COLUMNS, NUMERIC_FEATURES, TARGET_COLUMN
from ai.feature_engineering import engineer_features
from ai.predict import predict
from ai.prediction_validation import PredictionValidationError, validate_prediction_response
from ai.train import build_pipeline
from tests.test_feature_engineering import valid_record


def _fit_and_save_split_artifacts(tmp_path):
    """Train a tiny pipeline and save it in the split artifact format predict.py expects."""

    records = []
    for index in range(12):
        record = valid_record()
        record["G1"] = 7 + index % 8
        record["G2"] = 8 + index % 8
        record["G3"] = 1 if index < 6 else 15
        records.append(record)

    data = engineer_features(__import__("pandas").DataFrame(records), include_target=True)
    x = data[FEATURE_COLUMNS]
    y = data[TARGET_COLUMN]
    pipeline = build_pipeline()
    pipeline.fit(x, y)

    preprocess_path = tmp_path / "preprocess.pkl"
    model_path = tmp_path / "model.pkl"
    feature_columns_path = tmp_path / "feature_columns.json"

    joblib.dump(pipeline.named_steps["preprocessor"], preprocess_path)
    joblib.dump(pipeline.named_steps["model"], model_path)
    feature_columns_path.write_text(
        json.dumps(
            {
                "feature_columns": FEATURE_COLUMNS,
                "numeric_features": NUMERIC_FEATURES,
                "categorical_features": CATEGORICAL_FEATURES,
            }
        ),
        encoding="utf-8",
    )
    return preprocess_path, model_path, feature_columns_path


def test_predict_returns_service_ready_payload(tmp_path) -> None:
    preprocess_path, model_path, feature_columns_path = _fit_and_save_split_artifacts(tmp_path)

    payload = valid_record()
    payload.pop("G3")
    result = predict(
        [payload],
        preprocess_path=preprocess_path,
        model_path=model_path,
        feature_columns_path=feature_columns_path,
    )

    assert set(result) == {
        "recommended_study_time_minutes_per_day",
        "recommended_subject",
        "weak_subject",
        "strong_subject",
        "goal_achievement_probability",
        "goal_probability_level",
        "recommended_review_subject",
        "reason",
        "curriculum",
        "ebs_recommendations",
    }
    assert 0 <= result["goal_achievement_probability"] <= 1
    assert result["curriculum"], "single-subject prediction should still produce a curriculum entry"
    assert result["curriculum"][0]["subject"] == "math"
    validate_prediction_response(result)


def test_predict_curriculum_covers_all_subjects(tmp_path) -> None:
    preprocess_path, model_path, feature_columns_path = _fit_and_save_split_artifacts(tmp_path)

    math_payload = valid_record()
    math_payload.pop("G3")
    portuguese_payload = valid_record()
    portuguese_payload.pop("G3")
    portuguese_payload["subject"] = "portuguese"
    portuguese_payload["G1"] = 18
    portuguese_payload["G2"] = 19

    result = predict(
        [math_payload, portuguese_payload],
        preprocess_path=preprocess_path,
        model_path=model_path,
        feature_columns_path=feature_columns_path,
    )

    subjects_in_curriculum = {item["subject"] for item in result["curriculum"]}
    assert subjects_in_curriculum == {"math", "portuguese"}
    total_minutes = sum(item["allocated_minutes"] for item in result["curriculum"])
    assert total_minutes == result["recommended_study_time_minutes_per_day"]


def test_prediction_validation_rejects_missing_field() -> None:
    response = {
        "recommended_study_time_minutes_per_day": 30,
        "recommended_subject": "math",
        "weak_subject": "math",
        "strong_subject": None,
        "goal_achievement_probability": 0.5,
        "goal_probability_level": "medium",
        "recommended_review_subject": "math",
        "curriculum": [],
        "ebs_recommendations": [],
    }
    with pytest.raises(PredictionValidationError):
        validate_prediction_response(response)


def test_prediction_validation_rejects_subject_conflict() -> None:
    response = {
        "recommended_study_time_minutes_per_day": 30,
        "recommended_subject": "math",
        "weak_subject": "math",
        "strong_subject": "math",
        "goal_achievement_probability": 0.5,
        "goal_probability_level": "medium",
        "recommended_review_subject": "math",
        "reason": "Valid sentence.",
        "curriculum": [],
        "ebs_recommendations": [],
    }
    with pytest.raises(PredictionValidationError):
        validate_prediction_response(response)
