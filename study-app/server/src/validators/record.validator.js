import { body, param, query } from 'express-validator';

export const recordIdValidator = [
  param('id').isMongoId().withMessage('올바르지 않은 기록 ID입니다.'),
];

export const createRecordValidator = [
  body('subject').trim().notEmpty().withMessage('과목은 필수입니다.'),
  body('actualMinutes')
    .isInt({ min: 0 })
    .withMessage('실제 공부시간(분)은 0 이상의 숫자여야 합니다.'),
  body('date').isISO8601().withMessage('날짜 형식이 올바르지 않습니다.'),
  body('planId').optional({ nullable: true }).isMongoId().withMessage('올바르지 않은 계획 ID입니다.'),
  body('focusLevel')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('집중도는 1~5 사이의 숫자여야 합니다.'),
  body('memo').optional().isLength({ max: 500 }).withMessage('메모는 500자를 초과할 수 없습니다.'),
  body('isCompleted').optional().isBoolean().withMessage('완료 여부는 true/false여야 합니다.'),
];

export const updateRecordValidator = [
  ...recordIdValidator,
  body('subject').optional().trim().notEmpty().withMessage('과목은 빈 값일 수 없습니다.'),
  body('actualMinutes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('실제 공부시간(분)은 0 이상의 숫자여야 합니다.'),
  body('date').optional().isISO8601().withMessage('날짜 형식이 올바르지 않습니다.'),
  body('planId').optional({ nullable: true }).isMongoId().withMessage('올바르지 않은 계획 ID입니다.'),
  body('focusLevel')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('집중도는 1~5 사이의 숫자여야 합니다.'),
  body('memo').optional().isLength({ max: 500 }).withMessage('메모는 500자를 초과할 수 없습니다.'),
  body('isCompleted').optional().isBoolean().withMessage('완료 여부는 true/false여야 합니다.'),
];

export const listRecordsValidator = [
  query('date').optional().isISO8601().withMessage('date 형식이 올바르지 않습니다.'),
  query('from').optional().isISO8601().withMessage('from 형식이 올바르지 않습니다.'),
  query('to').optional().isISO8601().withMessage('to 형식이 올바르지 않습니다.'),
  query('subject').optional().trim(),
];
