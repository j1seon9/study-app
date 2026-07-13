import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import { issueTokenPair, rotateRefreshToken, revokeRefreshToken } from '../services/auth.service.js';
import { verifyRefreshToken } from '../utils/token.js';
import { getRefreshCookieOptions, REFRESH_COOKIE_NAME } from '../utils/cookieOptions.js';

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, name, grade } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '이미 가입된 이메일입니다.',
      });
    }

    // User 모델의 pre-save 훅에서 비밀번호가 자동으로 bcrypt 해싱됨
    const user = await User.create({ email, password, name, grade });

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: { id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // password 필드는 select: false 이므로 명시적으로 포함해서 조회
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    const { accessToken, refreshToken, refreshExpiresAt } = await issueTokenPair(user._id);

    const maxAgeMs = refreshExpiresAt.getTime() - Date.now();
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(maxAgeMs));

    res.status(200).json({
      success: true,
      message: '로그인되었습니다.',
      data: {
        accessToken,
        user: { id: user._id, email: user.email, name: user.name },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * 쿠키의 Refresh Token을 검증하고, 새 Access/Refresh Token 쌍을 발급한다 (회전).
 */
export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh Token이 없습니다. 다시 로그인해주세요.',
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions(0));
      return res.status(401).json({
        success: false,
        message: 'Refresh Token이 유효하지 않거나 만료되었습니다. 다시 로그인해주세요.',
      });
    }

    // DB에 저장된 토큰인지 확인 (로그아웃되었거나 이미 회전된 토큰은 재사용 불가)
    const storedToken = await RefreshToken.findOne({ token });
    if (!storedToken) {
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions(0));
      return res.status(401).json({
        success: false,
        message: '이미 사용되었거나 폐기된 토큰입니다. 다시 로그인해주세요.',
      });
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshExpiresAt,
    } = await rotateRefreshToken(token, decoded.sub);

    const maxAgeMs = refreshExpiresAt.getTime() - Date.now();
    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getRefreshCookieOptions(maxAgeMs));

    res.status(200).json({
      success: true,
      message: 'Access Token이 재발급되었습니다.',
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME];

    if (token) {
      await revokeRefreshToken(token);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions(0));

    res.status(200).json({
      success: true,
      message: '로그아웃되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};
