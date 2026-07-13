import mongoose from 'mongoose';

const aiReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recommendedStudyMinutes: {
      type: Number,
      default: null,
    },
    goalAchievability: {
      // 목표 달성 가능성 (0~100 %)
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    weakSubjects: {
      type: [String],
      default: [],
    },
    strongSubjects: {
      type: [String],
      default: [],
    },
    recommendedReviewSubjects: {
      type: [String],
      default: [],
    },
    recommendedOrder: {
      // 추천 공부 순서 (과목명을 순서대로 배열에 저장)
      type: [String],
      default: [],
    },
    reason: {
      // 추천 이유 (AI 서버가 생성한 설명 텍스트)
      type: String,
      default: '',
    },
    // --- 10단계 추가: FastAPI 예측 응답 상세 ---
    goalProbabilityLevel: {
      // 목표 달성 확률 구간 (very_high, high, medium, low, very_low)
      type: String,
      enum: ['very_high', 'high', 'medium', 'low', 'very_low'],
      default: null,
    },
    recommendedSubject: {
      // AI가 추천한 집중 공부 과목
      type: String,
      default: null,
    },
    recommendedReviewSubject: {
      // AI가 추천한 복습 과목
      type: String,
      default: null,
    },
    analyzedAt: {
      type: Date,
      default: Date.now,
    },
    // --- 11단계 추가: curriculum_engine / ebs_engine 결과 ---
    curriculum: {
      // 과목별 오늘 학습 순서/배분 시간 (FastAPI curriculum_engine 결과 그대로 저장)
      type: [
        {
          _id: false,
          order: Number,
          subject: String,
          subjectLabel: String,
          allocatedMinutes: Number,
          focus: String,
        },
      ],
      default: [],
    },
    ebsRecommendations: {
      // 규칙기반 EBS 강의 카테고리 추천 (실제 강의 URL/제목 아님)
      type: [
        {
          _id: false,
          subject: String,
          subjectLabel: String,
          category: String,
          reason: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

aiReportSchema.index({ userId: 1, analyzedAt: -1 });

const AiReport = mongoose.model('AiReport', aiReportSchema, 'ai_reports');

export default AiReport;
