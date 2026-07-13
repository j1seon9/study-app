import mongoose from 'mongoose';

const weeklyTestSchema = new mongoose.Schema(
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
    score: {
      type: Number,
      required: [true, '점수는 필수입니다.'],
      min: 0,
      max: 100,
    },
    wrongCount: {
      type: Number,
      required: [true, '오답 개수는 필수입니다.'],
      min: 0,
      default: 0,
    },
    testDate: {
      type: Date,
      required: [true, '테스트 날짜는 필수입니다.'],
    },
  },
  { timestamps: true }
);

weeklyTestSchema.index({ userId: 1, subject: 1, testDate: -1 });

const WeeklyTest = mongoose.model('WeeklyTest', weeklyTestSchema, 'weekly_tests');

export default WeeklyTest;
