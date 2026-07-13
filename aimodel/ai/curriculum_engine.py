"""Rule-based per-subject study order and time allocation.

This module turns ``rule_engine.rank_subjects`` output plus the recommended
total daily study minutes into a concrete, explainable curriculum: which
subject to study first, and how many minutes to spend on each subject today.
It is deliberately rule-based (no separate ML model) — the CSV has no signal
that would justify learning a scheduling model, and a transparent rule keeps
the recommendation auditable.
"""

from __future__ import annotations

from typing import Any

from ai.config import SUBJECT_KOREAN_LABELS

# 위험도가 가장 높은 과목이라도 하루 배분 시간이 너무 한쪽으로 쏠리지 않도록 하는 하한 비율.
MIN_SHARE_PER_SUBJECT = 0.15
# 최소 배분 시간 (분). 너무 짧은 배분은 실질적인 학습 효과가 없다고 보고 하한을 둔다.
MIN_MINUTES_PER_SUBJECT = 10


def _subject_label(subject: str) -> str:
    return SUBJECT_KOREAN_LABELS.get(subject, subject)


def build_curriculum(
    ranked_subjects: list[dict[str, Any]],
    recommended_daily_minutes: int,
) -> list[dict[str, Any]]:
    """Distribute the recommended daily minutes across subjects, ranked by risk.

    Weighting rule: each subject's share of the total time is proportional to
    ``max(risk_score, 0) + 1`` (the +1 keeps low-risk/strong subjects from
    getting zero minutes — some maintenance review is still useful). The
    highest-risk subject is always studied first (``order`` starts at 1).

    Args:
        ranked_subjects: Output of ``rule_engine.rank_subjects`` (highest
            risk first).
        recommended_daily_minutes: Total minutes recommended by the rule
            engine for the day.

    Returns:
        List of dicts, one per subject, each with ``order`` (1-based),
        ``subject``, ``subject_label`` (Korean display name),
        ``allocated_minutes``, and ``focus`` (short guidance string).
        Empty list when there is no subject to schedule.
    """

    if not ranked_subjects or recommended_daily_minutes <= 0:
        return []

    weights = [max(item["risk_score"], 0.0) + 1.0 for item in ranked_subjects]
    total_weight = sum(weights)

    curriculum: list[dict[str, Any]] = []
    for order, (item, weight) in enumerate(zip(ranked_subjects, weights), start=1):
        share = weight / total_weight
        share = max(share, MIN_SHARE_PER_SUBJECT / len(ranked_subjects))
        minutes = max(MIN_MINUTES_PER_SUBJECT, round(recommended_daily_minutes * share))

        if order == 1:
            focus = "가장 취약한 과목이므로 새로운 내용 학습보다 개념 복습을 우선한다."
        elif item["trend"] < 0:
            focus = "최근 성적이 하락하는 추세라 오답 위주로 짧게 점검한다."
        else:
            focus = "현재 흐름을 유지하는 수준으로 가볍게 복습한다."

        curriculum.append(
            {
                "order": order,
                "subject": item["subject"],
                "subject_label": _subject_label(item["subject"]),
                "allocated_minutes": int(minutes),
                "focus": focus,
            }
        )

    # 비례 배분 후 반올림 오차로 합계가 recommended_daily_minutes를 넘거나 모자랄 수 있어,
    # 가장 배분이 큰 과목(보통 1순위 취약 과목)에서 차이를 흡수해 합계를 맞춘다.
    allocated_total = sum(item["allocated_minutes"] for item in curriculum)
    difference = recommended_daily_minutes - allocated_total
    if difference != 0:
        largest = max(curriculum, key=lambda item: item["allocated_minutes"])
        largest["allocated_minutes"] = max(
            MIN_MINUTES_PER_SUBJECT, largest["allocated_minutes"] + difference
        )

    return curriculum
