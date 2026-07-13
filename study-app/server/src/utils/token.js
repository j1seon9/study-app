import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Access Token 생성 (짧은 수명, 응답 바디로만 전달)
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
};

/**
 * Refresh Token 생성
 * - jti(고유 식별자)를 포함시켜 DB에 저장된 토큰과 매칭할 수 있게 한다.
 * - 만료 시각을 함께 반환해 RefreshToken 문서의 expiresAt(TTL 인덱스)에 사용한다.
 */
export const generateRefreshToken = (userId) => {
  const jti = crypto.randomUUID();

  const token = jwt.sign({ sub: userId, jti }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });

  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  return { token, expiresAt };
};

/**
 * Refresh Token 검증
 * 실패 시 예외를 던진다 (컨트롤러에서 try/catch로 처리)
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwtRefreshSecret);
};

/**
 * Access Token 검증
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};
