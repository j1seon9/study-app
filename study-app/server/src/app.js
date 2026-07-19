// server/src/app.js

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
import dashboardRoutes from './routes/dashboard.routes.js';

import {
  notFound,
  errorHandler,
} from './middleware/errorHandler.js';


const app = express();


// 보안 헤더 설정
app.use(
  helmet()
);


// CORS 설정
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);


// 쿠키 파싱
app.use(
  cookieParser()
);


// 요청 데이터 파싱
app.use(
  express.json({
    limit: '1mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
  })
);


// NoSQL Injection 방지
app.use(
  mongoSanitize()
);


// XSS 방지
app.use(
  xss()
);


// =============================
// API Routes
// =============================

app.use(
  '/api/health',
  healthRoutes
);

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api/plans',
  planRoutes
);

app.use(
  '/api/records',
  recordRoutes
);

app.use(
  '/api/stats',
  statsRoutes
);

app.use(
  '/api/weekly-tests',
  weeklyTestRoutes
);

app.use(
  '/api/mock-exams',
  mockExamRoutes
);

app.use(
  '/api/ai',
  aiRoutes
);

app.use(
  '/api/dashboard',
  dashboardRoutes
);


// =============================
// Error Handler
// 반드시 마지막 위치
// =============================

app.use(
  notFound
);

app.use(
  errorHandler
);


export default app;