import axiosInstance from './axiosInstance.js';

/**
 * AI 리포트를 생성한다. 웹서비스에 쌓인 학습 데이터(공부 계획/기록/미니테스트/
 * 모의고사)만 서버에서 사용하며, 어떤 개인정보도 요청 본문에 포함하지 않는다.
 */
export const createAiReport = async () => {
  const res = await axiosInstance.post('/ai/reports');
  return res.data.data;
};

/**
 * OCR 성적표 데이터(또는 저장된 모의고사 기록)로 AI 리포트를 생성한다.
 * @param {{ results?: Array, examDate?: string }} [payload]
 */
export const createOcrAiReport = async (payload = {}) => {
  const res = await axiosInstance.post('/ai/reports/ocr', payload);
  return res.data.data;
};

export const fetchAiReports = async () => {
  const res = await axiosInstance.get('/ai/reports');
  return res.data.data;
};

export const fetchLatestAiReport = async () => {
  const res = await axiosInstance.get('/ai/reports/latest');
  return res.data.data;
};

export const deleteAiReport = async (id) => {
  const res = await axiosInstance.delete(`/ai/reports/${id}`);
  return res.data;
};

export const fetchAiServiceHealth = async () => {
  const res = await axiosInstance.get('/ai/health');
  return res.data.data;
};
