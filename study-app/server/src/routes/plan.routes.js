import { Router } from 'express';
import {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  toggleComplete,
  deletePlan,
} from '../controllers/plan.controller.js';
import {
  createPlanValidator,
  updatePlanValidator,
  listPlansValidator,
  planIdValidator,
} from '../validators/plan.validator.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// 이 라우터의 모든 API는 로그인이 필요하다.
router.use(protect);

router.get('/', listPlansValidator, validate, getPlans);
router.get('/:id', planIdValidator, validate, getPlanById);
router.post('/', createPlanValidator, validate, createPlan);
router.put('/:id', updatePlanValidator, validate, updatePlan);
router.patch('/:id/toggle', planIdValidator, validate, toggleComplete);
router.delete('/:id', planIdValidator, validate, deletePlan);

export default router;
