# AI 기반 개인 맞춤형 자율학습 지원 웹서비스

학생이 모의고사/학평 성적표(고등학생 대상) 사진을 올리면, OCR로 성적을 자동 인식하고
AI가 과목별 위험도를 분석해 하루 학습시간 배분과 EBS 강의를 추천해주는
자기주도학습 지원 서비스.

## 아키텍처

4개의 독립된 프로젝트가 연동되어 동작한다.

```
┌─────────────┐   REST    ┌──────────────┐   REST    ┌────────────────┐
│ study-app/   │ ────────▶ │ study-app/    │ ────────▶ │ aimodel/        │
│ client       │           │ server        │           │ (FastAPI)       │
│ (React+Vite) │ ◀──────── │ (Express)     │ ◀──────── │ 학습 추천 엔진   │
└─────────────┘           └──────┬───────┘           └────────────────┘
                                  │ REST
                                  ▼
                          ┌────────────────┐
                          │ ocr-preprocess- │
                          │ ai/ (FastAPI)   │
                          │ 성적표 사진 복원 │
                          └────────────────┘
```

| 프로젝트 | 역할 | 스택 |
|---|---|---|
| `study-app/client` | 프론트엔드 — 대시보드, 공부 계획/기록, 통계, 사진 업로드 | React, Vite |
| `study-app/server` | 백엔드 — 인증, CRUD, AI 서비스 연동 게이트웨이 | Node.js, Express, MongoDB |
| `aimodel` | 위험군 예측 · 학습시간 배분 · EBS 강의 추천 | FastAPI, scikit-learn |
| `ocr-preprocess-ai` | 스마트폰으로 찍은 성적표 사진 복원(흐림/그림자/원근왜곡 보정) → OCR 인식률 개선 | FastAPI, PyTorch(학습) / ONNX Runtime(서빙) |

각 프로젝트는 독립적으로 실행/배포 가능하며, 폴더별 README에 상세 실행 방법이 있다.

## 주요 기능

- **OCR 자동 채점표 인식**: tesseract.js(클라이언트) + 경량 U-Net 복원 모델(서버)로
  스마트폰 사진의 인식률을 개선
- **AI 학습 추천**: UCI Student Performance 데이터셋 기반 scikit-learn 모델로
  과목별 위험도 예측, 규칙 기반 엔진으로 일일 학습시간 배분 및 EBS 강의 카테고리 추천
- **개인정보 최소화**: 인구통계 설문이 예측에 미치는 영향이 적다는 분석 결과에 따라
  개인정보 입력 폼을 제거하고 고정 프로필 상수로 대체

## 빠른 시작

```bash
# 1. AI 추천 엔진
cd aimodel && python -m venv venv && venv\Scripts\pip install -r requirements.txt
venv\Scripts\uvicorn ai.api:app --port 8000

# 2. OCR 복원 서비스
cd ocr-preprocess-ai && python -m venv venv && venv\Scripts\pip install -r requirements-serve.txt
venv\Scripts\uvicorn ai.api:app --port 8100

# 3. 백엔드
cd study-app/server && npm install && cp .env.example .env && npm run dev

# 4. 프론트엔드
cd study-app/client && npm install && cp .env.example .env && npm run dev
```

## 개발 배경

2인 개발로 12단계 계획을 세워 순차적으로 진행 (인증 → CRUD → 통계 →
OCR → AI 연동 → UI/배포). 자세한 개발 히스토리는 각 하위 프로젝트의
README와 `task.md` 참고.

풀스텍 개발 : 오지성
웹 UI/UX 개발 : 신서진