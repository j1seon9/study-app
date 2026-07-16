"""OCR로 추출한 모의고사(학평) 성적표 데이터를 기존 추천 엔진에 연결하는 브리지 모듈.

배경
----
기존 ``rule_engine.py``는 UCI 학생 데이터셋 전용 필드(``failures``, ``absences``,
``studytime``, ``schoolsup``/``famsup``/``paid`` 등)로 ``risk_score``를 계산한다.
OCR이 성적표에서 뽑아내는 데이터(과목별 등급/백분위/오답 문항 번호)에는 그런
필드가 존재하지 않으므로, ``rule_engine``을 그대로 재사용할 수 없다.

대신 이 모듈은:
  1) OCR 데이터 전용으로 ``risk_score``를 계산하는 :func:`rank_subjects_from_ocr` 를
     새로 정의하되, 반환 스키마는 ``rule_engine.rank_subjects()`` 와 동일하게
     맞춘다 (``subject``, ``risk_score``, ``score_signal``, ``trend``).
  2) 그 출력을 **수정 없이** 기존 ``curriculum_engine.build_curriculum()`` /
     ``ebs_engine.recommend_ebs_lectures()`` 에 그대로 전달한다. 두 함수는 이미
     이 범용 스키마만 필요로 하도록 설계돼 있어서 그대로 재사용이 가능하다.

이렇게 하면 "위험도 계산 로직"만 시험 데이터에 맞게 새로 만들고, "그 위험도를
가지고 하루 학습시간/과목순서/EBS 강의를 배정하는 로직"은 그대로 재사용한다.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ai.curriculum_engine import build_curriculum
from ai.ebs_engine import recommend_ebs_lectures
from ai.rule_engine import probability_level

# 학평 등급은 1(최상)~9(최하). risk_score 계산 시 등급 1칸 차이의 가중치.
GRADE_RISK_WEIGHT = 3.0
# 오답 비율(0~1)의 risk_score 가중치.
WRONG_RATIO_RISK_WEIGHT = 10.0
# 추세(직전 시험 대비 등급 개선폭)의 risk_score 가중치. rule_engine의 trend 가중치(0.5)와
# 스케일을 맞추되, 등급은 1~9로 범위가 좁아 체감 효과가 크므로 조금 더 크게 잡았다.
TREND_RISK_WEIGHT = 1.5


@dataclass
class OcrSubjectScore:
    """OCR로 성적표 한 과목분을 읽어낸 결과 (aimodel과 무관한, OCR 쪽 산출물 스키마).

    Attributes:
        subject: 과목명. 국어/수학/영어/한국사/사회/과학 등 자유 문자열 (한글 그대로 사용).
        grade: 등급 (1~9, 1이 최상위).
        percentile: 전국 백분위 (0~100). 절대평가 과목(영어/한국사/탐구)은 성적표에
            백분위가 안 나오는 경우가 많아 None 허용.
        wrong_items: 오답으로 채점된 문항 번호 리스트.
        total_items: 해당 과목 전체 문항 수. 0이면 오답비율 계산에서 제외.
        prev_grade: 직전 시험(있다면)의 등급. 추세 계산용, 없으면 None.
    """

    subject: str
    grade: int
    percentile: float | None = None
    wrong_items: list[int] = field(default_factory=list)
    total_items: int = 0
    prev_grade: int | None = None

    def __post_init__(self) -> None:
        if not (1 <= self.grade <= 9):
            raise ValueError(f"grade는 1~9 범위여야 합니다: {self.grade}")
        if self.prev_grade is not None and not (1 <= self.prev_grade <= 9):
            raise ValueError(f"prev_grade는 1~9 범위여야 합니다: {self.prev_grade}")


def _wrong_ratio(score: OcrSubjectScore) -> float:
    if score.total_items <= 0:
        return 0.0
    return len(score.wrong_items) / score.total_items


def _trend(score: OcrSubjectScore) -> float:
    """양수 = 개선(등급 숫자가 작아짐), 음수 = 악화. rule_engine과 부호 규칙을 맞췄다."""
    if score.prev_grade is None:
        return 0.0
    return float(score.prev_grade - score.grade)


def _score_signal(score: OcrSubjectScore) -> float:
    """curriculum_engine/ebs_engine은 사용하지 않지만, 참고용으로 0~100 스케일 점수를 남긴다."""
    if score.percentile is not None:
        return round(float(score.percentile), 2)
    # 백분위가 없는 절대평가 과목은 등급을 거칠게 0~100으로 환산 (1등급≈90, 9등급≈10).
    return round(max(0.0, (10 - score.grade) * 10), 2)


def rank_subjects_from_ocr(scores: list[OcrSubjectScore]) -> list[dict[str, Any]]:
    """OCR 성적표 데이터를 위험도(risk_score) 순으로 정렬해 반환한다.

    반환 스키마는 ``rule_engine.rank_subjects()`` 와 동일하다 — 그래서
    ``curriculum_engine.build_curriculum()`` 에 수정 없이 바로 넘길 수 있다.

    Args:
        scores: 과목별 OCR 채점 결과 리스트.

    Returns:
        위험도 높은 순으로 정렬된 리스트. 각 항목은 ``subject``, ``risk_score``,
        ``score_signal``, ``trend`` 키를 가진다. ``scores`` 가 비어있으면 빈 리스트.
    """

    if not scores:
        return []

    ranked = []
    for s in scores:
        risk = (
            (s.grade - 1) * GRADE_RISK_WEIGHT
            + _wrong_ratio(s) * WRONG_RATIO_RISK_WEIGHT
            - _trend(s) * TREND_RISK_WEIGHT
        )
        ranked.append(
            {
                "subject": s.subject,
                "risk_score": round(risk, 4),
                "score_signal": _score_signal(s),
                "trend": _trend(s),
            }
        )

    ranked.sort(key=lambda item: item["risk_score"], reverse=True)
    return ranked


def estimate_goal_probability_from_ocr(scores: list[OcrSubjectScore]) -> float:
    """대략적인 목표 달성 확률 추정치 (0~1).

    실제 sklearn 예측 모델(``predict.py``)은 UCI 스키마 입력을 요구하므로 OCR 데이터로는
    바로 호출할 수 없다. 대신 평균 백분위/등급을 0~1로 환산한 간단한 대체 지표를 쓴다.
    나중에 실제 성적 데이터가 쌓이면 이 함수를 학평 데이터 기반 모델로 교체하는 것을 권장한다.
    """

    if not scores:
        return 0.5

    signals = [_score_signal(s) / 100.0 for s in scores]
    return round(sum(signals) / len(signals), 4)


def calculate_recommended_minutes_from_ocr(
    ranked_subjects: list[dict[str, Any]], goal_probability: float
) -> int:
    """OCR 데이터 기반 하루 권장 학습시간(분).

    rule_engine.calculate_recommended_daily_minutes()는 studytime 카테고리(1~4) 등
    UCI 전용 입력이 필요해 재사용할 수 없어서, 등급/오답비율 기반으로 새로 정의했다.
    """

    if not ranked_subjects:
        return 30

    base = 90  # 기본 하루 학습시간 (분)
    worst_risk = ranked_subjects[0]["risk_score"]

    # risk_score가 높을수록(=성적이 안 좋을수록), goal_probability가 낮을수록 시간을 늘린다.
    increase = worst_risk * 2.5
    if goal_probability < 0.4:
        increase += 30
    elif goal_probability < 0.6:
        increase += 15

    return int(max(30, min(180, round(base + increase))))


def _build_ocr_reason(
    ranked_subjects: list[dict[str, Any]], goal_probability: float, level_label: str
) -> str:
    """OCR 데이터 기반으로 사람이 읽을 수 있는 추천 사유 문장을 만든다."""

    weakest = ranked_subjects[0]
    subject = weakest["subject"]
    trend = weakest["trend"]

    parts = [f"목표 달성 확률 추정치는 {goal_probability:.1%}로 '{level_label}' 구간입니다."]
    parts.append(f"'{subject}' 과목의 위험도가 가장 높아 우선 보완이 필요합니다.")

    if trend > 0:
        parts.append(f"{subject}의 최근 등급은 개선되는 추세입니다.")
    elif trend < 0:
        parts.append(f"{subject}의 최근 등급이 하락하는 추세입니다.")

    if goal_probability >= 0.8 and trend >= 0:
        parts.append("현재 학습 패턴을 유지하는 것을 권장합니다.")
    elif goal_probability < 0.4 or trend < 0:
        parts.append("복습 시간을 늘리는 것을 권장합니다.")
    else:
        parts.append("적당한 수준의 복습 계획을 권장합니다.")

    return " ".join(parts)


def build_ocr_recommendation(scores: list[OcrSubjectScore]) -> dict[str, Any]:
    """OCR 성적표 데이터 -> 전체 추천 결과 (curriculum + EBS 강의 추천 포함).

    반환 스키마는 api.py의 ``PredictionResponse`` (기존 ``/api/predict`` 응답)와
    필드명까지 동일하게 맞췄다 — 그래서 API 쪽에서 새 Pydantic 모델을 또 만들
    필요 없이 같은 ``response_model=PredictionResponse``를 그대로 쓸 수 있다.
    """

    ranked = rank_subjects_from_ocr(scores)
    if not ranked:
        return {
            "recommended_study_time_minutes_per_day": 30,
            "recommended_subject": None,
            "weak_subject": None,
            "strong_subject": None,
            "goal_achievement_probability": 0.5,
            "goal_probability_level": "unknown",
            "recommended_review_subject": None,
            "reason": "입력된 과목 데이터가 없어 추천을 계산할 수 없습니다.",
            "curriculum": [],
            "ebs_recommendations": [],
        }

    goal_probability = estimate_goal_probability_from_ocr(scores)
    level_key, level_label = probability_level(goal_probability)
    daily_minutes = calculate_recommended_minutes_from_ocr(ranked, goal_probability)

    curriculum = build_curriculum(ranked, daily_minutes)
    ebs_recommendations = recommend_ebs_lectures(ranked, goal_probability)
    weak_subject = ranked[0]["subject"]
    reason = _build_ocr_reason(ranked, goal_probability, level_label)

    return {
        "recommended_study_time_minutes_per_day": daily_minutes,
        "recommended_subject": weak_subject,
        "weak_subject": weak_subject,
        "strong_subject": ranked[-1]["subject"] if len(ranked) > 1 else None,
        "goal_achievement_probability": goal_probability,
        "goal_probability_level": level_key,
        "recommended_review_subject": weak_subject,
        "reason": reason,
        "curriculum": curriculum,
        "ebs_recommendations": ebs_recommendations,
    }
