import dotenv from 'dotenv';

dotenv.config();

/**
 * 환경변수를 한 곳에서 관리한다.
 * 다른 파일에서는 process.env를 직접 참조하지 않고 이 파일을 통해 사용한다.
 */
const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // 10단계: FastAPI AI 마이크로서비스(aiproject) 연동 설정
  aiApiUrl: process.env.AI_API_URL || 'http://127.0.0.1:8000',
  aiApiKey: process.env.AI_API_KEY || '',
  aiApiTimeoutMs: Number(process.env.AI_API_TIMEOUT_MS) || 10000,
};


export default env;
