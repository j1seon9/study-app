"""Data loading, validation, cleaning, and feature engineering."""

from __future__ import annotations

from pathlib import Path
from typing import Mapping

import numpy as np
import pandas as pd

from ai.config import (
    DATASET_DATA_FILES,
    DATASET_DIR,
    FEATURE_DESCRIPTIONS,
    FEATURE_COLUMNS,
    PASSING_GRADE,
    RAW_DATA_FILES,
    REQUIRED_RAW_COLUMNS,
    TARGET_COLUMN,
)


class DataValidationError(ValueError):
    """Raised when input data cannot be used by the model pipeline."""


def resolve_data_files() -> dict[str, Path]:
    """Return available subject CSV files.

    The project keeps compatibility with the original root-level CSV files and
    also supports the requested dataset/ directory layout.

    Returns:
        Mapping from subject name to CSV path.

    Raises:
        FileNotFoundError: If no expected CSV files are found.
    """

    files: dict[str, Path] = {}
    for subject, dataset_path in DATASET_DATA_FILES.items():
        raw_path = RAW_DATA_FILES[subject]
        if dataset_path.exists():
            files[subject] = dataset_path
        elif raw_path.exists():
            files[subject] = raw_path

    if not files:
        expected = ", ".join(str(path) for path in RAW_DATA_FILES.values())
        raise FileNotFoundError(f"No student CSV files found. Expected one of: {expected}")
    return files


def discover_extended_dataset_files() -> list[Path]:
    """Find additional pre-built dataset CSVs beyond the two known UCI files.

    ``ai.dataset_builder`` (MongoDB Dataset Builder) writes a combined export
    (see ``config.WEBAPP_EXPORT_PATH``) into ``DATASET_DIR``. Any other csv a
    maintainer manually drops into ``DATASET_DIR`` is picked up the same way,
    as long as it already contains a ``subject`` column plus every column in
    ``REQUIRED_RAW_COLUMNS`` (unlike the two UCI files, which are single-subject
    and get their ``subject`` column added automatically).

    Returns:
        Sorted list of extended dataset CSV paths (possibly empty).
    """

    known_names = {path.name for path in DATASET_DATA_FILES.values()}
    if not DATASET_DIR.exists():
        return []
    return sorted(
        path
        for path in DATASET_DIR.glob("*.csv")
        if path.name not in known_names
    )


def load_extended_student_data(paths: list[Path]) -> pd.DataFrame:
    """Load already-combined extended dataset CSVs (e.g. from the dataset builder).

    Unlike ``load_student_data``, each file here is expected to already carry a
    ``subject`` column with real (possibly non-UCI) subject names, since a
    single export file can mix many subjects together.

    Args:
        paths: Extended dataset CSV paths.

    Returns:
        Combined dataframe with ``REQUIRED_RAW_COLUMNS + ["subject"]`` columns.
        Empty (but correctly shaped) dataframe when ``paths`` is empty.

    Raises:
        DataValidationError: If a file is empty or lacks required columns.
    """

    required_columns = REQUIRED_RAW_COLUMNS + ["subject"]
    if not paths:
        return pd.DataFrame(columns=required_columns)

    frames: list[pd.DataFrame] = []
    for path in paths:
        frame = pd.read_csv(path)
        if frame.empty:
            raise DataValidationError(f"CSV file is empty: {path}")
        missing = sorted(set(required_columns) - set(frame.columns))
        if missing:
            raise DataValidationError(f"{path.name} is missing columns: {missing}")
        frames.append(frame[required_columns].copy())

    return pd.concat(frames, ignore_index=True)


def load_student_data(data_files: Mapping[str, Path] | None = None) -> pd.DataFrame:
    """Load and combine student CSV files with a subject column.

    Args:
        data_files: Optional mapping from subject name to CSV path.

    Returns:
        Combined student dataframe.

    Raises:
        DataValidationError: If a file is empty or lacks required columns.
    """

    selected_files = data_files or resolve_data_files()
    frames: list[pd.DataFrame] = []
    for subject, path in selected_files.items():
        if not path.exists():
            raise FileNotFoundError(f"CSV file does not exist: {path}")
        frame = pd.read_csv(path, sep=";")
        if frame.empty:
            raise DataValidationError(f"CSV file is empty: {path}")
        missing = sorted(set(REQUIRED_RAW_COLUMNS) - set(frame.columns))
        if missing:
            raise DataValidationError(f"{path.name} is missing columns: {missing}")
        frame = frame[REQUIRED_RAW_COLUMNS].copy()
        frame["subject"] = subject
        frames.append(frame)

    combined = pd.concat(frames, ignore_index=True)
    return combined


