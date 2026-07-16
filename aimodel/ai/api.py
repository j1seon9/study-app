"""FastAPI application for the self-study recommendation model."""

from __future__ import annotations

import json
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from ai.config import (
    API_KEY,
    API_KEY_HEADER,
    CORS_ORIGINS,
    METADATA_PATH,
    MODEL_PATH,
    MODEL_VERSION,
)
from ai.feature_engineering import DataValidationError
from ai.ocr_score_engine import OcrSubjectScore, build_ocr_recommendation
from ai.predict import predict
from ai.prediction_validation import PredictionValidationError
from ai.train import train_model


app = FastAPI(
    title="AI Self-Study Recommendation API",
    description="API for model health, prediction, metadata, and retraining.",
    version=MODEL_VERSION,
)

# Express 백엔드(및 필요 시 브라우저)에서의 호출을 허용한다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def require_api_key(
    x_api_key: str | None = Header(default=None, alias=API_KEY_HEADER)
) -> None:
    """AI_API_KEY 환경변수가 설정된 경우에만 헤더 검증을 강제한다.

    비어 있으면(로컬 개발 기본값) 검증을 건너뛴다 — README의 기존 로컬 실행
    흐름(uvicorn ai.api:app ...)을 그대로 지원하기 위함이다.
    """

    if not API_KEY:
        return
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 API Key입니다.",
        )


class StudentSubjectRecord(BaseModel):
    """Single subject-level student record accepted by the prediction API."""

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(..., min_length=1)
    school: str = Field(..., min_length=1)
    sex: str = Field(..., min_length=1)
    age: int = Field(..., ge=0)
    address: str = Field(..., min_length=1)
    famsize: str = Field(..., min_length=1)
    Pstatus: str = Field(..., min_length=1)
    Medu: int = Field(..., ge=0)
    Fedu: int = Field(..., ge=0)
    Mjob: str = Field(..., min_length=1)
    Fjob: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    guardian: str = Field(..., min_length=1)
    traveltime: int = Field(..., ge=0)
    studytime: int = Field(..., ge=0)
    failures: int = Field(..., ge=0)
    schoolsup: Literal["yes", "no"]
    famsup: Literal["yes", "no"]
    paid: Literal["yes", "no"]
    activities: Literal["yes", "no"]
    nursery: Literal["yes", "no"]
    higher: Literal["yes", "no"]
    internet: Literal["yes", "no"]
    romantic: Literal["yes", "no"]
    famrel: int = Field(..., ge=0)
    freetime: int = Field(..., ge=0)
    goout: int = Field(..., ge=0)
    Dalc: int = Field(..., ge=0)
    Walc: int = Field(..., ge=0)
    health: int = Field(..., ge=0)
    absences: int = Field(..., ge=0)
    G1: int = Field(..., ge=0)
    G2: int = Field(..., ge=0)
    G3: int | None = Field(default=None, ge=0)


class PredictRequest(BaseModel):
    """Prediction request containing one or more subject records."""

    model_config = ConfigDict(extra="forbid")

    records: list[StudentSubjectRecord] = Field(..., min_length=1)


class OcrSubjectRecord(BaseModel):
    """One subject's OCR-extracted 학평 성적표 데이터.

    StudentSubjectRecord(UCI 데이터셋 스키마)와는 완전히 다른, 학평 성적표에
    실제로 존재하는 필드만 받는다 (failures/absences/studytime 등은 없음).
    """

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(..., min_length=1, description="과목명 (국어/수학/영어/한국사/사회/과학 등)")
    grade: int = Field(..., ge=1, le=9, description="등급 (1=최상위, 9=최하위)")
    percentile: float | None = Field(default=None, ge=0, le=100, description="전국 백분위 (절대평가 과목은 없을 수 있음)")
    wrong_items: list[int] = Field(default_factory=list, description="오답 문항 번호")
    total_items: int = Field(default=0, ge=0, description="전체 문항 수")
    prev_grade: int | None = Field(default=None, ge=1, le=9, description="직전 시험 등급 (추세 계산용)")


