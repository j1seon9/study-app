import axiosInstance from './axiosInstance.js';

export const fetchWeeklyTests = async (params = {}) => {
  const res = await axiosInstance.get('/weekly-tests', { params });
  return res.data.data;
};

export const createWeeklyTest = async (payload) => {
  const res = await axiosInstance.post('/weekly-tests', payload);
  return res.data.data;
};

export const updateWeeklyTest = async (id, payload) => {
  const res = await axiosInstance.put(`/weekly-tests/${id}`, payload);
  return res.data.data;
};

export const deleteWeeklyTest = async (id) => {
  const res = await axiosInstance.delete(`/weekly-tests/${id}`);
  return res.data;
};
