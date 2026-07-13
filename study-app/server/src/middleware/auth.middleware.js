import { verifyAccessToken } from '../utils/token.js';

/**
 * 인증이 필요한 API를 보호하는 미들웨어
 * - Authorization: Bearer <accessToken> 헤더를 검사한다.
 * - 검증 성공 시 req.userId에 사용자 ID를 담아 다음 핸들러로 전달한다.
 */
export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 필요합니다.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.userId = decoded.sub;
    next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Access Token이 만료되었습니다.'
        : '유효하지 않은 토큰입니다.';

    return res.status(401).json({ success: false, message });
  }
};