def load_all_student_data(
    data_files: Mapping[str, Path] | None = None,
    include_extended: bool = True,
) -> pd.DataFrame:
    """Load the base UCI dataset combined with any extended dataset files.

    This is the entry point ``prepare_training_data`` uses so that training
    automatically benefits from ``ai.dataset_builder`` output without any
    other code changes once a maintainer runs the builder.

    Args:
        data_files: Optional subject-to-path mapping for the base UCI CSVs.
        include_extended: Whether to also merge in extended dataset files.

    Returns:
        Combined student dataframe.
    """

    combined = load_student_data(data_files)
    if not include_extended:
        return combined

    extended_paths = discover_extended_dataset_files()
    if not extended_paths:
        return combined

    extended = load_extended_student_data(extended_paths)
    if extended.empty:
        return combined
    return pd.concat([combined, extended], ignore_index=True)


def validate_input_frame(data: pd.DataFrame) -> None:
    """Validate a dataframe before cleaning and feature generation.

    Args:
        data: Input dataframe.

    Raises:
        DataValidationError: If the dataframe is empty or required fields are missing.
    """

    if data.empty:
        raise DataValidationError("Input data is empty.")

    required = set(REQUIRED_RAW_COLUMNS + ["subject"])
    missing = sorted(required - set(data.columns))
    if missing:
        raise DataValidationError(f"Input data is missing columns: {missing}")


def clean_student_data(data: pd.DataFrame) -> pd.DataFrame:
    """Clean missing values, invalid types, and domain outliers.

    Args:
        data: Raw student dataframe.

    Returns:
        Cleaned dataframe.
    """

    validate_input_frame(data)
    cleaned = data.copy()

    numeric_bounds = {
        "age": (15, 22),
        "Medu": (0, 4),
        "Fedu": (0, 4),
        "traveltime": (1, 4),
        "studytime": (1, 4),
        "failures": (0, 3),
        "famrel": (1, 5),
        "freetime": (1, 5),
        "goout": (1, 5),
        "Dalc": (1, 5),
        "Walc": (1, 5),
        "health": (1, 5),
        "absences": (0, 100),
        "G1": (0, 20),
        "G2": (0, 20),
        "G3": (0, 20),
    }

    for column, (lower, upper) in numeric_bounds.items():
        cleaned[column] = pd.to_numeric(cleaned[column], errors="coerce")
        median = cleaned[column].median()
        if np.isnan(median):
            median = lower
        cleaned[column] = cleaned[column].fillna(median).clip(lower, upper)

    categorical_columns = [column for column in cleaned.columns if column not in numeric_bounds]
    for column in categorical_columns:
        cleaned[column] = cleaned[column].astype("string").fillna("unknown").str.strip()
        cleaned.loc[cleaned[column] == "", column] = "unknown"

    return cleaned


def engineer_features(data: pd.DataFrame, include_target: bool = True) -> pd.DataFrame:
    """Create model-ready features from cleaned student data.

    Args:
        data: Raw or cleaned dataframe.
        include_target: Whether to include the supervised learning target.

    Returns:
        Dataframe containing configured feature columns and optionally target.
    """

    cleaned = clean_student_data(data)
    featured = cleaned.copy()

    featured["grade_trend"] = featured["G2"] - featured["G1"]
    featured["grade_average"] = featured[["G1", "G2"]].mean(axis=1)

    # Absence risk is intentionally relative to the available training or
    # prediction batch because the CSV has no service-level attendance target.
    absence_threshold = float(featured["absences"].quantile(0.75))
    featured["absence_risk"] = (featured["absences"] >= absence_threshold).astype(int)

    # support_count uses only support columns that exist in the CSV. Each yes
    # adds one point, so the range is 0 to 3.
    support_columns = ["schoolsup", "famsup", "paid"]
    featured["support_count"] = featured[support_columns].eq("yes").sum(axis=1)

    selected = featured[FEATURE_COLUMNS].copy()
    if include_target:
        selected[TARGET_COLUMN] = (featured["G3"] >= PASSING_GRADE).astype(int)
    return selected


def get_feature_documentation() -> dict[str, str]:
    """Return feature names and service-facing descriptions.

    Returns:
        Mapping from feature name to meaning.
    """

    return {column: FEATURE_DESCRIPTIONS[column] for column in FEATURE_COLUMNS}


def prepare_training_data(data_files: Mapping[str, Path] | None = None) -> tuple[pd.DataFrame, pd.Series]:
    """Load CSV files (UCI + any extended dataset) and return features with target labels.

    Args:
        data_files: Optional subject-to-path mapping for the base UCI CSVs.

    Returns:
        Tuple of X features and y labels.
    """

    raw = load_all_student_data(data_files)
    featured = engineer_features(raw, include_target=True)
    return featured[FEATURE_COLUMNS], featured[TARGET_COLUMN]


def prepare_prediction_data(records: list[dict]) -> pd.DataFrame:
    """Convert API-style records into model-ready features.

    Args:
        records: List of student subject records.

    Returns:
        Feature dataframe.
    """

    frame = pd.DataFrame(records)
    if "G3" not in frame.columns:
        frame["G3"] = 0
    return engineer_features(frame, include_target=False)
