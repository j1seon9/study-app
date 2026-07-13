import { Router } from 'express';
import {
  getMockExams,
  createMockExam,
  createMockExamsBulk,
  updateMockExam,
  deleteMockExam,
} from '../controllers/mockExam.controller.js';
import {
  createMockExamValidator,
  updateMockExamValidator,
  listMockExamsValidator,
  mockExamIdValidator,
  bulkCreateMockExamValidator,
} from '../validators/mockExam.validator.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.get('/', listMockExamsValidator, validate, getMockExams);
router.post('/', createMockExamValidator, validate, createMockExam);
// 성적표 사진 한 장에서 인식된 여러 과목을 한 번에 저장 (반드시 /:id 라우트보다 위에 있어야 함)
router.post('/bulk', bulkCreateMockExamValidator, validate, createMockExamsBulk);
router.put('/:id', updateMockExamValidator, validate, updateMockExam);
router.delete('/:id', mockExamIdValidator, validate, deleteMockExam);

export default router;
