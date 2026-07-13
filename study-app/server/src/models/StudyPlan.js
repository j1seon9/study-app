import mongoose from 'mongoose';

const studyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: String,
      required: [true, '과목은 필수입니다.'],
      trim: true,
    },
    targetMinutes: {
      type: Number,
      required: [true, '목표 시간(분)은 필수입니다.'],
      min: 1,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    planDate: {
      type: Date,
      required: [true, '계획 날짜는 필수입니다.'],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// 대시보드/통계에서 "특정 유저의 특정 날짜 계획" 조회가 빈번하므로 복합 인덱스 생성
studyPlanSchema.index({ userId: 1, planDate: -1 });

const StudyPlan = mongoose.model('StudyPlan', studyPlanSchema, 'study_plans');

export default StudyPlan;
