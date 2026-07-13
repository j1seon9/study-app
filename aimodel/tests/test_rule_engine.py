"""Tests for rule-based recommendations."""

from __future__ import annotations

import pandas as pd

from ai.feature_engineering import clean_student_data
from ai.rule_engine import probability_level, rank_subjects, recommend_from_rules
from tests.test_feature_engineering import valid_record


def test_rank_subjects_orders_by_risk_descending() -> None:
    math = valid_record()
    math["subject"] = "math"
    math["G1"] = 12
    math["G2"] = 9

    portuguese = valid_record()
    portuguese["subject"] = "portuguese"
    portuguese["G1"] = 15
    portuguese["G2"] = 16

    frame = clean_student_data(pd.DataFrame([math, portuguese]))
    ranked = rank_subjects(frame)

    assert [item["subject"] for item in ranked] == ["math", "portuguese"]
    assert ranked[0]["risk_score"] >= ranked[1]["risk_score"]


def test_rank_subjects_handles_empty_frame() -> None:
    assert rank_subjects(pd.DataFrame()) == []


def test_rule_engine_returns_required_recommendations() -> None:
    math = valid_record()
    math["subject"] = "math"
    math["G1"] = 12
    math["G2"] = 9

    portuguese = valid_record()
    portuguese["subject"] = "portuguese"
    portuguese["G1"] = 15
    portuguese["G2"] = 16

    frame = clean_student_data(pd.DataFrame([math, portuguese]))
    recommendation = recommend_from_rules(frame, goal_probability=0.45)

    assert recommendation.weak_subject == "math"
    assert recommendation.strong_subject == "portuguese"
    assert recommendation.weak_subject != recommendation.strong_subject
    assert recommendation.recommended_daily_study_minutes >= 20
    assert recommendation.goal_probability_level == "medium"
    assert recommendation.reason


def test_rule_engine_returns_null_strong_subject_for_single_subject() -> None:
    math = valid_record()
    math["subject"] = "math"
    math["G1"] = 10
    math["G2"] = 8

    frame = clean_student_data(pd.DataFrame([math]))
    recommendation = recommend_from_rules(frame, goal_probability=0.15)

    assert recommendation.weak_subject == "math"
    assert recommendation.strong_subject is None
    assert recommendation.recommended_subject == "math"
    assert recommendation.goal_probability_level == "very_low"


def test_probability_level_boundaries() -> None:
    assert probability_level(0.81) == ("very_high", "very high")
    assert probability_level(0.60) == ("high", "high")
    assert probability_level(0.40) == ("medium", "medium")
    assert probability_level(0.20) == ("low", "low")
    assert probability_level(0.19) == ("very_low", "very low")
