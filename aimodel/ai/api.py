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
