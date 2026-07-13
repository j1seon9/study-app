import axiosInstance from './axiosInstance.js';

export const fetchMockExams = async (params = {}) => {
  const res = await axiosInstance.get('/mock-exams', { params });
  return res.data.data;
};

export const createMockExam = async (payload) => {
  const res = await axiosInstance.post('/mock-exams', payload);
  return res.data.data;
};

/**
 * 성적표 사진 한 장에서 인식된 여러 과목을 한 번에 저장한다.
 * payload: { examName, examDate, results: [{ subject, rawScore, score, grade, percentile, weakQuestions }] }
 */
export const bulkCreateMockExams = async (payload) => {
  const res = await axiosInstance.post('/mock-exams/bulk', payload);
  return res.data.data;
};

export const updateMockExam = async (id, payload) => {
  const res = await axiosInstance.put(`/mock-exams/${id}`, payload);
  return res.data.data;
};

export const deleteMockExam = async (id) => {
  const res = await axiosInstance.delete(`/mock-exams/${id}`);
  return res.data;
};
