import { body, param, query } from 'express-validator';

const PRIORITY_VALUES = ['high', 'medium', 'low'];

export const planIdValidator = [
  param('id').isMongoId().withMessage('올바르지 않은 계획 ID입니다.'),
];

export const createPlanValidator = [
  body('subject').trim().notEmpty().withMessage('과목은 필수입니다.'),
  body('targetMinutes')
    .isInt({ min: 1 })
    .withMessage('목표 시간(분)은 1 이상의 숫자여야 합니다.'),
  body('priority')
    .optional()
    .isIn(PRIORITY_VALUES)
    .withMessage('우선순위는 high, medium, low 중 하나여야 합니다.'),
  body('planDate').isISO8601().withMessage('계획 날짜 형식이 올바르지 않습니다.'),
];

export const updatePlanValidator = [
  ...planIdValidator,
  body('subject').optional().trim().notEmpty().withMessage('과목은 빈 값일 수 없습니다.'),
  body('targetMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('목표 시간(분)은 1 이상의 숫자여야 합니다.'),
  body('priority')
    .optional()
    .isIn(PRIORITY_VALUES)
    .withMessage('우선순위는 high, medium, low 중 하나여야 합니다.'),
  body('planDate').optional().isISO8601().withMessage('계획 날짜 형식이 올바르지 않습니다.'),
  body('isCompleted').optional().isBoolean().withMessage('완료 여부는 true/false여야 합니다.'),
];

export const listPlansValidator = [
  query('date').optional().isISO8601().withMessage('date 형식이 올바르지 않습니다.'),
  query('from').optional().isISO8601().withMessage('from 형식이 올바르지 않습니다.'),
  query('to').optional().isISO8601().withMessage('to 형식이 올바르지 않습니다.'),
];
