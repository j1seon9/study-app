# Step 10 Implementation Tasks

## Express Server — Models
- [x] Modify `AiReport.js` — add `predictionDetails` fields

## Express Server — Services
- [x] Create `aiClient.js` — HTTP client to FastAPI
- [x] Create `aiAdapter.js` — MongoDB data → UCI schema bridge

## Express Server — Controller + Routes + Validator
- [x] Create `ai.validator.js`
- [x] Create `ai.controller.js`
- [x] Create `ai.routes.js`

## Express Server — Config / Wiring
- [x] Modify `env.js` — add `aiApiUrl`
- [x] Modify `app.js` — mount `/api/ai`
- [x] Modify `.env.example` — add AI env vars

## FastAPI Server
- [x] Modify `api.py` — add CORS + API key
- [x] Modify `config.py` — relative paths + env vars

## React Client — API + Pages + Components
- [x] Create `ai.api.js` — frontend API module
- [x] Create `AiReportPage.jsx` — AI report page
- [x] Create `AiReportCard.jsx` — report summary card
- [x] Create `StudentProfileForm.jsx` — demographic survey

## React Client — Routing / Navigation
- [x] Modify `App.jsx` — add `/ai-report` route
- [x] Modify `DashboardPage.jsx` — add AI menu item
- [x] Modify `NavBar.jsx` — add AI nav link

## Verification
- [x] FastAPI tests pass (`python -m pytest`)
- [x] Express server starts without errors
- [x] Client builds without errors

## AI Model

- [x] Refactor feature_engineering.py
- [x] Refactor predict.py
- [x] Extend rule_engine.py
- [x] Refactor reporting.py
- [x] Refactor evaluation.py
- [x] Refactor scheduler.py

- [x] Add curriculum_engine.py
- [x] Add ebs_engine.py
- [x] Add report_generator.py

## AI Models

- [x] Split model.pkl
- [x] Create preprocess.pkl
- [x] Create feature_columns.json
- [x] Create metadata.json

## Dataset

- [x] MongoDB Dataset Builder
- [x] Retraining Pipeline