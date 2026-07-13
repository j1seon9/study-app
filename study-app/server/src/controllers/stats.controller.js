import mongoose from 'mongoose';
import StudyRecord from '../models/StudyRecord.js';
import StudyPlan from '../models/StudyPlan.js';

const toDateOnly = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * range와 기준 date로부터 [start, end) 구간을 계산한다.
 * - week: 기준일 포함 최근 7일 (기준일 - 6일 ~ 기준일 다음날)
 * - month: 기준일이 속한 달의 1일 ~ 다음 달 1일
 */
const resolveRange = (range, dateParam) => {
  const reference = toDateOnly(dateParam ? new Date(dateParam) : new Date());

  if (range === 'month') {
    const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
    return { start, end };
  }

  // 기본값: week
  const start = new Date(reference);
  start.setDate(start.getDate() - 6);
  const end = new Date(reference);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

/**
 * [start, end) 구간의 모든 날짜(YYYY-MM-DD)를 채워 넣은 시리즈를 만든다.
 * 기록이 없는 날짜도 0분으로 표시되어야 차트가 끊기지 않는다.
 */
const buildDailySeries = (start, end, aggregatedByDate) => {
  const series = [];
  const cursor = new Date(start);

  while (cursor < end) {
    const key = formatYMD(cursor);
    series.push({
      date: key,
      totalMinutes: aggregatedByDate.get(key)?.totalMinutes ?? 0,
      avgFocusLevel: aggregatedByDate.get(key)?.avgFocusLevel ?? null,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
};

/**
 * GET /api/stats?range=week|month&date=YYYY-MM-DD
 * - range 생략 시 week, date 생략 시 오늘 기준
 */
export const getStats = async (req, res, next) => {
  try {
    const { range = 'week', date } = req.query;
    const { start, end } = resolveRange(range, date);
    const userId = new mongoose.Types.ObjectId(req.userId);

    const [byDate, bySubject, planTotal, planCompleted] = await Promise.all([
      StudyRecord.aggregate([
        { $match: { userId, date: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            totalMinutes: { $sum: '$actualMinutes' },
            avgFocusLevel: { $avg: '$focusLevel' },
          },
        },
      ]),
      StudyRecord.aggregate([
        { $match: { userId, date: { $gte: start, $lt: end } } },
        { $group: { _id: '$subject', totalMinutes: { $sum: '$actualMinutes' } } },
        { $sort: { totalMinutes: -1 } },
      ]),
      StudyPlan.countDocuments({ userId, planDate: { $gte: start, $lt: end } }),
      StudyPlan.countDocuments({ userId, planDate: { $gte: start, $lt: end }, isCompleted: true }),
    ]);

    const byDateMap = new Map(byDate.map((row) => [row._id, row]));
    const dailySeries = buildDailySeries(start, end, byDateMap);

    const totalMinutes = dailySeries.reduce((sum, row) => sum + row.totalMinutes, 0);
    const focusSamples = byDate.filter((row) => row.avgFocusLevel != null);
    const avgFocusLevel = focusSamples.length
      ? Number(
          (
            focusSamples.reduce((sum, row) => sum + row.avgFocusLevel, 0) / focusSamples.length
          ).toFixed(1)
        )
      : null;

    const subjectBreakdown = bySubject.map((row) => ({
      subject: row._id,
      totalMinutes: row.totalMinutes,
    }));

    res.status(200).json({
      success: true,
      message: '통계를 조회했습니다.',
      data: {
        range,
        start: formatYMD(start),
        end: formatYMD(new Date(end.getTime() - 1)),
        totalMinutes,
        avgFocusLevel,
        dailySeries,
        subjectBreakdown,
        planStats: {
          total: planTotal,
          completed: planCompleted,
          rate: planTotal > 0 ? Number(((planCompleted / planTotal) * 100).toFixed(1)) : null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
