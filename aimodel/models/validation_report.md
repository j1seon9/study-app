# AI Self-Study Recommendation Model Validation Report

## Model Summary

- Model version: 1.3.0
- Training data count: 1044
- Random seed: 42

## Metrics

- Accuracy: 0.8947
- Precision: 0.9608
- Recall: 0.9018
- F1 Score: 0.9304
- ROC-AUC: 0.9557
- Cross Validation F1 Mean: 0.9216
- Cross Validation F1 Std: 0.0403
- Confusion Matrix: [[40, 6], [16, 147]]

## Feature Descriptions

- `age`: Student age.
- `Medu`: Mother education level.
- `Fedu`: Father education level.
- `traveltime`: Home-to-school travel time category.
- `studytime`: Weekly study time category from the CSV.
- `failures`: Number of previous class failures.
- `famrel`: Family relationship quality.
- `freetime`: Free time after school.
- `goout`: Frequency of going out with friends.
- `Dalc`: Workday alcohol consumption category.
- `Walc`: Weekend alcohol consumption category.
- `health`: Current health status category.
- `absences`: Number of school absences.
- `G1`: First period grade.
- `G2`: Second period grade.
- `grade_trend`: Recent grade change calculated as G2 - G1.
- `grade_average`: Average of G1 and G2.
- `absence_risk`: Binary flag for records at or above the training batch 75th percentile of absences.
- `support_count`: Count of yes values among schoolsup, famsup, and paid.
- `subject`: Subject derived from the source CSV file.
- `school`: Student school.
- `sex`: Student sex.
- `address`: Home address type.
- `famsize`: Family size category.
- `Pstatus`: Parent cohabitation status.
- `Mjob`: Mother job category.
- `Fjob`: Father job category.
- `reason`: Reason for choosing the school.
- `guardian`: Student guardian.
- `schoolsup`: Extra educational support from school.
- `famsup`: Family educational support.
- `paid`: Extra paid classes for the course subject.
- `activities`: Extracurricular activities.
- `nursery`: Whether the student attended nursery school.
- `higher`: Whether the student wants higher education.
- `internet`: Internet access at home.
- `romantic`: Whether the student is in a romantic relationship.

## Rule Engine Rules

- Goal probability bands: >=0.80 very_high, >=0.60 high, >=0.40 medium, >=0.20 low, <0.20 very_low.
- Weak subject is selected by highest risk score using recent grade change, average grade, absence risk, failures, and support count.
- Strong subject must be different from the weak subject; when no different subject exists, strong_subject is null.
- Recommended study time is rule-based because the CSV has only weekly study-time categories, not actual daily minutes.
- Recommended subject and review subject follow the selected weak subject when enough subject evidence exists.

## Curriculum Engine Rules

- Every subject present in the request is ranked by the same risk score as the rule engine, highest risk first.
- Recommended daily minutes are distributed across subjects proportionally to (risk_score, floored at 0) + 1, so even a strong subject keeps a small maintenance-review share.
- The highest-risk subject is always scheduled first (order = 1) and gets a concept-review focus note; other subjects get a trend-based short focus note.
- Rounding differences from proportional allocation are absorbed by the subject with the largest allocated_minutes so the total always equals the recommended daily minutes.

## EBS Engine Rules

- EBS recommendations are rule-based lecture *categories* only (e.g. '수학 개념완성/기출문제풀이 강좌'), not real lecture titles or URLs, because no EBS content catalog is connected.
- Up to the two highest-risk subjects receive a recommendation, ordered by the same risk score as the rule engine.
- goal_achievement_probability below 0.5 recommends 기본 개념 강의 (basic concept lectures); 0.5 and above recommends 심화/응용 강의 (advanced/applied lectures).

## Top Feature Importance

- `numeric__grade_average`: 0.263382
- `numeric__G2`: 0.240380
- `numeric__G1`: 0.177329
- `numeric__failures`: 0.035887
- `numeric__grade_trend`: 0.022325
- `numeric__absences`: 0.015773
- `categorical__subject_portuguese`: 0.014519
- `categorical__subject_math`: 0.013987
- `numeric__goout`: 0.011138
- `categorical__higher_yes`: 0.010201
- `numeric__Walc`: 0.008577
- `categorical__higher_no`: 0.008254
- `numeric__age`: 0.008212
- `numeric__Dalc`: 0.007869
- `numeric__Fedu`: 0.007661
- `numeric__freetime`: 0.007530
- `numeric__health`: 0.007223
- `numeric__Medu`: 0.007135
- `numeric__famrel`: 0.006139
- `numeric__studytime`: 0.005969

## Model Limitations

- The CSV does not contain actual daily study minutes, target study minutes, mini-test scores, mock-exam scores, or long-term student histories.
- The target label uses G3 >= 10 as a proxy goal because the CSV has no service-defined goal achievement event.
- Rule-based study minutes are deterministic estimates, not directly learned daily-time predictions.
- EBS recommendations are category-level guidance text, not real lecture titles or links, since no EBS content catalog is connected.
- The MongoDB dataset builder (ai/dataset_builder.py) can only reconstruct demographic fields that the web service does not currently persist (e.g. StudentProfileForm answers), so extended dataset rows default those fields to neutral placeholders until the web service stores them.

## Future Improvements

- Collect real daily study minutes and subject-level learning logs.
- Replace the proxy target with a service-defined goal achievement event.
- Add longitudinal features after stable student IDs and time-series logs are available.
- Evaluate a separate regression model only after real recommended-time labels exist.
- Persist StudentProfileForm answers server-side so the dataset builder can reconstruct full demographic rows instead of using placeholders.
- Connect ebs_engine.py to a real EBS content catalog/API once one is available, replacing category text with actual lecture titles and links.
