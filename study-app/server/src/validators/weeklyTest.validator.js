import { body, param, query } from 'express-validator';

export const weeklyTestIdValidator = [
  param('id').isMongoId().withMessage('올바르지 않은 테스트 ID입니다.'),
];

export const createWeeklyTestValidator = [
  body('subject').trim().notEmpty().withMessage('과목은 필수입니다.'),
  body('score').isInt({ min: 0, max: 100 }).withMessage('점수는 0~100 사이의 숫자여야 합니다.'),
  body('wrongCount').optional().isInt({ min: 0 }).withMessage('오답 개수는 0 이상의 숫자여야 합니다.'),
  body('testDate').isISO8601().withMessage('테스트 날짜 형식이 올바르지 않습니다.'),
];

export const updateWeeklyTestValidator = [
  ...weeklyTestIdValidator,
  body('subject').optional().trim().notEmpty().withMessage('과목은 빈 값일 수 없습니다.'),
  body('score').optional().isInt({ min: 0, max: 100 }).withMessage('점수는 0~100 사이의 숫자여야 합니다.'),
  body('wrongCount').optional().isInt({ min: 0 }).withMessage('오답 개수는 0 이상의 숫자여야 합니다.'),
  body('testDate').optional().isISO8601().withMessage('테스트 날짜 형식이 올바르지 않습니다.'),
];

export const listWeeklyTestsValidator = [
  query('from').optional().isISO8601().withMessage('from 형식이 올바르지 않습니다.'),
  query('to').optional().isISO8601().withMessage('to 형식이 올바르지 않습니다.'),
  query('subject').optional().trim(),
];
