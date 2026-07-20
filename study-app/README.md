# 자율학습 도우미 (AI 기반 개인 맞춤형 자율학습 지원 웹서비스)

## 구조
- `client/` : React + Vite 프론트엔드
- `server/` : Node.js + Express 백엔드

이 서비스는 별도 리포지토리인 `aimodel/`(학습 추천 FastAPI 서비스)과
`ocr-preprocess-ai/`(성적표 사진 복원 모델)와 함께 연동되어 동작한다.
전체 아키텍처는 루트 [README](../README.md) 참고.

## 실행 방법
### 백엔드
```
cd server
cp .env.example .env   # 값 채우기
npm install
npm run dev
```

### 프론트엔드
```
cd client
cp .env.example .env
npm install
npm run dev
```

## 주요 기능
- JWT 인증 (httpOnly 쿠키 리프레시 토큰 회전)
- 공부 계획 / 공부 기록 CRUD
- Chart.js 기반 학습 통계
- 주간 미니테스트 및 모의고사 관리
- 클라이언트 사이드 OCR (tesseract.js) — 성적표 사진에서 과목/등급 자동 인식
- FastAPI 추천 엔진(`aimodel`) 연동 — 위험군 예측, 일일 학습시간 배분, EBS 강의 추천
- 성적표 사진 복원 모델(`ocr-preprocess-ai`) 연동 — 흐림/그림자 보정 후 OCR 인식률 향상

## 진행 상태
12단계 계획 중 1~10단계 완료, 11단계(UI 개선)·12단계(최적화 및 배포) 진행 중.

## 알려진 이슈
- 새로고침 시 로그인 상태가 풀리는 버그: `POST /api/auth/refresh`가 사용자 데이터를
  응답에 포함하지 않아서 발생. 재현 가능, 수정 예정.
