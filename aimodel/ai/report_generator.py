"""Assemble the rule engine, curriculum engine, and EBS engine outputs
into the single response dict returned by ``ai.predict.predict``.

Keeping this assembly in one place means ``predict.py`` stays focused on
model inference, and the service-facing response shape (and any future
fields) is defined and documented in exactly one location.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from ai.curriculum_engine import build_curriculum
from ai.ebs_engine import recommend_ebs_lectures
from ai.rule_engine import rank_subjects, recommend_from_rules


def generate_report(cleaned_records: pd.DataFrame, goal_probability: float) -> dict[str, Any]:
    """Build the full service-facing prediction response.

    Args:
        cleaned_records: Cleaned raw subject records (see
            ``feature_engineering.clean_student_data``) for one student.
        goal_probability: Model-estimated probability of reaching the goal.

    Returns:
        Dict matching ``config.PREDICTION_SCHEMA``.
    """

    rules = recommend_from_rules(cleaned_records, goal_probability)
    ranked_subjects = rank_subjects(cleaned_records)
    curriculum = build_curriculum(ranked_subjects, rules.recommended_daily_study_minutes)
    ebs_recommendations = recommend_ebs_lectures(ranked_subjects, goal_probability)

    return {
        "recommended_study_time_minutes_per_day": rules.recommended_daily_study_minutes,
        "recommended_subject": rules.recommended_subject,
        "weak_subject": rules.weak_subject,
        "strong_subject": rules.strong_subject,
        "goal_achievement_probability": round(goal_probability, 4),
        "goal_probability_level": rules.goal_probability_level,
        "recommended_review_subject": rules.review_subject,
        "reason": rules.reason,
        "curriculum": curriculum,
        "ebs_recommendations": ebs_recommendations,
    }
