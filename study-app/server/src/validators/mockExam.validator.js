import { body, param, query } from 'express-validator';

export const mockExamIdValidator = [
  param('id').isMongoId().withMessage('올바르지 않은 모의고사 기록 ID입니다.'),
];

const weakQuestionsRule = body('weakQuestions')
  .optional({ nullable: true })
  .isArray()
  .withMessage('보충학습 문항 번호는 배열이어야 합니다.')
  .custom((arr) => arr.every((n) => Number.isInteger(n) && n > 0))
  .withMessage('보충학습 문항 번호는 1 이상의 정수여야 합니다.');

export const createMockExamValidator = [
  body('examName').optional().trim(),
  body('subject').trim().notEmpty().withMessage('과목은 필수입니다.'),
  body('rawScore').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('원점수는 0 이상의 숫자여야 합니다.'),
  body('score').isFloat({ min: 0 }).withMessage('점수는 0 이상의 숫자여야 합니다.'),
  body('grade').optional({ nullable: true }).isInt({ min: 1, max: 9 }).withMessage('등급은 1~9 사이여야 합니다.'),
  body('percentile')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('백분위는 0~100 사이여야 합니다.'),
  weakQuestionsRule,
  body('examDate').isISO8601().withMessage('시험 날짜 형식이 올바르지 않습니다.'),
];

export const updateMockExamValidator = [
  ...mockExamIdValidator,
  body('examName').optional().trim(),
  body('subject').optional().trim().notEmpty().withMessage('과목은 빈 값일 수 없습니다.'),
  body('rawScore').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('원점수는 0 이상의 숫자여야 합니다.'),
  body('score').optional().isFloat({ min: 0 }).withMessage('점수는 0 이상의 숫자여야 합니다.'),
  body('grade').optional({ nullable: true }).isInt({ min: 1, max: 9 }).withMessage('등급은 1~9 사이여야 합니다.'),
  body('percentile')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('백분위는 0~100 사이여야 합니다.'),
  weakQuestionsRule,
  body('examDate').optional().isISO8601().withMessage('시험 날짜 형식이 올바르지 않습니다.'),
];

export const listMockExamsValidator = [
  query('from').optional().isISO8601().withMessage('from 형식이 올바르지 않습니다.'),
  query('to').optional().isISO8601().withMessage('to 형식이 올바르지 않습니다.'),
  query('subject').optional().trim(),
];

/**
 * POST /api/mock-exams/bulk
 * 성적표 사진 한 장에서 인식된 여러 과목을 한 번에 저장할 때 사용한다.
 */
export const bulkCreateMockExamValidator = [
  body('examName').optional().trim(),
  body('examDate').isISO8601().withMessage('시험 날짜 형식이 올바르지 않습니다.'),
  body('results').isArray({ min: 1 }).withMessage('저장할 과목이 1개 이상 필요합니다.'),
  body('results.*.subject').trim().notEmpty().withMessage('과목은 필수입니다.'),
  body('results.*.rawScore')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('원점수는 0 이상의 숫자여야 합니다.'),
  body('results.*.score').isFloat({ min: 0 }).withMessage('점수는 0 이상의 숫자여야 합니다.'),
  body('results.*.grade')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 9 })
    .withMessage('등급은 1~9 사이여야 합니다.'),
  body('results.*.percentile')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('백분위는 0~100 사이여야 합니다.'),
  body('results.*.weakQuestions')
    .optional({ nullable: true })
    .isArray()
    .withMessage('보충학습 문항 번호는 배열이어야 합니다.'),
];
