"""Rule-based EBS(한국교육방송공사) 강의 추천 문구 생성.

이 모듈은 실제 EBS 콘텐츠 API나 강의 URL과는 연동하지 않는다 (그런 데이터가
없기 때문). 대신 과목/성적 추세/목표 달성 확률을 바탕으로, 사용자가 EBS에서
어떤 종류의 강의를 찾아보면 좋을지 규칙 기반으로 안내하는 짧은 추천 문구만
만든다. 실제 강의명/링크가 필요해지면 이 모듈의 ``recommend_ebs_lectures``
반환값에 ``lecture_url`` 같은 필드를 추가하는 식으로 확장하면 된다.
"""

from __future__ import annotations

from typing import Any

from ai.config import SUBJECT_KOREAN_LABELS

# 과목별 EBS 강의 카테고리 (실제 강의명이 아니라 "이런 종류를 찾아보라"는 카테고리 안내).
SUBJECT_LECTURE_CATEGORIES = {
    "math": "수학 개념완성/기출문제풀이 강좌",
    "portuguese": "국어 문학·비문학 독해 강좌",
}
DEFAULT_LECTURE_CATEGORY = "기초 개념 강좌"


def _subject_label(subject: str) -> str:
    return SUBJECT_KOREAN_LABELS.get(subject, subject)


def _lecture_category(subject: str) -> str:
    return SUBJECT_LECTURE_CATEGORIES.get(subject, DEFAULT_LECTURE_CATEGORY)


def recommend_ebs_lectures(
    ranked_subjects: list[dict[str, Any]],
    goal_probability: float,
    top_n: int = 2,
) -> list[dict[str, Any]]:
    """Build rule-based EBS lecture-type recommendations for the weakest subjects.

    Args:
        ranked_subjects: Output of ``rule_engine.rank_subjects`` (highest
            risk first).
        goal_probability: Model-estimated probability of reaching the goal,
            used to pick between "개념" vs "심화" level guidance.
        top_n: Maximum number of subjects to generate a recommendation for.

    Returns:
        List of dicts with ``subject``, ``subject_label``, ``category``, and
        ``reason``. Empty list when there is no subject information.
    """

    if not ranked_subjects:
        return []

    level_hint = "기본 개념 강의" if goal_probability < 0.5 else "심화/응용 강의"

    recommendations: list[dict[str, Any]] = []
    for item in ranked_subjects[:top_n]:
        subject = item["subject"]
        trend_note = (
            "최근 성적이 떨어지고 있어" if item["trend"] < 0 else "취약 영역을 보완하기 위해"
        )
        recommendations.append(
            {
                "subject": subject,
                "subject_label": _subject_label(subject),
                "category": _lecture_category(subject),
                "reason": f"{trend_note} EBS {_lecture_category(subject)} 중 {level_hint}를 먼저 들어보는 것을 추천합니다.",
            }
        )

    return recommendations
