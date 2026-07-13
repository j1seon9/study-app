import { Router } from 'express';
import {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
} from '../controllers/record.controller.js';
import {
  createRecordValidator,
  updateRecordValidator,
  listRecordsValidator,
  recordIdValidator,
} from '../validators/record.validator.js';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// 이 라우터의 모든 API는 로그인이 필요하다.
router.use(protect);

router.get('/', listRecordsValidator, validate, getRecords);
router.get('/:id', recordIdValidator, validate, getRecordById);
router.post('/', createRecordValidator, validate, createRecord);
router.put('/:id', updateRecordValidator, validate, updateRecord);
router.delete('/:id', recordIdValidator, validate, deleteRecord);

export default router;
