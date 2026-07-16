import AiReport from '../models/AiReport.js';
import MockExamResult from '../models/MockExamResult.js';
import { buildPredictionRecords } from '../services/aiAdapter.js';
import { checkAiHealth, predictOcrStudyReport, predictStudyReport } from '../services/aiClient.js';
import {
  buildOcrRecords,
  buildOcrRecordsFromMockExams,
} from '../services/ocrAdapter.js';

/**
 * 개인정보 최소 수집 정책(AI 개인정보 및 데이터 수집 정책 문서)에 따라
 * 학생에게 어떤 설문도 요청하지 않는다. AI 모델(UCI 스키마) 입력에 필요하지만
 * 정책상 수집 대상이 아닌 인구통계 필드는 모두 고정된 중립값을 사용한다.
 * 이 값들은 특정 학생의 실제 정보가 아니라 모든 사용자에게 동일하게 적용되는
 * 모델 입력용 상수이므로 개인정보 수집에 해당하지 않는다.
 * models/feature_importance.csv 기준으로도 이 필드들의 예측 기여도는
 * 합쳐서 10% 미만이라, 실제 정확도 손실도 크지 않다.
 * (aimodel/ai/dataset_builder.py의 PLACEHOLDER_PROFILE과 동일한 값을 사용해
 * 예측 시점과 재학습 시점의 "모를 때 기본값" 처리를 통일했다.)
 */
const NEUTRAL_PROFILE = {
  school: 'GP',
  sex: 'F',
  age: 17,
  address: 'U',
  famsize: 'GT3',
  Pstatus: 'T',
  Medu: 3,
  Fedu: 3,
  Mjob: 'other',
  Fjob: 'other',
  reason: 'course',
  guardian: 'mother',
  traveltime: 1,
  failures: 0,
  schoolsup: 'no',
  famsup: 'yes',
  paid: 'no',
  activities: 'yes',
  nursery: 'yes',
  higher: 'yes',
  internet: 'yes',
  romantic: 'no',
  famrel: 4,
  freetime: 3,
  goout: 3,
  Dalc: 1,
  Walc: 1,
  health: 4,
};

/**
 * 예측 결과를 바탕으로 recommendedOrder(공부 추천 순서)를 만든다.
 * AI 서버가 순서 배열까지 주지 않으므로, 취약 과목을 우선하고
 * 추천 집중 과목 -> 복습 과목 -> 강점 과목 순으로 정렬한 목록을 만든다.
 */
const buildRecommendedOrder = (prediction) => {
  const order = [
    prediction.weak_subject,
    prediction.recommended_subject,
    prediction.recommended_review_subject,
    prediction.strong_subject,
  ].filter((subject, index, arr) => subject && arr.indexOf(subject) === index);

  return order;
};

const saveAiReportFromPrediction = async (userId, prediction) =>
  AiReport.create({
    userId,
    recommendedStudyMinutes: prediction.recommended_study_time_minutes_per_day,
    goalAchievability: Math.round(prediction.goal_achievement_probability * 100),
    weakSubjects: prediction.weak_subject ? [prediction.weak_subject] : [],
    strongSubjects: prediction.strong_subject ? [prediction.strong_subject] : [],
    recommendedReviewSubjects: prediction.recommended_review_subject
      ? [prediction.recommended_review_subject]
      : [],
    recommendedOrder: buildRecommendedOrder(prediction),
    reason: prediction.reason ?? '',
    goalProbabilityLevel: prediction.goal_probability_level ?? null,
    recommendedSubject: prediction.recommended_subject ?? null,
    recommendedReviewSubject: prediction.recommended_review_subject ?? null,
    curriculum: (prediction.curriculum ?? []).map((item) => ({
      order: item.order,
      subject: item.subject,
      subjectLabel: item.subject_label,
      allocatedMinutes: item.allocated_minutes,
      focus: item.focus,
    })),
    ebsRecommendations: (prediction.ebs_recommendations ?? []).map((item) => ({
      subject: item.subject,
      subjectLabel: item.subject_label,
      category: item.category,
      reason: item.reason,
    })),
    analyzedAt: new Date(),
  });

