"""Generate validation report text from training metadata."""

from __future__ import annotations

from typing import Any

from ai.feature_engineering import get_feature_documentation


RULE_ENGINE_RULES = [
    "Goal probability bands: >=0.80 very_high, >=0.60 high, >=0.40 medium, >=0.20 low, <0.20 very_low.",
    "Weak subject is selected by highest risk score using recent grade change, average grade, absence risk, failures, and support count.",
    "Strong subject must be different from the weak subject; when no different subject exists, strong_subject is null.",
    "Recommended study time is rule-based because the CSV has only weekly study-time categories, not actual daily minutes.",
    "Recommended subject and review subject follow the selected weak subject when enough subject evidence exists.",
]

CURRICULUM_ENGINE_RULES = [
    "Every subject present in the request is ranked by the same risk score as the rule engine, highest risk first.",
    "Recommended daily minutes are distributed across subjects proportionally to (risk_score, floored at 0) + 1, so even a strong subject keeps a small maintenance-review share.",
    "The highest-risk subject is always scheduled first (order = 1) and gets a concept-review focus note; other subjects get a trend-based short focus note.",
    "Rounding differences from proportional allocation are absorbed by the subject with the largest allocated_minutes so the total always equals the recommended daily minutes.",
]

EBS_ENGINE_RULES = [
    "EBS recommendations are rule-based lecture *categories* only (e.g. '수학 개념완성/기출문제풀이 강좌'), not real lecture titles or URLs, because no EBS content catalog is connected.",
    "Up to the two highest-risk subjects receive a recommendation, ordered by the same risk score as the rule engine.",
    "goal_achievement_probability below 0.5 recommends 기본 개념 강의 (basic concept lectures); 0.5 and above recommends 심화/응용 강의 (advanced/applied lectures).",
]


MODEL_LIMITATIONS = [
    "The CSV does not contain actual daily study minutes, target study minutes, mini-test scores, mock-exam scores, or long-term student histories.",
    "The target label uses G3 >= 10 as a proxy goal because the CSV has no service-defined goal achievement event.",
    "Rule-based study minutes are deterministic estimates, not directly learned daily-time predictions.",
    "EBS recommendations are category-level guidance text, not real lecture titles or links, since no EBS content catalog is connected.",
    "The MongoDB dataset builder (ai/dataset_builder.py) can only reconstruct demographic fields that the web service does not currently persist (e.g. StudentProfileForm answers), so extended dataset rows default those fields to neutral placeholders until the web service stores them.",
]


FUTURE_IMPROVEMENTS = [
    "Collect real daily study minutes and subject-level learning logs.",
    "Replace the proxy target with a service-defined goal achievement event.",
    "Add longitudinal features after stable student IDs and time-series logs are available.",
    "Evaluate a separate regression model only after real recommended-time labels exist.",
    "Persist StudentProfileForm answers server-side so the dataset builder can reconstruct full demographic rows instead of using placeholders.",
    "Connect ebs_engine.py to a real EBS content catalog/API once one is available, replacing category text with actual lecture titles and links.",
]


def build_validation_report(metadata: dict[str, Any]) -> str:
    """Build a Markdown validation report from model metadata.

    Args:
        metadata: Training metadata.

    Returns:
        Markdown report text.
    """

    feature_lines = "\n".join(
        f"- `{name}`: {description}" for name, description in get_feature_documentation().items()
    )
    rule_lines = "\n".join(f"- {rule}" for rule in RULE_ENGINE_RULES)
    curriculum_lines = "\n".join(f"- {rule}" for rule in CURRICULUM_ENGINE_RULES)
    ebs_lines = "\n".join(f"- {rule}" for rule in EBS_ENGINE_RULES)
    limitation_lines = "\n".join(f"- {item}" for item in MODEL_LIMITATIONS)
    future_lines = "\n".join(f"- {item}" for item in FUTURE_IMPROVEMENTS)
    importance_lines = "\n".join(
        f"- `{row['feature']}`: {row['importance']:.6f}"
        for row in metadata.get("feature_importance", [])
    )

    return f"""# AI Self-Study Recommendation Model Validation Report

## Model Summary

- Model version: {metadata['model_version']}
- Training data count: {metadata['data_count']}
- Random seed: {metadata['random_seed']}

## Metrics

- Accuracy: {metadata['accuracy']:.4f}
- Precision: {metadata['precision']:.4f}
- Recall: {metadata['recall']:.4f}
- F1 Score: {metadata['f1_score']:.4f}
- ROC-AUC: {metadata['roc_auc']:.4f}
- Cross Validation F1 Mean: {metadata['cross_validation_f1_mean']:.4f}
- Cross Validation F1 Std: {metadata['cross_validation_f1_std']:.4f}
- Confusion Matrix: {metadata['confusion_matrix']}

## Feature Descriptions

{feature_lines}

## Rule Engine Rules

{rule_lines}

## Curriculum Engine Rules

{curriculum_lines}

## EBS Engine Rules

{ebs_lines}

## Top Feature Importance

{importance_lines}

## Model Limitations

{limitation_lines}

## Future Improvements

{future_lines}
"""
