"""Prediction entrypoint for the self-study recommendation model."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, NamedTuple

import joblib
import pandas as pd

from ai.config import (
    FEATURE_COLUMNS,
    FEATURE_COLUMNS_PATH,
    MODEL_PATH,
    PREPROCESS_PATH,
)
from ai.feature_engineering import clean_student_data, prepare_prediction_data
from ai.prediction_validation import validate_prediction_response
from ai.report_generator import generate_report


class ModelArtifacts(NamedTuple):
    """Split model artifacts loaded from disk (see ``ai.train.train_model``)."""

    preprocessor: Any
    classifier: Any
    feature_columns: list[str]
    model_version: str | None
    random_seed: int | None


def load_artifacts(
    preprocess_path: Path = PREPROCESS_PATH,
    model_path: Path = MODEL_PATH,
    feature_columns_path: Path = FEATURE_COLUMNS_PATH,
) -> ModelArtifacts:
    """Load the split preprocessor/classifier/feature-columns artifacts.

    Args:
        preprocess_path: Path to preprocess.pkl (fitted ColumnTransformer).
        model_path: Path to model.pkl (fitted classifier only).
        feature_columns_path: Path to feature_columns.json.

    Returns:
        ModelArtifacts with the fitted preprocessor, classifier, and metadata.

    Raises:
        FileNotFoundError: If any artifact file is missing.
    """

    for path in (preprocess_path, model_path, feature_columns_path):
        if not path.exists():
            raise FileNotFoundError(f"Model artifact not found: {path}. Run python -m ai.train first.")

    preprocessor = joblib.load(preprocess_path)
    classifier = joblib.load(model_path)
    meta = json.loads(feature_columns_path.read_text(encoding="utf-8"))

    return ModelArtifacts(
        preprocessor=preprocessor,
        classifier=classifier,
        feature_columns=meta.get("feature_columns", FEATURE_COLUMNS),
        model_version=meta.get("model_version"),
        random_seed=meta.get("random_seed"),
    )


def predict(
    records: list[dict[str, Any]],
    preprocess_path: Path = PREPROCESS_PATH,
    model_path: Path = MODEL_PATH,
    feature_columns_path: Path = FEATURE_COLUMNS_PATH,
) -> dict[str, Any]:
    """Predict goal probability and create study recommendations.

    Args:
        records: One or more subject records for a student.
        preprocess_path: Path to preprocess.pkl.
        model_path: Path to model.pkl.
        feature_columns_path: Path to feature_columns.json.

    Returns:
        Prediction and recommendation dictionary.
    """

    if not records:
        raise ValueError("records must contain at least one student subject record.")

    artifacts = load_artifacts(preprocess_path, model_path, feature_columns_path)

    feature_frame = prepare_prediction_data(records)
    feature_frame = feature_frame[artifacts.feature_columns]
    transformed = artifacts.preprocessor.transform(feature_frame)
    probabilities = artifacts.classifier.predict_proba(transformed)[:, 1]
    goal_probability = float(probabilities.mean())

    raw_frame = pd.DataFrame(records)
    if "G3" not in raw_frame.columns:
        raw_frame["G3"] = 0
    cleaned_records = clean_student_data(raw_frame)

    response = generate_report(cleaned_records, goal_probability)
    validate_prediction_response(response)
    return response


def _example_records() -> list[dict[str, Any]]:
    """Return a minimal CLI demo payload using real dataset columns."""

    return [
        {
            "subject": "math",
            "school": "GP",
            "sex": "F",
            "age": 17,
            "address": "U",
            "famsize": "GT3",
            "Pstatus": "T",
            "Medu": 2,
            "Fedu": 2,
            "Mjob": "services",
            "Fjob": "other",
            "reason": "course",
            "guardian": "mother",
            "traveltime": 1,
            "studytime": 2,
            "failures": 0,
            "schoolsup": "no",
            "famsup": "yes",
            "paid": "no",
            "activities": "yes",
            "nursery": "yes",
            "higher": "yes",
            "internet": "yes",
            "romantic": "no",
            "famrel": 4,
            "freetime": 3,
            "goout": 3,
            "Dalc": 1,
            "Walc": 1,
            "health": 4,
            "absences": 4,
            "G1": 9,
            "G2": 8,
        }
    ]


if __name__ == "__main__":
    result = predict(_example_records())
    print(json.dumps(result, indent=2, ensure_ascii=False))
