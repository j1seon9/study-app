import axiosInstance from './axiosInstance.js';

/**
 * 공부 계획 관련 API 호출 함수 모음
 * 모든 응답은 { success, message, data } 형태이며, 여기서는 data만 반환한다.
 */

export const fetchPlans = async (params = {}) => {
  const res = await axiosInstance.get('/plans', { params });
  return res.data.data;
};

export const createPlan = async (payload) => {
  const res = await axiosInstance.post('/plans', payload);
  return res.data.data;
};

export const updatePlan = async (id, payload) => {
  const res = await axiosInstance.put(`/plans/${id}`, payload);
  return res.data.data;
};

export const togglePlanComplete = async (id) => {
  const res = await axiosInstance.patch(`/plans/${id}/toggle`);
  return res.data.data;
};

export const deletePlan = async (id) => {
  const res = await axiosInstance.delete(`/plans/${id}`);
  return res.data;
};