const resolveOcrRecordsForUser = async (userId, body = {}) => {
  if (Array.isArray(body.results) && body.results.length > 0) {
    return buildOcrRecords(body.results);
  }

  const latestExam = await MockExamResult.findOne({ userId })
    .sort({ examDate: -1, createdAt: -1 })
    .select('examDate');

  if (!latestExam) {
    throw new Error('OCR 추천을 위해 저장된 모의고사(성적표) 기록이 필요합니다.');
  }

  const targetDate = body.examDate ? new Date(body.examDate) : latestExam.examDate;
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const currentExams = await MockExamResult.find({
    userId,
    examDate: { $gte: dayStart, $lt: dayEnd },
  }).sort({ subject: 1 });

  if (currentExams.length === 0) {
    throw new Error('선택한 시험 날짜에 해당하는 모의고사 기록이 없습니다.');
  }

  const previousExams = await MockExamResult.find({
    userId,
    examDate: { $lt: dayStart },
  }).sort({ examDate: -1, createdAt: -1 });

  return buildOcrRecordsFromMockExams(currentExams, previousExams);
};

/**
 * POST /api/ai/reports
 * 웹서비스에 쌓인 학습 데이터(공부 계획/기록/미니테스트/모의고사)만으로
 * FastAPI 예측 서버를 호출하고, 결과를 AiReport로 저장한다.
 * 학생에게 어떤 개인정보도 요청하지 않는다 (요청 본문을 사용하지 않음).
 */
export const createAiReport = async (req, res, next) => {
  try {
    const records = await buildPredictionRecords(req.userId, NEUTRAL_PROFILE);
    const prediction = await predictStudyReport(records);

    const report = await saveAiReportFromPrediction(req.userId, prediction);

    res.status(201).json({
      success: true,
      message: 'AI 학습 리포트가 생성되었습니다.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ai/reports/ocr
 * OCR로 읽은 성적표(또는 저장된 모의고사 기록)를 FastAPI /api/ocr-recommend에 전달해
 * 규칙 기반 학습 추천 리포트를 생성한다.
 *
 * 요청 본문 예시 (OCR 직후, mock-exams 저장 전에도 호출 가능):
 * {
 *   "results": [
 *     { "subject": "국어", "grade": 2, "percentile": 88.5, "weakQuestions": [3, 12] },
 *     { "subject": "수학", "grade": 5, "percentile": 61.0, "weakQuestions": [9, 16] }
 *   ]
 * }
 *
 * 본문이 비어 있으면 DB에 저장된 최신 시험일의 모의고사 기록을 자동으로 사용한다.
 */
export const createOcrAiReport = async (req, res, next) => {
  try {
    const ocrRecords = await resolveOcrRecordsForUser(req.userId, req.body ?? {});
    const prediction = await predictOcrStudyReport(ocrRecords);
    const report = await saveAiReportFromPrediction(req.userId, prediction);

    res.status(201).json({
      success: true,
      message: 'OCR 성적표 기반 AI 학습 리포트가 생성되었습니다.',
      data: report,
    });
  } catch (error) {
    if (error.message?.includes('OCR 추천') || error.message?.includes('등급')) {
      error.statusCode = 400;
    }
    next(error);
  }
};

/**
 * GET /api/ai/reports
 * 최신순으로 사용자의 AI 리포트 이력을 조회한다.
 */
export const getAiReports = async (req, res, next) => {
  try {
    const reports = await AiReport.find({ userId: req.userId }).sort({ analyzedAt: -1 });

    res.status(200).json({
      success: true,
      message: 'AI 리포트 목록을 조회했습니다.',
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/reports/latest
 */
export const getLatestAiReport = async (req, res, next) => {
  try {
    const report = await AiReport.findOne({ userId: req.userId }).sort({ analyzedAt: -1 });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: '아직 생성된 AI 리포트가 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '최신 AI 리포트를 조회했습니다.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/ai/reports/:id
 */
export const deleteAiReport = async (req, res, next) => {
  try {
    const report = await AiReport.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: '해당 AI 리포트를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'AI 리포트가 삭제되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ai/health
 * 프론트엔드가 AI 서버 연결 상태를 미리 확인할 수 있도록 헬스체크를 프록시한다.
 */
export const getAiServiceHealth = async (req, res, next) => {
  try {
    const health = await checkAiHealth();

    res.status(200).json({
      success: true,
      message: 'AI 서버 상태를 조회했습니다.',
      data: health,
    });
  } catch (error) {
    next(error);
  }
};
