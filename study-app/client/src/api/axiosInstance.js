import axios from 'axios';

/**
 * 공통 Axios 인스턴스
 * - baseURL은 환경변수로 관리한다.
 * - accessToken은 메모리에만 두고, 모듈 스코프 변수로 관리해
 *   AuthContext와 axios 인터셉터가 같은 값을 참조하도록 한다.
 */
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true, // httpOnly 쿠키(Refresh Token)를 주고받기 위해 필수
  timeout: 10000,
});

let accessToken = null;
let onUnauthorized = null; // AuthContext에서 등록: refresh 실패 시 로그아웃 처리용

export const setAccessToken = (token) => {
  accessToken = token;
};

export const setOnUnauthorized = (handler) => {
  onUnauthorized = handler;
};

// 요청 인터셉터: Authorization 헤더 자동 첨부
axiosInstance.interceptors.request.use((config) => {
  if (accessToken && !config.headers.skipAuth) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 응답 인터셉터: Access Token 만료(401) 시 한 번만 자동 재발급 시도
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // 이미 재발급 중이면 대기열에 추가
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axiosInstance.post('/auth/refresh');
        const newToken = res.data.data.accessToken;
        setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

