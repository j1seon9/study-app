import axiosInstance from './axiosInstance.js';

/**
 * GET /api/stats?range=week|month&date=YYYY-MM-DD
 */
export const fetchStats = async (params = {}) => {
  const res = await axiosInstance.get('/stats', { params });
  return res.data.data;
};
