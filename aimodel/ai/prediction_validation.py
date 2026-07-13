"""Validation for service-facing prediction payloads."""

from __future__ import annotations

from typing import Any

from ai.config import PREDICTION_SCHEMA


class PredictionValidationError(ValueError):
    """Raised when a prediction response violates the public contract."""


def validate_prediction_response(response: dict[str, Any]) -> None:
    """Validate prediction response schema, types, and ranges.

    Args:
        response: Prediction response dictionary.

    Raises:
        PredictionValidationError: If required fields, types, or ranges fail.
    """

    expected_fields = set(PREDICTION_SCHEMA)
    actual_fields = set(response)
    missing = sorted(expected_fields - actual_fields)
    extra = sorted(actual_fields - expected_fields)
    if missing:
        raise PredictionValidationError(f"Prediction response missing fields: {missing}")
    if extra:
        raise PredictionValidationError(f"Prediction response has unexpected fields: {extra}")

    for field, expected_type in PREDICTION_SCHEMA.items():
        if not isinstance(response[field], expected_type):
            raise PredictionValidationError(
                f"{field} must be {expected_type}, got {type(response[field]).__name__}"
            )

    minutes = response["recommended_study_time_minutes_per_day"]
    if not 0 <= minutes <= 240:
        raise PredictionValidationError("recommended_study_time_minutes_per_day must be between 0 and 240.")

    probability = response["goal_achievement_probability"]
    if not 0.0 <= probability <= 1.0:
        raise PredictionValidationError("goal_achievement_probability must be between 0 and 1.")

    if response["goal_probability_level"] not in {"very_high", "high", "medium", "low", "very_low"}:
        raise PredictionValidationError("goal_probability_level has an unknown value.")

    weak_subject = response["weak_subject"]
    strong_subject = response["strong_subject"]
    if weak_subject is not None and strong_subject is not None and weak_subject == strong_subject:
        raise PredictionValidationError("weak_subject and strong_subject must not be the same.")

