import env from '../config/env.js';

/**
 * FastAPI AI 마이크로서비스(aiproject) 호출 전용 클라이언트.
 * - 네트워크 실패/서비스 다운은 503으로, AI 서버가 반환한 4xx 검증 오류는 400으로 매핑한다.
 * - AI 서버가 API Key를 요구하는 경우 X-API-Key 헤더를 함께 보낸다.
 */

class AiServiceError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'AiServiceError';
    this.statusCode = statusCode;
  }
}

const buildHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (env.aiApiKey) {
    headers['X-API-Key'] = env.aiApiKey;
  }
  return headers;
};

const request = async (path, options = {}) => {
  const url = `${env.aiApiUrl}${path}`;
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: { ...buildHeaders(), ...(options.headers ?? {}) },
      signal: AbortSignal.timeout(env.aiApiTimeoutMs),
    });
  } catch (error) {
    throw new AiServiceError(
      `AI 서버(${url})에 연결할 수 없습니다: ${error.message}`,
      503
    );
  }

  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const detail = body?.detail ?? `AI 서버 오류 (status ${response.status})`;
    // AI 서버의 4xx(검증 오류)는 400으로, 5xx는 502로 그대로 전달한다.
    const statusCode = response.status >= 500 ? 502 : 400;
    throw new AiServiceError(
      typeof detail === 'string' ? detail : JSON.stringify(detail),
      statusCode
    );
  }

  return body;
};

/**
 * GET /health — AI 서버 및 모델 아티팩트 상태 확인
 */
export const checkAiHealth = () => request('/health', { method: 'GET' });

/**
 * GET /api/metadata — 최근 학습 메타데이터 조회
 */
export const getAiMetadata = () => request('/api/metadata', { method: 'GET' });

/**
 * POST /api/predict — 과목별 레코드 배열을 넘기고 추천 결과 하나를 받는다.
 */
export const predictStudyReport = (records) =>
  request('/api/predict', {
    method: 'POST',
    body: JSON.stringify({ records }),
  });

/**
 * POST /api/ocr-recommend — OCR 성적표 데이터 기반 규칙 추천.
 * 응답 스키마는 /api/predict 와 동일하다.
 */
export const predictOcrStudyReport = (records) =>
  request('/api/ocr-recommend', {
    method: 'POST',
    body: JSON.stringify({ records }),
  });

export { AiServiceError };
