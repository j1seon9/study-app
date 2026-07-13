"""Tests for data validation and feature engineering."""

from __future__ import annotations

import pandas as pd
import pytest

from ai.config import FEATURE_COLUMNS, TARGET_COLUMN
from ai.feature_engineering import DataValidationError, engineer_features, get_feature_documentation


def valid_record() -> dict:
    """Return one valid raw student record."""

    return {
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
        "G3": 11,
    }


def test_engineer_features_with_valid_input() -> None:
    data = pd.DataFrame([valid_record()])
    result = engineer_features(data, include_target=True)
    assert list(result.columns) == FEATURE_COLUMNS + [TARGET_COLUMN]
    assert result[TARGET_COLUMN].iloc[0] == 1


def test_engineer_features_handles_missing_values() -> None:
    record = valid_record()
    record["G1"] = None
    record["school"] = None
    data = pd.DataFrame([record])
    result = engineer_features(data, include_target=True)
    assert result["G1"].isna().sum() == 0
    assert result["school"].iloc[0] == "unknown"


def test_engineer_features_clips_outliers() -> None:
    record = valid_record()
    record["age"] = 99
    record["G2"] = -10
    data = pd.DataFrame([record])
    result = engineer_features(data, include_target=True)
    assert result["age"].iloc[0] == 22
    assert result["G2"].iloc[0] == 0


def test_engineer_features_rejects_empty_data() -> None:
    with pytest.raises(DataValidationError):
        engineer_features(pd.DataFrame(), include_target=True)


def test_engineer_features_handles_wrong_data_type() -> None:
    record = valid_record()
    record["studytime"] = "bad"
    data = pd.DataFrame([record])
    result = engineer_features(data, include_target=True)
    assert result["studytime"].iloc[0] == 1


def test_feature_documentation_matches_feature_columns() -> None:
    docs = get_feature_documentation()
    assert set(docs) == set(FEATURE_COLUMNS)
    assert "grade_trend" in docs
    assert "absence_risk" in docs
