from ai.ocr_score_engine import (
    OcrSubjectScore,
    build_ocr_recommendation,
    calculate_recommended_minutes_from_ocr,
    rank_subjects_from_ocr,
)


def _sample_scores():
    return [
        OcrSubjectScore(subject="국어", grade=1, percentile=91.25, wrong_items=[8, 22], total_items=45, prev_grade=1),
        OcrSubjectScore(subject="수학", grade=5, percentile=60.93, wrong_items=[9, 16, 21, 29, 30], total_items=30, prev_grade=3),
        OcrSubjectScore(subject="영어", grade=4, wrong_items=[3, 12, 20, 21, 22], total_items=25, prev_grade=5),
        OcrSubjectScore(subject="한국사", grade=1, wrong_items=[], total_items=20, prev_grade=1),
    ]


def test_rank_subjects_orders_worst_first():
    ranked = rank_subjects_from_ocr(_sample_scores())
    subjects_in_order = [r["subject"] for r in ranked]
    # 수학이 3등급 + 오답비율(5/30)로 가장 위험도가 높아야 함
    assert subjects_in_order[0] == "수학"
    # 한국사는 1등급, 오답 없음, 추세 없음 -> risk_score가 가장 낮아야 함
    assert subjects_in_order[-1] == "한국사"


def test_rank_subjects_empty_input():
    assert rank_subjects_from_ocr([]) == []


def test_recommended_minutes_within_bounds():
    ranked = rank_subjects_from_ocr(_sample_scores())
    minutes = calculate_recommended_minutes_from_ocr(ranked, goal_probability=0.5)
    assert 30 <= minutes <= 180


def test_build_ocr_recommendation_full_pipeline():
    result = build_ocr_recommendation(_sample_scores())

    assert result["weak_subject"] == "수학"
    assert result["recommended_subject"] == "수학"
    assert result["recommended_review_subject"] == "수학"
    assert result["strong_subject"] is not None
    assert 30 <= result["recommended_study_time_minutes_per_day"] <= 180
    assert result["goal_probability_level"] in {"very_low", "low", "medium", "high", "very_high"}
    assert "수학" in result["reason"]

    # curriculum_engine.build_curriculum() 그대로 재사용됐는지 확인
    curriculum = result["curriculum"]
    assert len(curriculum) == 4
    assert curriculum[0]["order"] == 1
    assert curriculum[0]["subject"] == "수학"
    total_minutes = sum(c["allocated_minutes"] for c in curriculum)
    assert total_minutes == result["recommended_study_time_minutes_per_day"]

    # ebs_engine.recommend_ebs_lectures() 그대로 재사용됐는지 + 한글 과목 카테고리 매핑 확인
    ebs = result["ebs_recommendations"]
    assert len(ebs) >= 1
    assert ebs[0]["subject"] == "수학"
    assert "수학" in ebs[0]["category"]


def test_build_ocr_recommendation_empty():
    result = build_ocr_recommendation([])
    assert result["weak_subject"] is None
    assert result["curriculum"] == []
    assert result["ebs_recommendations"] == []


def test_grade_validation():
    import pytest

    with pytest.raises(ValueError):
        OcrSubjectScore(subject="국어", grade=10)
