# AI 기반 개인 맞춤형 자율학습 추천 모델

## 1. 설계 이유

현재 프로젝트의 CSV는 `student-mat.csv`, `student-por.csv`이며 컬럼은 UCI Student Performance 데이터셋 형식입니다.

입력 예시에 포함된 하루 공부시간, 목표 공부시간, 과목별 공부시간, 미니테스트 점수, 모의고사 점수 컬럼은 실제 CSV에 없으므로 임의 생성하지 않습니다. 실제 CSV에서 검증 가능한 정보만 사용합니다.

- `studytime`: 주간 공부시간 구간
- `absences`: 결석 수
- `G1`, `G2`: 최근 성적 신호
- `G3`: 학습 목표 달성 여부 라벨 생성용
- `subject`: `student-mat.csv`와 `student-por.csv`를 구분하기 위해 추가

모델은 `G3 >= 10`을 목표 달성으로 정의한 분류 모델입니다. 추천 이유 문장은 모델이 생성하지 않고 `rule_engine.py`의 규칙 기반 로직이 생성합니다.

## 2. 폴더 구조

```text
ai/
  __init__.py
  api.py
  config.py
  evaluation.py
  feature_engineering.py
  predict.py
  prediction_validation.py
  reporting.py
  rule_engine.py
  scheduler.py
  train.py
dataset/
models/
tests/
requirements.txt
README.md
student-mat.csv
student-por.csv
student.txt
```

## 3. 기본 실행 방법

```powershell
python -m pip install -r requirements.txt
python -m ai.train
python -m ai.predict
```

학습 후 생성 파일:

```text
models/model.pkl
models/metadata.json
models/feature_importance.csv
models/feature_importance.png
models/validation_report.md
```

## 4. API 실행 방법

```powershell
uvicorn ai.api:app --host 127.0.0.1 --port 8000
```

API 문서:

```text
http://127.0.0.1:8000/docs
```

주요 엔드포인트:

- `GET /health`
- `GET /api/metadata`
- `POST /api/predict`
- `POST /api/retrain`

## 5. KST 11시 자동 재학습

모델 프로젝트 자체에 KST 기준 매일 오전 11시 재학습 스케줄러가 포함되어 있습니다.

```powershell
python -m ai.scheduler
```

위 프로세스가 실행 중이면 매일 `Asia/Seoul` 기준 11:00에 전체 데이터를 이용해 재학습하고 모델 산출물을 저장합니다.

즉시 1회 재학습만 실행하려면 다음 명령을 사용합니다.

```powershell
python -m ai.scheduler --once
```

스케줄러 로그:

```text
models/retrain_scheduler.log
```

주의: 내장 스케줄러는 Python 프로세스가 실행 중일 때 동작합니다. 서버 운영 환경에서는 해당 명령을 서비스, PM2, Docker, Windows 작업 스케줄러 등으로 상시 실행 상태로 유지해야 합니다.

## 6. 테스트 방법

```powershell
python -m pytest
```

테스트는 정상 입력, 결측치, 이상치, 빈 데이터, 잘못된 데이터 타입, Rule Engine 충돌 방지, 모델 저장/로드, 예측 응답 스키마, API 엔드포인트, KST 스케줄 계산을 검증합니다.

