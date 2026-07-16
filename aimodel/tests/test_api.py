"""Tests for FastAPI endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

import ai.api as api_module
from ai.api import app
from tests.test_feature_engineering import valid_record


def test_health_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_predict_endpoint_returns_recommendation(monkeypatch) -> None:
    def fake_predict(records):
        return {
            "recommended_study_time_minutes_per_day": 45,
            "recommended_subject": "math",
            "weak_subject": "math",
            "strong_subject": None,
            "goal_achievement_probability": 0.55,
            "goal_probability_level": "medium",
            "recommended_review_subject": "math",
            "reason": "A moderate review plan is recommended.",
            "curriculum": [
                {
                    "order": 1,
                    "subject": "math",
                    "subject_label": "수학",
                    "allocated_minutes": 45,
                    "focus": "가장 취약한 과목이므로 새로운 내용 학습보다 개념 복습을 우선한다.",
                }
            ],
            "ebs_recommendations": [
                {
                    "subject": "math",
                    "subject_label": "수학",
                    "category": "수학 개념완성/기출문제풀이 강좌",
                    "reason": "취약 영역을 보완하기 위해 EBS 수학 개념완성/기출문제풀이 강좌 중 기본 개념 강의를 먼저 들어보는 것을 추천합니다.",
                }
            ],
        }

    monkeypatch.setattr(api_module, "predict", fake_predict)
    payload = valid_record()
    payload.pop("G3")
    client = TestClient(app)

    response = client.post("/api/predict", json={"records": [payload]})

    assert response.status_code == 200
    body = response.json()
    assert "goal_achievement_probability" in body
    assert "recommended_study_time_minutes_per_day" in body
    assert body["strong_subject"] is None or body["strong_subject"] != body["weak_subject"]


def test_predict_endpoint_rejects_missing_records() -> None:
    client = TestClient(app)
    response = client.post("/api/predict", json={"records": []})
    assert response.status_code == 422


def test_ocr_recommend_endpoint_returns_recommendation(monkeypatch) -> None:
    def fake_build_ocr_recommendation(scores):
        return {
            "recommended_study_time_minutes_per_day": 120,
            "recommended_subject": "수학",
            "weak_subject": "수학",
            "strong_subject": "한국사",
            "goal_achievement_probability": 0.72,
            "goal_probability_level": "high",
            "recommended_review_subject": "수학",
            "reason": "수학 과목의 위험도가 가장 높아 우선 보완이 필요합니다.",
            "curriculum": [
                {
                    "order": 1,
                    "subject": "수학",
                    "subject_label": "수학",
                    "allocated_minutes": 60,
                    "focus": "가장 취약한 과목이므로 새로운 내용 학습보다 개념 복습을 우선한다.",
                }
            ],
            "ebs_recommendations": [
                {
                    "subject": "수학",
                    "subject_label": "수학",
                    "category": "수학 개념완성/기출문제풀이 강좌",
                    "reason": "취약 영역을 보완하기 위해 EBS 수학 개념완성/기출문제풀이 강좌 중 기본 개념 강의를 먼저 들어보는 것을 추천합니다.",
                }
            ],
        }

    monkeypatch.setattr(api_module, "build_ocr_recommendation", fake_build_ocr_recommendation)
    client = TestClient(app)

    response = client.post(
        "/api/ocr-recommend",
        json={
            "records": [
                {
                    "subject": "수학",
                    "grade": 5,
                    "percentile": 60.93,
                    "wrong_items": [9, 16, 21],
                    "total_items": 30,
                    "prev_grade": 3,
                }
            ]
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["weak_subject"] == "수학"
    assert body["recommended_study_time_minutes_per_day"] == 120
    assert len(body["curriculum"]) == 1
    assert len(body["ebs_recommendations"]) == 1
