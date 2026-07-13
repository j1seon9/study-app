"""Tests for curriculum_engine.py and ebs_engine.py."""

from __future__ import annotations

from ai.curriculum_engine import build_curriculum
from ai.ebs_engine import recommend_ebs_lectures


def test_build_curriculum_single_subject_gets_all_minutes() -> None:
    ranked = [{"subject": "math", "risk_score": 5.0, "score_signal": 8.0, "trend": -1.0}]
    curriculum = build_curriculum(ranked, recommended_daily_minutes=60)

    assert len(curriculum) == 1
    assert curriculum[0]["order"] == 1
    assert curriculum[0]["subject"] == "math"
    assert curriculum[0]["subject_label"] == "수학"
    assert curriculum[0]["allocated_minutes"] == 60


def test_build_curriculum_distributes_by_risk_and_sums_to_total() -> None:
    ranked = [
        {"subject": "math", "risk_score": 8.0, "score_signal": 6.0, "trend": -2.0},
        {"subject": "portuguese", "risk_score": 1.0, "score_signal": 18.0, "trend": 1.0},
    ]
    curriculum = build_curriculum(ranked, recommended_daily_minutes=70)

    assert [item["subject"] for item in curriculum] == ["math", "portuguese"]
    assert curriculum[0]["allocated_minutes"] > curriculum[1]["allocated_minutes"]
    assert sum(item["allocated_minutes"] for item in curriculum) == 70


def test_build_curriculum_handles_empty_input() -> None:
    assert build_curriculum([], recommended_daily_minutes=60) == []
    assert build_curriculum([{"subject": "math", "risk_score": 1.0, "score_signal": 10.0, "trend": 0.0}], 0) == []


def test_recommend_ebs_lectures_returns_top_n_with_korean_labels() -> None:
    ranked = [
        {"subject": "math", "risk_score": 8.0, "score_signal": 6.0, "trend": -2.0},
        {"subject": "portuguese", "risk_score": 1.0, "score_signal": 18.0, "trend": 1.0},
    ]
    recommendations = recommend_ebs_lectures(ranked, goal_probability=0.3, top_n=1)

    assert len(recommendations) == 1
    assert recommendations[0]["subject"] == "math"
    assert recommendations[0]["subject_label"] == "수학"
    assert "EBS" in recommendations[0]["reason"]


def test_recommend_ebs_lectures_handles_empty_input() -> None:
    assert recommend_ebs_lectures([], goal_probability=0.5) == []
