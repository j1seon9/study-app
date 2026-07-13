"""MongoDB Dataset Builder.

Exports real web-service study data (study_records / study_plans /
weekly_tests / mock_exam_results collections) into a CSV shaped exactly like
the UCI Student Performance dataset (``REQUIRED_RAW_COLUMNS + ["subject"]``),
so ``feature_engineering.discover_extended_dataset_files`` picks it up
automatically on the next ``python -m ai.train`` run.

Known limitation (documented in the validation report too): the web service
does not currently persist StudentProfileForm answers (Medu, Fedu, Mjob,
Fjob, famrel, ...), only the ephemeral values submitted at prediction time.
Until that changes, every exported row uses the same neutral placeholder
profile for those columns — real signal in the export comes from studytime,
absences, and the G1/G2/G3 grades, which *are* derived from real study data.

This script only needs ``pymongo`` and never imports anything from the
Express codebase; it talks to the same MongoDB directly via ``MONGO_URI``.

Usage:
    python -m ai.dataset_builder
"""

from __future__ import annotations

import argparse
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd

from ai.config import MONGO_DB_NAME, MONGO_URI, REQUIRED_RAW_COLUMNS, WEBAPP_EXPORT_PATH, ensure_directories

logger = logging.getLogger(__name__)

# StudentProfileForm이 서버에 저장되지 않기 때문에 쓰는 중립 placeholder 프로필.
# client/src/components/StudentProfileForm.jsx의 emptyProfile 기본값과 맞춰 두었다.
PLACEHOLDER_PROFILE: dict[str, Any] = {
    "school": "GP",
    "sex": "F",
    "age": 17,
    "address": "U",
    "famsize": "GT3",
    "Pstatus": "T",
    "Medu": 3,
    "Fedu": 3,
    "Mjob": "other",
    "Fjob": "other",
    "reason": "course",
    "guardian": "mother",
    "traveltime": 1,
    "schoolsup": "no",
    "famsup": "yes",
    "paid": "no",
    "activities": "yes",
    "nursery": "yes",
    "higher": "yes",
    "internet": "yes",
    "romantic": "no",
    "famrel": 4,
    "freetime": 3,
    "goout": 3,
    "Dalc": 1,
    "Walc": 1,
    "health": 4,
}

STUDYTIME_BUCKETS = [(120, 1), (300, 2), (600, 3), (float("inf"), 4)]


def _minutes_to_studytime(minutes: float) -> int:
    for upper, value in STUDYTIME_BUCKETS:
        if minutes < upper:
            return value
    return 4


def _score_to_grade20(score: float) -> int:
    return max(0, min(20, round((score / 100) * 20)))


