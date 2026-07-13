import mongoose from 'mongoose';

const studyRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    planId: {
      // 어떤 공부 계획에 대한 실제 기록인지 (선택적 연결)
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan',
      default: null,
    },
    subject: {
      type: String,
      required: [true, '과목은 필수입니다.'],
      trim: true,
    },
    actualMinutes: {
      type: Number,
      required: [true, '실제 공부시간(분)은 필수입니다.'],
      min: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    focusLevel: {
      // 집중도 1~5점
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    memo: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    date: {
      type: Date,
      required: [true, '날짜는 필수입니다.'],
    },
  },
  { timestamps: true }
);

// 통계 페이지(일/주/월별 공부시간)에서 자주 사용되는 조회 패턴에 맞춘 인덱스
studyRecordSchema.index({ userId: 1, date: -1 });
studyRecordSchema.index({ userId: 1, subject: 1 });

const StudyRecord = mongoose.model('StudyRecord', studyRecordSchema, 'study_records');

export default StudyRecord;
