# 자율학습 도우미 (AI 기반 개인 맞춤형 자율학습 지원 웹서비스)

## 구조
- client/ : React + Vite 프론트엔드
- server/ : Node.js + Express 백엔드

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

## 현재 진행 단계
1단계(프로젝트 생성) + 2단계(폴더 구조 설계) 완료.
다음 단계: MongoDB 연결 및 모델 생성(3단계).