def _split_into_three(scores: list[float]) -> tuple[int, int, int]:
    """Split chronological scores into G1/G2/G3 (early/mid/late thirds)."""

    if not scores:
        return 10, 10, 10
    if len(scores) < 3:
        grade = _score_to_grade20(sum(scores) / len(scores))
        return grade, grade, grade

    third = max(1, len(scores) // 3)
    early = scores[:third]
    mid = scores[third : 2 * third] or early
    late = scores[2 * third :] or mid
    return (
        _score_to_grade20(sum(early) / len(early)),
        _score_to_grade20(sum(mid) / len(mid)),
        _score_to_grade20(sum(late) / len(late)),
    )


@dataclass
class MongoCollections:
    """Thin wrapper around the four collections this builder reads."""

    study_records: Any
    study_plans: Any
    weekly_tests: Any
    mock_exam_results: Any


def connect(mongo_uri: str = MONGO_URI, db_name: str = MONGO_DB_NAME) -> MongoCollections:
    """Connect to MongoDB and return the collections this builder needs.

    Args:
        mongo_uri: MongoDB connection string. Defaults to config.MONGO_URI
            (same env var name Express uses: MONGO_URI).
        db_name: Database name. Defaults to config.MONGO_DB_NAME.

    Returns:
        MongoCollections wrapper.

    Raises:
        ValueError: If mongo_uri is empty.
        ImportError: If pymongo is not installed.
    """

    if not mongo_uri:
        raise ValueError(
            "MONGO_URI가 설정되지 않았습니다. Express 서버와 동일한 MongoDB 연결 문자열을 "
            "환경변수 MONGO_URI로 설정한 뒤 다시 실행하세요."
        )

    from pymongo import MongoClient  # local import: pymongo is optional unless this runs

    client: MongoClient = MongoClient(mongo_uri)
    db = client[db_name]
    return MongoCollections(
        study_records=db["study_records"],
        study_plans=db["study_plans"],
        weekly_tests=db["weekly_tests"],
        mock_exam_results=db["mock_exam_results"],
    )


def _distinct_user_subjects(collections: MongoCollections) -> set[tuple[Any, str]]:
    """Return every (userId, subject) pair with at least one study record."""

    pairs = collections.study_records.aggregate(
        [{"$group": {"_id": {"userId": "$userId", "subject": "$subject"}}}]
    )
    return {(row["_id"]["userId"], row["_id"]["subject"]) for row in pairs}


def build_row_for_user_subject(
    collections: MongoCollections,
    user_id: Any,
    subject: str,
    now: datetime | None = None,
) -> dict[str, Any] | None:
    """Build one REQUIRED_RAW_COLUMNS + subject row for a single (user, subject) pair.

    Args:
        collections: Connected MongoCollections.
        user_id: Mongo ObjectId of the user.
        subject: Subject name (webapp-defined, e.g. "수학").
        now: Optional fixed "now" for deterministic tests.

    Returns:
        A row dict, or None if there isn't enough data to build one
        (fewer than 3 weekly-test/mock-exam scores, since G1/G2/G3 all need
        a value and a single/duplicated score would give the model no
        signal about genuine progression).
    """

    now = now or datetime.now(timezone.utc)
    last_7_days = now - timedelta(days=7)
    last_30_days = now - timedelta(days=30)

    weekly_scores = [
        doc["score"]
        for doc in collections.weekly_tests.find(
            {"userId": user_id, "subject": subject}
        ).sort("testDate", 1)
    ]
    mock_scores = [
        doc["score"]
        for doc in collections.mock_exam_results.find(
            {"userId": user_id, "subject": subject}
        ).sort("examDate", 1)
    ]
    scores = weekly_scores or mock_scores
    if len(scores) < 3:
        return None

    g1, g2, g3 = _split_into_three(scores)

    weekly_minutes = sum(
        doc.get("actualMinutes", 0)
        for doc in collections.study_records.find(
            {"userId": user_id, "subject": subject, "date": {"$gte": last_7_days}}
        )
    )
    incomplete_plans = collections.study_plans.count_documents(
        {
            "userId": user_id,
            "subject": subject,
            "planDate": {"$gte": last_30_days},
            "isCompleted": False,
        }
    )

    row: dict[str, Any] = {
        **PLACEHOLDER_PROFILE,
        "subject": subject,
        "failures": 0,
        "studytime": _minutes_to_studytime(weekly_minutes),
        "absences": min(incomplete_plans, 93),
        "G1": g1,
        "G2": g2,
        "G3": g3,
    }
    return row


def build_dataset_from_mongo(
    mongo_uri: str = MONGO_URI,
    db_name: str = MONGO_DB_NAME,
    output_path=WEBAPP_EXPORT_PATH,
) -> pd.DataFrame:
    """Build and save the extended training CSV from live MongoDB data.

    Args:
        mongo_uri: MongoDB connection string.
        db_name: Database name.
        output_path: Where to write the CSV (defaults to config.WEBAPP_EXPORT_PATH,
            which feature_engineering.py automatically discovers on the next train run).

    Returns:
        The built dataframe (also written to output_path). Empty dataframe
        (with correct columns) when no (user, subject) has enough history yet.
    """

    ensure_directories()
    collections = connect(mongo_uri, db_name)

    rows: list[dict[str, Any]] = []
    for user_id, subject in _distinct_user_subjects(collections):
        row = build_row_for_user_subject(collections, user_id, subject)
        if row is not None:
            rows.append(row)

    columns = REQUIRED_RAW_COLUMNS + ["subject"]
    frame = pd.DataFrame(rows, columns=columns)
    frame.to_csv(output_path, index=False)
    logger.info("MongoDB dataset builder wrote %d rows to %s", len(frame), output_path)
    return frame


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a training CSV from live MongoDB study data.")
    parser.add_argument("--mongo-uri", default=MONGO_URI, help="MongoDB connection string (defaults to MONGO_URI env var).")
    parser.add_argument("--db-name", default=MONGO_DB_NAME, help="Database name (defaults to MONGO_DB_NAME env var).")
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    args = parse_args()
    frame = build_dataset_from_mongo(mongo_uri=args.mongo_uri, db_name=args.db_name)
    print(f"Wrote {len(frame)} rows to {WEBAPP_EXPORT_PATH}")


if __name__ == "__main__":
    main()
