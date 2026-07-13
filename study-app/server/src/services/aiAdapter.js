import mongoose from 'mongoose';
import StudyRecord from '../models/StudyRecord.js';
import StudyPlan from '../models/StudyPlan.js';
import WeeklyTest from '../models/WeeklyTest.js';
import MockExamResult from '../models/MockExamResult.js';

/**
 * 웹서비스 MongoDB 데이터 -> AI 모델(FastAPI, UCI Student Performance 스키마) 입력 변환기.
 *
 * UCI 데이터셋에는 "하루 공부시간/목표 공부시간/과목별 미니테스트 점수" 같은 컬럼이 없으므로,
 * README(aimodel/README.md)에 명시된 대로 실제 CSV에서 검증 가능한 컬럼만 사용한다.
 * 웹서비스가 가진 시계열 데이터(공부 기록/계획/시험 점수)는 아래 규칙으로 근사 매핑한다.
 *
 *  - studytime (1~4): 최근 7일간 해당 과목 실제 공부 총 시간(분)을 UCI 구간으로 환산
 *      1: <2시간(120분), 2: 2~5시간, 3: 5~10시간, 4: >10시간
 *  - absences: 최근 30일간 해당 과목의 "미완료 학습 계획" 개수 (결석의 대리 지표로 사용)
 *  - G1/G2 (0~20): 주간 미니테스트 점수(0~100)를 앞/뒤 절반으로 나눠 평균 낸 뒤 20점 만점으로 환산.
 *      미니테스트 기록이 없으면 모의고사 점수(percentile 없을 시 score를 100점 만점으로 가정)로 대체하고,
 *      그마저 없으면 중립값 10점을 사용한다 (모델이 극단적으로 편향되지 않도록).
 *  - G3: 예측 대상이므로 보내지 않는다 (FastAPI가 결측 시 0으로 채우고 예측에는 사용하지 않음).
 *  - 나머지 인구통계 필드(school, sex, age, ... romantic)는 StudentProfileForm에서 사용자가
 *    직접 입력한 값을 그대로 사용한다 (웹서비스 DB에 없는 정보이기 때문).
 */

const STUDYTIME_BUCKETS = [
  { max: 120, value: 1 },
  { max: 300, value: 2 },
  { max: 600, value: 3 },
  { max: Infinity, value: 4 },
];

const minutesToStudytime = (minutes) =>
  STUDYTIME_BUCKETS.find((bucket) => minutes < bucket.max)?.value ?? 4;

const scoreToGrade20 = (score /* 0~100 */) =>
  Math.max(0, Math.min(20, Math.round((score / 100) * 20)));

const average = (numbers) =>
  numbers.length ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : null;

/**
 * 점수 배열(시간순 정렬됨)을 앞/뒤 절반으로 나눠 G1, G2(0~20)를 계산한다.
 */
const splitIntoG1G2 = (chronologicalScores) => {
  if (chronologicalScores.length === 0) return { G1: null, G2: null };
  if (chronologicalScores.length === 1) {
    const g = scoreToGrade20(chronologicalScores[0]);
    return { G1: g, G2: g };
  }

  const mid = Math.ceil(chronologicalScores.length / 2);
  const firstHalf = chronologicalScores.slice(0, mid);
  const secondHalf = chronologicalScores.slice(mid);

  return {
    G1: scoreToGrade20(average(firstHalf)),
    G2: scoreToGrade20(average(secondHalf.length ? secondHalf : firstHalf)),
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 사용자가 최근 활동한 과목 목록을 구한다 (공부 기록 우선, 없으면 학습 계획 기준).
 */
const resolveSubjects = async (userId, sinceRecords) => {
  const fromRecords = await StudyRecord.distinct('subject', {
    userId,
    date: { $gte: sinceRecords },
  });
  if (fromRecords.length > 0) return fromRecords;

  const fromPlans = await StudyPlan.distinct('subject', { userId });
  return fromPlans;
};

/**
 * userId + StudentProfileForm에서 받은 인구통계 profile을 받아
 * FastAPI /api/predict가 요구하는 records 배열을 만든다.
 */
export const buildPredictionRecords = async (userId, profile) => {
  const objectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * DAY_MS);
  const last30Days = new Date(now.getTime() - 30 * DAY_MS);
  const last60Days = new Date(now.getTime() - 60 * DAY_MS);

  const subjects = await resolveSubjects(objectId, last60Days);

  if (subjects.length === 0) {
    const error = new Error(
      '분석할 학습 기록이 없습니다. 먼저 공부 계획이나 기록을 추가해 주세요.'
    );
    error.statusCode = 422;
    throw error;
  }

  const records = await Promise.all(
    subjects.map(async (subject) => {
      const [recentMinutesAgg, incompletePlanCount, weeklyTests, mockExams] = await Promise.all([
        StudyRecord.aggregate([
          { $match: { userId: objectId, subject, date: { $gte: last7Days } } },
          { $group: { _id: null, total: { $sum: '$actualMinutes' } } },
        ]),
        StudyPlan.countDocuments({
          userId: objectId,
          subject,
          planDate: { $gte: last30Days },
          isCompleted: false,
        }),
        WeeklyTest.find({ userId: objectId, subject }).sort({ testDate: 1 }).lean(),
        MockExamResult.find({ userId: objectId, subject }).sort({ examDate: 1 }).lean(),
      ]);

      const weeklyMinutes = recentMinutesAgg[0]?.total ?? 0;

      let { G1, G2 } = splitIntoG1G2(weeklyTests.map((t) => t.score));
      if (G1 === null) {
        ({ G1, G2 } = splitIntoG1G2(mockExams.map((m) => m.score)));
      }
      if (G1 === null) {
        G1 = 10;
        G2 = 10;
      }

      return {
        subject,
        ...profile,
        studytime: minutesToStudytime(weeklyMinutes),
        absences: Math.min(incompletePlanCount, 93),
        G1,
        G2,
      };
    })
  );

  return records;
};
