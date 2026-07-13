import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axiosInstance, { setAccessToken as setAxiosAccessToken, setOnUnauthorized } from '../api/axiosInstance.js';

const AuthContext = createContext(null);

/**
 * 인증 상태 관리
 * - accessToken은 React state(메모리)에만 보관한다. (localStorage 사용 금지 - XSS 대비)
 * - axiosInstance 모듈의 accessToken 변수와 항상 동기화한다.
 * - 새로고침 시에는 /api/auth/refresh를 호출해 httpOnly 쿠키의 Refresh Token으로
 *   새 Access Token을 다시 받아온다.
 */
export function AuthProvider({ children }) {
  const [accessToken, setAccessTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAccessToken = useCallback((token) => {
    setAccessTokenState(token);
    setAxiosAccessToken(token);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const res = await axiosInstance.post('/auth/login', { email, password });
      setAccessToken(res.data.data.accessToken);
      setUser(res.data.data.user);
      return res.data.data.user;
    },
    [setAccessToken]
  );

  const logout = useCallback(async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, [setAccessToken]);

  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await axiosInstance.post('/auth/refresh');
      setAccessToken(res.data.data.accessToken);
      return res.data.data.accessToken;
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      return null;
    }
  }, [setAccessToken]);

  // 앱 최초 로드 시, 쿠키가 유효하면 Access Token을 자동으로 복구
  useEffect(() => {
    setOnUnauthorized(() => {
      setAccessTokenState(null);
      setUser(null);
    });

    (async () => {
      await refreshAccessToken();
      setIsLoading(false);
    })();
  }, [refreshAccessToken]);

  return (
    <AuthContext.Provider value={{ accessToken, user, isLoading, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
