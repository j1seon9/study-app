import { param } from 'express-validator';

/**
 * AI 개인정보 및 데이터 수집 정책에 따라 리포트 생성 요청은 어떤 개인정보도
 * 받지 않는다 (요청 본문이 필요 없음). 검증할 입력 필드가 없으므로 빈 배열이다 —
 * ai.controller.js가 웹서비스에 쌓인 학습 데이터만으로 리포트를 생성한다.
 */
export const createAiReportValidator = [];

export const aiReportIdValidator = [
  param('id').isMongoId().withMessage('올바르지 않은 AI 리포트 ID입니다.'),
];
