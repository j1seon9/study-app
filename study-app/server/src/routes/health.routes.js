import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /api/health
 * 서버 및 DB 연결 상태 확인용 (헬스체크)
 */
router.get('/', (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    message: '서버가 정상적으로 동작 중입니다.',
    dbState: dbStateMap[mongoose.connection.readyState],
    timestamp: new Date().toISOString(),
  });
});

export default router;
