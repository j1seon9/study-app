import env from './config/env.js';
import connectDB from './config/db.js';
import app from './app.js';

/**
 * 서버 시작
 * - 하루 1회 재시작되는 환경이므로, 시작 시 DB 연결부터 안전하게 수행한다.
 * - 예기치 못한 예외 발생 시에도 로그를 남기고 프로세스를 종료해
 *   재시작 스케줄러(예: PM2, systemd)가 다시 살릴 수 있도록 한다.
 */
const startServer = async () => {
  await connectDB();

  const server = app.listen(env.port, () => {
    console.log(`[SERVER] ${env.nodeEnv} 모드로 포트 ${env.port}에서 실행 중입니다.`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('[UNHANDLED REJECTION]', err);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
    process.exit(1);
  });
};

startServer();
