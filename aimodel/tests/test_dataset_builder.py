"""Tests for ai.dataset_builder (MongoDB Dataset Builder).

These tests never touch a real MongoDB. ``build_row_for_user_subject`` only
needs objects that look like pymongo collections (``.find().sort()`` and
``.count_documents()``), so we fake those directly.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from ai.config import REQUIRED_RAW_COLUMNS
from ai.dataset_builder import (
    MongoCollections,
    _minutes_to_studytime,
    _score_to_grade20,
    _split_into_three,
    build_row_for_user_subject,
    connect,
)


class _FakeCursor:
    def __init__(self, docs: list[dict]) -> None:
        self._docs = docs

    def sort(self, *_args, **_kwargs) -> "_FakeCursor":
        return self

    def __iter__(self):
        return iter(self._docs)


class _FakeCollection:
    def __init__(self, docs: list[dict], count: int = 0) -> None:
        self._docs = docs
        self._count = count

    def find(self, _query) -> _FakeCursor:
        return _FakeCursor(self._docs)

    def count_documents(self, _query) -> int:
        return self._count


def test_minutes_to_studytime_buckets() -> None:
    assert _minutes_to_studytime(0) == 1
    assert _minutes_to_studytime(119) == 1
    assert _minutes_to_studytime(120) == 2
    assert _minutes_to_studytime(600) == 4


def test_score_to_grade20_scales_correctly() -> None:
    assert _score_to_grade20(0) == 0
    assert _score_to_grade20(50) == 10
    assert _score_to_grade20(100) == 20


def test_split_into_three_handles_short_lists() -> None:
    assert _split_into_three([]) == (10, 10, 10)
    assert _split_into_three([80]) == (16, 16, 16)


def test_split_into_three_reflects_progression() -> None:
    # Clearly increasing scores over 9 data points.
    scores = [40, 42, 44, 60, 62, 64, 90, 92, 94]
    g1, g2, g3 = _split_into_three(scores)
    assert g1 < g2 < g3


def test_connect_requires_mongo_uri() -> None:
    with pytest.raises(ValueError):
        connect(mongo_uri="", db_name="study-app")


def test_build_row_for_user_subject_returns_none_without_enough_scores() -> None:
    collections = MongoCollections(
        study_records=_FakeCollection([]),
        study_plans=_FakeCollection([]),
        weekly_tests=_FakeCollection([{"score": 70}, {"score": 75}]),  # only 2 scores
        mock_exam_results=_FakeCollection([]),
    )
    row = build_row_for_user_subject(collections, user_id="u1", subject="math")
    assert row is None


def test_build_row_for_user_subject_builds_expected_columns() -> None:
    now = datetime(2026, 7, 10, tzinfo=timezone.utc)
    collections = MongoCollections(
        study_records=_FakeCollection([{"actualMinutes": 40}, {"actualMinutes": 50}]),
        study_plans=_FakeCollection([], count=2),
        weekly_tests=_FakeCollection([{"score": 60}, {"score": 70}, {"score": 85}]),
        mock_exam_results=_FakeCollection([]),
    )
    row = build_row_for_user_subject(collections, user_id="u1", subject="수학", now=now)

    assert row is not None
    assert set(row) == set(REQUIRED_RAW_COLUMNS + ["subject"])
    assert row["subject"] == "수학"
    assert row["studytime"] == _minutes_to_studytime(90)
    assert row["absences"] == 2
    assert row["G1"] < row["G3"]
