"""Project-wide configuration for the self-study recommendation model."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


RANDOM_SEED = 42
MODEL_VERSION = "1.3.0"
MIN_ROWS_FOR_MODEL = 100
PASSING_GRADE = 10
RETRAIN_TIMEZONE = "Asia/Seoul"
RETRAIN_HOUR = 11
RETRAIN_MINUTE = 0

# --- 10단계: Express 백엔드 연동을 위한 API 서버 설정 (모두 환경변수로 오버라이드 가능) ---
API_HOST = os.environ.get("AI_API_HOST", "127.0.0.1")
API_PORT = int(os.environ.get("AI_API_PORT", "8000"))
# 빈 문자열이면 API Key 검증을 비활성화한다 (로컬 개발 기본값).
# 운영 환경에서는 반드시 설정하고, Express 쪽 AI_API_KEY와 동일한 값을 사용해야 한다.
API_KEY = os.environ.get("AI_API_KEY", "")
API_KEY_HEADER = "X-API-Key"
# 콤마로 구분된 허용 origin 목록. 기본값은 로컬 Express 개발 서버.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("AI_CORS_ORIGINS", "http://localhost:5000").split(",")
    if origin.strip()
]

# PROJECT_ROOT 기준 상대 경로가 기본값이며, 배포 환경에서 데이터/모델 위치를 분리하고 싶을 때
# 아래 환경변수로 절대 경로를 오버라이드할 수 있다.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_DIR = Path(os.environ.get("AI_DATASET_DIR", str(PROJECT_ROOT / "dataset")))
MODELS_DIR = Path(os.environ.get("AI_MODELS_DIR", str(PROJECT_ROOT / "models")))
MODEL_PATH = MODELS_DIR / "model.pkl"
PREPROCESS_PATH = MODELS_DIR / "preprocess.pkl"
FEATURE_COLUMNS_PATH = MODELS_DIR / "feature_columns.json"
METADATA_PATH = MODELS_DIR / "metadata.json"
FEATURE_IMPORTANCE_PATH = MODELS_DIR / "feature_importance.csv"
FEATURE_IMPORTANCE_PLOT_PATH = MODELS_DIR / "feature_importance.png"
REPORT_PATH = MODELS_DIR / "validation_report.md"
RETRAIN_LOG_PATH = MODELS_DIR / "retrain_scheduler.log"

# 11단계: MongoDB에서 뽑아낸 확장 데이터셋(webapp_export.csv 등)이 놓이는 파일명.
# feature_engineering.discover_extended_dataset_files()가 DATASET_DIR에서 이 파일을
# 포함해 UCI 두 CSV 이외의 모든 csv를 자동으로 찾아 학습 데이터에 합친다.
WEBAPP_EXPORT_FILENAME = "webapp_export.csv"
WEBAPP_EXPORT_PATH = DATASET_DIR / WEBAPP_EXPORT_FILENAME

# MongoDB Dataset Builder 연동 설정 (Express 서버의 MONGO_URI와 동일한 값을 사용한다).
MONGO_URI = os.environ.get("MONGO_URI", "")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "study-app")

RAW_DATA_FILES = {
    "math": PROJECT_ROOT / "student-mat.csv",
    "portuguese": PROJECT_ROOT / "student-por.csv",
}

DATASET_DATA_FILES = {
    "math": DATASET_DIR / "student-mat.csv",
    "portuguese": DATASET_DIR / "student-por.csv",
}

TARGET_COLUMN = "goal_achieved"

PROBABILITY_BANDS = [
    (0.80, "very_high", "very high"),
    (0.60, "high", "high"),
    (0.40, "medium", "medium"),
    (0.20, "low", "low"),
    (0.00, "very_low", "very low"),
]

NUMERIC_FEATURES = [
    "age",
    "Medu",
    "Fedu",
    "traveltime",
    "studytime",
    "failures",
    "famrel",
    "freetime",
    "goout",
    "Dalc",
    "Walc",
    "health",
    "absences",
    "G1",
    "G2",
    "grade_trend",
    "grade_average",
    "absence_risk",
    "support_count",
]

CATEGORICAL_FEATURES = [
    "subject",
    "school",
    "sex",
    "address",
    "famsize",
    "Pstatus",
    "Mjob",
    "Fjob",
    "reason",
    "guardian",
    "schoolsup",
    "famsup",
    "paid",
    "activities",
    "nursery",
    "higher",
    "internet",
    "romantic",
]

FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES

FEATURE_DESCRIPTIONS = {
    "age": "Student age.",
    "Medu": "Mother education level.",
    "Fedu": "Father education level.",
    "traveltime": "Home-to-school travel time category.",
    "studytime": "Weekly study time category from the CSV.",
    "failures": "Number of previous class failures.",
    "famrel": "Family relationship quality.",
    "freetime": "Free time after school.",
    "goout": "Frequency of going out with friends.",
    "Dalc": "Workday alcohol consumption category.",
    "Walc": "Weekend alcohol consumption category.",
    "health": "Current health status category.",
    "absences": "Number of school absences.",
    "G1": "First period grade.",
    "G2": "Second period grade.",
    "grade_trend": "Recent grade change calculated as G2 - G1.",
    "grade_average": "Average of G1 and G2.",
    "absence_risk": "Binary flag for records at or above the training batch 75th percentile of absences.",
    "support_count": "Count of yes values among schoolsup, famsup, and paid.",
    "subject": "Subject derived from the source CSV file.",
    "school": "Student school.",
    "sex": "Student sex.",
    "address": "Home address type.",
    "famsize": "Family size category.",
    "Pstatus": "Parent cohabitation status.",
    "Mjob": "Mother job category.",
    "Fjob": "Father job category.",
    "reason": "Reason for choosing the school.",
    "guardian": "Student guardian.",
    "schoolsup": "Extra educational support from school.",
    "famsup": "Family educational support.",
    "paid": "Extra paid classes for the course subject.",
    "activities": "Extracurricular activities.",
    "nursery": "Whether the student attended nursery school.",
    "higher": "Whether the student wants higher education.",
    "internet": "Internet access at home.",
    "romantic": "Whether the student is in a romantic relationship.",
}

PREDICTION_SCHEMA = {
    "recommended_study_time_minutes_per_day": int,
    "recommended_subject": (str, type(None)),
    "weak_subject": (str, type(None)),
    "strong_subject": (str, type(None)),
    "goal_achievement_probability": float,
    "goal_probability_level": str,
    "recommended_review_subject": (str, type(None)),
    "reason": str,
    "curriculum": list,
    "ebs_recommendations": list,
}

# subject 값(영문, CSV 기반)을 한국어 서비스 표기로 바꿀 때 쓰는 매핑.
# 매핑에 없는 과목명은 원본 값을 그대로 사용한다(웹서비스는 자유 과목명을 허용하므로).
SUBJECT_KOREAN_LABELS = {
    "math": "수학",
    "portuguese": "국어",
}

REQUIRED_RAW_COLUMNS = [
    "school",
    "sex",
    "age",
    "address",
    "famsize",
    "Pstatus",
    "Medu",
    "Fedu",
    "Mjob",
    "Fjob",
    "reason",
    "guardian",
    "traveltime",
    "studytime",
    "failures",
    "schoolsup",
    "famsup",
    "paid",
    "activities",
    "nursery",
    "higher",
    "internet",
    "romantic",
    "famrel",
    "freetime",
    "goout",
    "Dalc",
    "Walc",
    "health",
    "absences",
    "G1",
    "G2",
    "G3",
]


@dataclass(frozen=True)
class TrainingConfig:
    """Settings used by the training pipeline."""

    test_size: float = 0.2
    cv_folds: int = 5
    random_seed: int = RANDOM_SEED
    model_version: str = MODEL_VERSION


def ensure_directories() -> None:
    """Create project output directories if they do not exist."""

    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
