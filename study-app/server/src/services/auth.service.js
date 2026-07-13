import RefreshToken from '../models/RefreshToken.js';
import { generateAccessToken, generateRefreshToken } from '../utils/token.js';

/**
 * 로그인/재발급 시 Access + Refresh Token 쌍을 생성하고
 * Refresh Token은 DB에 저장한다 (TTL 인덱스로 만료 시 자동 삭제됨).
 */
export const issueTokenPair = async (userId) => {
  const accessToken = generateAccessToken(userId);
  const { token: refreshToken, expiresAt } = generateRefreshToken(userId);

  await RefreshToken.create({
    userId,
    token: refreshToken,
    expiresAt,
  });

  return { accessToken, refreshToken, refreshExpiresAt: expiresAt };
};

/**
 * Refresh Token 회전: 기존 토큰을 DB에서 제거하고 새 토큰을 발급한다.
 */
export const rotateRefreshToken = async (oldToken, userId) => {
  await RefreshToken.deleteOne({ token: oldToken });
  return issueTokenPair(userId);
};

/**
 * 로그아웃: 해당 Refresh Token을 DB에서 제거한다.
 */
export const revokeRefreshToken = async (token) => {
  await RefreshToken.deleteOne({ token });
};