class OcrPredictRequest(BaseModel):
    """OCR로 읽은 성적표 기반 추천 요청."""

    model_config = ConfigDict(extra="forbid")

    records: list[OcrSubjectRecord] = Field(..., min_length=1)


class CurriculumItem(BaseModel):
    """One subject's slot in the daily study curriculum."""

    order: int
    subject: str
    subject_label: str
    allocated_minutes: int
    focus: str


class EbsRecommendation(BaseModel):
    """Rule-based EBS lecture-category recommendation for one subject."""

    subject: str
    subject_label: str
    category: str
    reason: str


class PredictionResponse(BaseModel):
    """Stable prediction API response schema."""

    recommended_study_time_minutes_per_day: int
    recommended_subject: str | None
    weak_subject: str | None
    strong_subject: str | None
    goal_achievement_probability: float
    goal_probability_level: str
    recommended_review_subject: str | None
    reason: str
    curriculum: list[CurriculumItem]
    ebs_recommendations: list[EbsRecommendation]


class HealthResponse(BaseModel):
    """Health endpoint response."""

    status: str
    model_version: str
    model_exists: bool
    metadata_exists: bool


def _record_to_dict(record: StudentSubjectRecord) -> dict[str, Any]:
    """Convert a Pydantic record to the dict expected by the model layer."""

    data = record.model_dump(exclude_none=True)
    if "G3" not in data:
        data["G3"] = 0
    return data


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Return API and model artifact health."""

    return HealthResponse(
        status="ok",
        model_version=MODEL_VERSION,
        model_exists=MODEL_PATH.exists(),
        metadata_exists=METADATA_PATH.exists(),
    )


@app.get("/api/metadata", dependencies=[Depends(require_api_key)])
def get_metadata() -> dict[str, Any]:
    """Return saved training metadata."""

    if not METADATA_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="metadata.json not found. Run training first.",
        )
    return json.loads(METADATA_PATH.read_text(encoding="utf-8"))


@app.post(
    "/api/predict",
    response_model=PredictionResponse,
    dependencies=[Depends(require_api_key)],
)
def predict_recommendation(request: PredictRequest) -> dict[str, Any]:
    """Return model probability and rule-based study recommendations."""

    try:
        records = [_record_to_dict(record) for record in request.records]
        return predict(records)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except (DataValidationError, PredictionValidationError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@app.post(
    "/api/ocr-recommend",
    response_model=PredictionResponse,
    dependencies=[Depends(require_api_key)],
)
def ocr_recommend(request: OcrPredictRequest) -> dict[str, Any]:
    """OCR로 읽은 학평 성적표 데이터로 규칙 기반 학습 추천을 반환한다.

    기존 ``/api/predict``(UCI 데이터셋 기반 sklearn 모델)와는 별도 경로다.
    이쪽은 학습된 모델을 쓰지 않고, ``ocr_score_engine``의 규칙 기반 risk_score
    계산 + 기존 ``curriculum_engine``/``ebs_engine``을 그대로 재사용한 결과를 반환한다.
    응답 스키마(``PredictionResponse``)는 ``/api/predict``와 동일하므로, 클라이언트는
    두 엔드포인트를 같은 방식으로 처리할 수 있다.
    """

    try:
        scores = [
            OcrSubjectScore(
                subject=r.subject,
                grade=r.grade,
                percentile=r.percentile,
                wrong_items=r.wrong_items,
                total_items=r.total_items,
                prev_grade=r.prev_grade,
            )
            for r in request.records
        ]
        return build_ocr_recommendation(scores)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@app.post("/api/retrain", dependencies=[Depends(require_api_key)])
def retrain() -> dict[str, Any]:
    """Synchronously retrain the model and return fresh metadata."""

    try:
        return train_model()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retraining failed: {exc}",
        ) from exc
