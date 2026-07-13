"""Built-in daily retraining scheduler for the model project."""

from __future__ import annotations

import argparse
import logging
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from ai.config import (
    MONGO_URI,
    RETRAIN_HOUR,
    RETRAIN_LOG_PATH,
    RETRAIN_MINUTE,
    RETRAIN_TIMEZONE,
    ensure_directories,
)
from ai.dataset_builder import build_dataset_from_mongo
from ai.train import train_model


MAX_SLEEP_SECONDS = 60 * 30


def configure_logging() -> None:
    """Configure console and file logging for scheduled retraining."""

    ensure_directories()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(RETRAIN_LOG_PATH, encoding="utf-8"),
        ],
    )


def get_kst_zone() -> ZoneInfo:
    """Return the configured retraining timezone.

    Returns:
        ZoneInfo for Asia/Seoul by default.
    """

    return ZoneInfo(RETRAIN_TIMEZONE)


def next_retrain_time(now: datetime | None = None) -> datetime:
    """Calculate the next KST retraining time.

    Args:
        now: Optional timezone-aware datetime for testing.

    Returns:
        Next datetime at the configured KST retraining time.
    """

    zone = get_kst_zone()
    current = now.astimezone(zone) if now is not None else datetime.now(zone)
    candidate = current.replace(
        hour=RETRAIN_HOUR,
        minute=RETRAIN_MINUTE,
        second=0,
        microsecond=0,
    )
    if current >= candidate:
        candidate += timedelta(days=1)
    return candidate


def seconds_until(target_time: datetime, now: datetime | None = None) -> float:
    """Calculate seconds from now until the target time.

    Args:
        target_time: Scheduled target datetime.
        now: Optional timezone-aware datetime for testing.

    Returns:
        Non-negative sleep seconds.
    """

    zone = get_kst_zone()
    current = now.astimezone(zone) if now is not None else datetime.now(zone)
    return max(0.0, (target_time - current).total_seconds())


def refresh_dataset_from_mongo() -> None:
    """Run the MongoDB Dataset Builder before training, if MONGO_URI is configured.

    This step is best-effort: if MONGO_URI is not set (local/offline dev), or
    the build fails for any reason (network issue, empty collections, etc.),
    training still proceeds using whatever CSVs already exist under
    DATASET_DIR (the two UCI CSVs plus any previously-built webapp export).
    A build failure must never block the scheduled retraining run.
    """

    if not MONGO_URI:
        logging.info("MONGO_URI not set; skipping MongoDB dataset refresh and using existing CSVs.")
        return

    try:
        frame = build_dataset_from_mongo()
        logging.info("MongoDB dataset refresh wrote %d rows.", len(frame))
    except Exception:
        logging.exception("MongoDB dataset refresh failed; continuing with existing CSVs.")


def run_retraining_once() -> dict:
    """Run one full retraining pipeline (dataset refresh + train) and return metadata.

    Returns:
        Training metadata from ai.train.train_model.
    """

    logging.info("Starting scheduled model retraining pipeline.")
    refresh_dataset_from_mongo()
    metadata = train_model()
    logging.info(
        "Finished scheduled model retraining. model_version=%s data_count=%s f1=%.4f",
        metadata["model_version"],
        metadata["data_count"],
        metadata["f1_score"],
    )
    return metadata


def run_daily_scheduler(max_runs: int | None = None) -> None:
    """Run the built-in daily retraining loop.

    The process must remain running. It retrains at 11:00 KST by default and
    saves the same artifacts as `python -m ai.train`.

    Args:
        max_runs: Optional run limit for tests or controlled execution.
    """

    configure_logging()
    completed_runs = 0
    logging.info(
        "Daily retraining scheduler started. timezone=%s time=%02d:%02d",
        RETRAIN_TIMEZONE,
        RETRAIN_HOUR,
        RETRAIN_MINUTE,
    )

    while max_runs is None or completed_runs < max_runs:
        target = next_retrain_time()
        logging.info("Next retraining time: %s", target.isoformat())
        while True:
            remaining = seconds_until(target)
            if remaining <= 0:
                break
            time.sleep(min(remaining, MAX_SLEEP_SECONDS))

        try:
            run_retraining_once()
        except Exception:
            logging.exception("Scheduled model retraining failed.")
        finally:
            completed_runs += 1


def parse_args() -> argparse.Namespace:
    """Parse scheduler CLI arguments.

    Returns:
        Parsed argparse namespace.
    """

    parser = argparse.ArgumentParser(description="Run built-in KST daily model retraining.")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run retraining immediately once, then exit.",
    )
    parser.add_argument(
        "--max-runs",
        type=int,
        default=None,
        help="Limit scheduled retraining runs. Mainly useful for validation.",
    )
    return parser.parse_args()


def main() -> None:
    """CLI entrypoint for the built-in scheduler."""

    args = parse_args()
    configure_logging()
    if args.once:
        run_retraining_once()
        return
    run_daily_scheduler(max_runs=args.max_runs)


if __name__ == "__main__":
    main()
