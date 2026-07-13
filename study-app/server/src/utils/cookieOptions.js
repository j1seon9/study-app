import env from '../config/env.js';

/**
 * Refresh Token 쿠키 공통 옵션
 * - httpOnly: JS에서 접근 불가 (XSS 방어)
 * - secure: 운영 환경(HTTPS)에서만 true
 * - sameSite: 'strict' 기본값. 프론트/백엔드가 서로 다른 도메인에 배포된다면
 *   'none'으로 변경하고 secure를 반드시 true로 유지해야 한다.
 */
export const getRefreshCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/api/auth',
  maxAge: maxAgeMs,
});

export const REFRESH_COOKIE_NAME = 'refreshToken';
