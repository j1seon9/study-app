"""Rule-based recommendation layer for explainable study guidance."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

from ai.config import PROBABILITY_BANDS


SUBJECT_LABELS = {
    "math": "math",
    "portuguese": "portuguese",
}

STUDYTIME_WEEKLY_MINUTES = {
    1: 90,
    2: 210,
    3: 450,
    4: 700,
}


@dataclass(frozen=True)
class RuleRecommendation:
    """Rule-engine output combined with model probability."""

    recommended_daily_study_minutes: int
    recommended_subject: str | None
    weak_subject: str | None
    strong_subject: str | None
    review_subject: str | None
    goal_probability_level: str
    reason: str


def _safe_subject(value: Any) -> str:
    subject = str(value).strip().lower()
    return SUBJECT_LABELS.get(subject, subject or "unknown")


def _score_subjects(records: pd.DataFrame) -> pd.DataFrame:
    scored = records.copy()
    scored["subject"] = scored["subject"].map(_safe_subject)
    scored["score_signal"] = scored[["G1", "G2"]].mean(axis=1)
    scored["trend"] = scored["G2"] - scored["G1"]
    scored["absence_risk_flag"] = (scored["absences"] >= scored["absences"].quantile(0.75)).astype(int)
    scored["support_count"] = scored[["schoolsup", "famsup", "paid"]].eq("yes").sum(axis=1)
    scored["risk_score"] = (
        (20 - scored["score_signal"]) * 1.0
        + scored["failures"].clip(0, 3) * 2
        + scored["absence_risk_flag"] * 1.5
        - scored["trend"].clip(-5, 5) * 0.5
        - scored["support_count"] * 0.3
    )
    return scored


def probability_level(goal_probability: float) -> tuple[str, str]:
    """Return the configured probability band key and label.

    Args:
        goal_probability: Probability between 0 and 1.

    Returns:
        Tuple of machine-readable key and readable label.
    """

    bounded_probability = max(0.0, min(1.0, float(goal_probability)))
    for threshold, key, label in PROBABILITY_BANDS:
        if bounded_probability >= threshold:
            return key, label
    return "very_low", "very low"


def calculate_recommended_daily_minutes(weak_row: pd.Series | None, goal_probability: float) -> int:
    """Calculate recommended study minutes with deterministic rules.

    This is a Rule Engine calculation, not a regression model. The CSV contains
    only a weekly study-time category, so the category is mapped to an estimated
    daily baseline and adjusted by observed risk signals.

    Args:
        weak_row: Selected weak subject row, if available.
        goal_probability: Model-estimated goal achievement probability.

    Returns:
        Recommended daily study minutes.
    """

    if weak_row is None:
        return 30

    studytime_level = int(round(float(weak_row["studytime"])))
    weekly_minutes = STUDYTIME_WEEKLY_MINUTES.get(studytime_level, 210)
    base_daily_minutes = round(weekly_minutes / 7)

    increase = 0
    if goal_probability < 0.2:
        increase += 35
    elif goal_probability < 0.4:
        increase += 25
    elif goal_probability < 0.6:
        increase += 15
    elif goal_probability < 0.8:
        increase += 5

    if float(weak_row["trend"]) < 0:
        increase += 10
    if int(weak_row["absence_risk_flag"]) == 1:
        increase += 10
    if float(weak_row["failures"]) > 0:
        increase += 10
    if int(weak_row["support_count"]) == 0:
        increase += 5

    return int(max(20, min(140, base_daily_minutes + increase)))


def _select_subjects(scored: pd.DataFrame) -> tuple[pd.Series | None, pd.Series | None]:
    """Select weak and strong subjects with conflict handling.

    Rule priority:
        1. Weak subject is the highest risk score.
        2. Strong subject must be a different subject.
        3. If no different subject exists, strong subject is unknown.
    """

    if scored.empty:
        return None, None

    collapsed = (
        scored.groupby("subject", as_index=False)
        .agg(
            score_signal=("score_signal", "mean"),
            trend=("trend", "mean"),
            risk_score=("risk_score", "mean"),
            studytime=("studytime", "mean"),
            failures=("failures", "mean"),
            absences=("absences", "mean"),
            absence_risk_flag=("absence_risk_flag", "max"),
            support_count=("support_count", "mean"),
        )
    )
    weak_row = collapsed.sort_values(["risk_score", "score_signal"], ascending=[False, True]).iloc[0]

    strong_candidates = collapsed[collapsed["subject"] != weak_row["subject"]]
    if strong_candidates.empty:
        return weak_row, None

    strong_row = strong_candidates.sort_values(
        ["score_signal", "trend", "risk_score"],
        ascending=[False, False, True],
    ).iloc[0]
    return weak_row, strong_row


def _build_reason(weak_row: pd.Series | None, goal_probability: float, level_label: str) -> str:
    """Create a readable recommendation reason from real input fields."""

    probability_sentence = (
        f"Goal achievement probability is {goal_probability:.1%}, which is in the {level_label} range."
    )
    if weak_row is None:
        return probability_sentence + " There is not enough subject information to identify a weak subject."

    subject = _safe_subject(weak_row["subject"])
    trend = float(weak_row["trend"])
    score_average = float(weak_row["score_signal"])
    reason_parts = [probability_sentence]

    if trend > 0:
        reason_parts.append(f"{subject} recent grades are increasing.")
    elif trend < 0:
        reason_parts.append(f"{subject} recent grades are decreasing.")
    else:
        reason_parts.append(f"{subject} recent grades are unchanged.")

    reason_parts.append(f"The recent average grade for {subject} is {score_average:.1f}.")

    if int(weak_row["absence_risk_flag"]) == 1:
        reason_parts.append("Absence risk is relatively high.")
    if int(round(float(weak_row["support_count"]))) == 0:
        reason_parts.append("No CSV-based learning support signal is present.")

    if goal_probability >= 0.8 and trend >= 0:
        reason_parts.append("Maintaining the current learning pattern is recommended.")
    elif goal_probability < 0.4 or trend < 0:
        reason_parts.append("Increasing review time is recommended.")
    else:
        reason_parts.append("A moderate review plan is recommended.")

    return " ".join(reason_parts)


def rank_subjects(records: pd.DataFrame) -> list[dict[str, Any]]:
    """Rank every subject present in ``records`` from highest to lowest risk.

    This reuses the same scoring used to pick the single weak/strong subject,
    but returns every subject so ``curriculum_engine`` can distribute study
    time across all of them instead of just the top one.

    Args:
        records: Cleaned raw records for one student or one prediction request.

    Returns:
        List of dicts (highest risk first), one per distinct subject, each
        with ``subject``, ``risk_score``, ``score_signal`` (recent grade
        average), and ``trend`` (G2 - G1).
    """

    if records.empty:
        return []

    scored = _score_subjects(records)
    collapsed = (
        scored.groupby("subject", as_index=False)
        .agg(
            risk_score=("risk_score", "mean"),
            score_signal=("score_signal", "mean"),
            trend=("trend", "mean"),
        )
        .sort_values("risk_score", ascending=False)
    )
    return [
        {
            "subject": row.subject,
            "risk_score": round(float(row.risk_score), 4),
            "score_signal": round(float(row.score_signal), 2),
            "trend": round(float(row.trend), 2),
        }
        for row in collapsed.itertuples(index=False)
    ]


def recommend_from_rules(records: pd.DataFrame, goal_probability: float) -> RuleRecommendation:
    """Create deterministic recommendations and human-readable reasons.

    Args:
        records: Cleaned raw records for one student or one prediction request.
        goal_probability: Model-estimated probability of reaching the goal.

    Returns:
        RuleRecommendation object.
    """

    if records.empty:
        raise ValueError("records must not be empty.")

    scored = _score_subjects(records)
    weak_row, strong_row = _select_subjects(scored)
    level_key, level_label = probability_level(goal_probability)

    weak_subject = _safe_subject(weak_row["subject"]) if weak_row is not None else None
    strong_subject = _safe_subject(strong_row["subject"]) if strong_row is not None else None
    recommended_subject = weak_subject
    review_subject = weak_subject

    recommended_daily_minutes = calculate_recommended_daily_minutes(weak_row, goal_probability)
    reason = _build_reason(weak_row, goal_probability, level_label)

    return RuleRecommendation(
        recommended_daily_study_minutes=recommended_daily_minutes,
        recommended_subject=recommended_subject,
        weak_subject=weak_subject,
        strong_subject=strong_subject,
        review_subject=review_subject,
        goal_probability_level=level_key,
        reason=reason,
    )
