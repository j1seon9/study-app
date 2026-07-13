import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

import env from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import planRoutes from './routes/plan.routes.js';
import recordRoutes from './routes/record.routes.js';
import statsRoutes from './routes/stats.routes.js';
import weeklyTestRoutes from './routes/weeklyTest.routes.js';
import mockExamRoutes from './routes/mockExam.routes.js';
import aiRoutes from './routes/ai.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// 보안 헤더 설정 (RAM 부담이 적은 기본 설정만 사용)
app.use(helmet());

// CORS: 지정된 프론트엔드 origin만 허용 (credentials: true 필수 - 쿠키 전달을 위해)
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);

// 쿠키 파싱 (Refresh Token을 httpOnly 쿠키로 주고받기 위해 필요)
app.use(cookieParser());

// JSON 바디 파싱 (용량 제한으로 메모리 보호)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL Injection 방지
app.use(mongoSanitize());

// XSS 방지
app.use(xss());

// 라우트 연결
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/weekly-tests', weeklyTestRoutes);
app.use('/api/mock-exams', mockExamRoutes);
app.use('/api/ai', aiRoutes);

// 404 및 전역 에러 처리 (반드시 마지막에 위치)
app.use(notFound);
app.use(errorHandler);

export default app;
