"""Tests for built-in KST retraining scheduler calculations."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from ai.scheduler import next_retrain_time, refresh_dataset_from_mongo, seconds_until


def test_next_retrain_time_before_11_kst_returns_same_day() -> None:
    now = datetime(2026, 7, 7, 10, 30, tzinfo=ZoneInfo("Asia/Seoul"))
    target = next_retrain_time(now)
    assert target == datetime(2026, 7, 7, 11, 0, tzinfo=ZoneInfo("Asia/Seoul"))


def test_next_retrain_time_after_11_kst_returns_next_day() -> None:
    now = datetime(2026, 7, 7, 11, 1, tzinfo=ZoneInfo("Asia/Seoul"))
    target = next_retrain_time(now)
    assert target == datetime(2026, 7, 8, 11, 0, tzinfo=ZoneInfo("Asia/Seoul"))


def test_seconds_until_is_non_negative() -> None:
    now = datetime(2026, 7, 7, 11, 1, tzinfo=ZoneInfo("Asia/Seoul"))
    target = datetime(2026, 7, 7, 11, 0, tzinfo=ZoneInfo("Asia/Seoul"))
    assert seconds_until(target, now) == 0.0


def test_refresh_dataset_from_mongo_noop_without_mongo_uri(monkeypatch) -> None:
    # Without MONGO_URI, the pipeline must not attempt a DB connection or raise.
    import ai.scheduler as scheduler_module

    monkeypatch.setattr(scheduler_module, "MONGO_URI", "")
    refresh_dataset_from_mongo()  # should return quietly, no exception
