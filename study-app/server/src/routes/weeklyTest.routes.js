import { Router } from 'express';
import {
  getWeeklyTests,
  createWeeklyTest,
  updateWeeklyTest,
  deleteWeeklyTest,
} from '../controllers/weeklyTest.controller.js';
import {
  createWeeklyTestValidator,
  updateWeeklyTestValidator,
  listWeeklyTestsValidator,
  weeklyTestIdValidator,
} from '../validators/weeklyTest.validator.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', listWeeklyTestsValidator, validate, getWeeklyTests);
router.post('/', createWeeklyTestValidator, validate, createWeeklyTest);
router.put('/:id', updateWeeklyTestValidator, validate, updateWeeklyTest);
router.delete('/:id', weeklyTestIdValidator, validate, deleteWeeklyTest);

export default router;
