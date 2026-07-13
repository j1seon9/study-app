import { Router } from 'express';
import {
  createAiReport,
  getAiReports,
  getLatestAiReport,
  deleteAiReport,
  getAiServiceHealth,
} from '../controllers/ai.controller.js';
import { createAiReportValidator, aiReportIdValidator } from '../validators/ai.validator.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/health', getAiServiceHealth);

router.get('/reports', getAiReports);
router.get('/reports/latest', getLatestAiReport);
router.post('/reports', createAiReportValidator, validate, createAiReport);
router.delete('/reports/:id', aiReportIdValidator, validate, deleteAiReport);

export default router;
