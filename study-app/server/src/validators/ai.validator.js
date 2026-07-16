import { body, param } from 'express-validator';

/**
 * AI 개인정보 및 데이터 수집 정책에 따라 리포트 생성 요청은 어떤 개인정보도
 * 받지 않는다 (요청 본문이 필요 없음). 검증할 입력 필드가 없으므로 빈 배열이다 —
 * ai.controller.js가 웹서비스에 쌓인 학습 데이터만으로 리포트를 생성한다.
 */
export const createAiReportValidator = [];

const ocrResultRowValidator = [
  body('results.*.subject').trim().notEmpty().withMessage('과목명은 필수입니다.'),
  body('results.*.grade')
    .isInt({ min: 1, max: 9 })
    .withMessage('등급은 1~9 사이 정수여야 합니다.'),
  body('results.*.percentile')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('백분위는 0~100 사이여야 합니다.'),
  body('results.*.weakQuestions')
    .optional()
    .isArray()
    .withMessage('weakQuestions는 배열이어야 합니다.'),
  body('results.*.weakQuestions.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('오답 문항 번호는 1 이상의 정수여야 합니다.'),
];

/**
 * POST /api/ai/reports/ocr
 * - body.results가 있으면 OCR 직후 전달된 성적표 데이터를 사용한다.
 * - body가 비어 있으면 DB에 저장된 최신 모의고사(성적표) 기록을 사용한다.
 */
export const createOcrAiReportValidator = [
  body('results').optional().isArray({ min: 1 }).withMessage('results는 최소 1개 과목이 필요합니다.'),
  body('examDate').optional().isISO8601().withMessage('examDate는 유효한 날짜여야 합니다.'),
  ...ocrResultRowValidator,
];

export const aiReportIdValidator = [
  param('id').isMongoId().withMessage('올바르지 않은 AI 리포트 ID입니다.'),
];
