import { Router } from 'express';
import { getStats } from '../controllers/stats.controller.js';
import { statsQueryValidator } from '../validators/stats.validator.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', statsQueryValidator, validate, getStats);

export default router;
