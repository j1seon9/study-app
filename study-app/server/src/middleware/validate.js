import { validationResult } from 'express-validator';

/**
 * express-validator의 검증 결과를 확인하고,
 * 오류가 있으면 400 응답으로 즉시 반환한다.
 * 모든 validator 배열 뒤에 이 미들웨어를 붙여서 사용한다.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '입력값이 올바르지 않습니다.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  next();
};
