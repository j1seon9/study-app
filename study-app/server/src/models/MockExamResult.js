import mongoose from 'mongoose';

const mockExamResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    examName: {
      // 시험명 (예: "2026학년도 6월 고2 전국연합학력평가"). 한 번의 시험에서 나온
      // 여러 과목 기록을 한데 묶어 보여줄 때 사용한다. 선택 입력.
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: [true, '과목은 필수입니다.'],
      trim: true,
    },
    rawScore: {
      // 원점수. 표준점수가 없는 절대평가 과목(영어/한국사)에서는 score와 동일한 값이 들어간다.
      type: Number,
      min: 0,
      default: null,
    },
    score: {
      // 대표 점수. 상대평가 과목은 표준점수, 절대평가 과목(영어/한국사)은 원점수를 사용한다.
      type: Number,
      required: [true, '점수는 필수입니다.'],
      min: 0,
    },
    grade: {
      // 등급 (1~9등급)
      type: Number,
      min: 1,
      max: 9,
      default: null,
    },
    percentile: {
      // 백분위
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    weakQuestions: {
      // 보충학습이 필요한 문항 번호 목록
      type: [Number],
      default: [],
    },
    examDate: {
      type: Date,
      required: [true, '시험 날짜는 필수입니다.'],
    },
    // 주의: 원본 이미지는 절대 저장하지 않는다 (OCR은 브라우저에서 처리 후 텍스트 결과만 전달됨)
  },
  { timestamps: true }
);

mockExamResultSchema.index({ userId: 1, examDate: -1 });

const MockExamResult = mongoose.model('MockExamResult', mockExamResultSchema, 'mock_exam_results');

export default MockExamResult;
