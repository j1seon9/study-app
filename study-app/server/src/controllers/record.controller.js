import StudyRecord from '../models/StudyRecord.js';
import StudyPlan from '../models/StudyPlan.js';

/**
 * GET /api/records
 * 쿼리 파라미터:
 * - date: 특정 날짜(YYYY-MM-DD)의 기록만 조회
 * - from, to: 날짜 범위로 조회
 * - subject: 과목명으로 필터 (부분 일치)
 */
export const getRecords = async (req, res, next) => {
  try {
    const { date, from, to, subject } = req.query;

    const filter = { userId: req.userId };

    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.date = { $gte: start, $lt: end };
    } else if (from && to) {
      filter.date = { $gte: new Date(from), $lt: new Date(to) };
    }

    if (subject) {
      filter.subject = { $regex: subject, $options: 'i' };
    }

    const records = await StudyRecord.find(filter).sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: '공부 기록 목록을 조회했습니다.',
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/records/:id
 */
export const getRecordById = async (req, res, next) => {
  try {
    const record = await StudyRecord.findOne({ _id: req.params.id, userId: req.userId });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '해당 공부 기록을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '공부 기록을 조회했습니다.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * planId가 주어졌을 때, 본인 소유의 계획인지 확인한다.
 * 소유하지 않은/존재하지 않는 계획이면 에러를 던진다.
 */
const assertOwnPlanOrNull = async (planId, userId) => {
  if (!planId) return null;

  const plan = await StudyPlan.findOne({ _id: planId, userId });
  if (!plan) {
    const error = new Error('연결하려는 공부 계획을 찾을 수 없습니다.');
    error.statusCode = 404;
    throw error;
  }
  return plan;
};

/**
 * POST /api/records
 * planId가 함께 오면 해당 계획을 완료 처리한다 (실제 기록을 남겼다는 의미).
 */
export const createRecord = async (req, res, next) => {
  try {
    const { subject, actualMinutes, focusLevel, memo, date, planId, isCompleted } = req.body;

    const plan = await assertOwnPlanOrNull(planId, req.userId);

    const record = await StudyRecord.create({
      userId: req.userId,
      planId: planId || null,
      subject,
      actualMinutes,
      focusLevel,
      memo,
      date,
      isCompleted: isCompleted ?? true,
    });

    if (plan && !plan.isCompleted) {
      plan.isCompleted = true;
      await plan.save();
    }

    res.status(201).json({
      success: true,
      message: '공부 기록이 저장되었습니다.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/records/:id
 */
export const updateRecord = async (req, res, next) => {
  try {
    const { subject, actualMinutes, focusLevel, memo, date, planId, isCompleted } = req.body;

    if (planId !== undefined) {
      await assertOwnPlanOrNull(planId, req.userId);
    }

    const updateFields = {};
    if (subject !== undefined) updateFields.subject = subject;
    if (actualMinutes !== undefined) updateFields.actualMinutes = actualMinutes;
    if (focusLevel !== undefined) updateFields.focusLevel = focusLevel;
    if (memo !== undefined) updateFields.memo = memo;
    if (date !== undefined) updateFields.date = date;
    if (planId !== undefined) updateFields.planId = planId || null;
    if (isCompleted !== undefined) updateFields.isCompleted = isCompleted;

    const record = await StudyRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '해당 공부 기록을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '공부 기록이 수정되었습니다.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/records/:id
 */
export const deleteRecord = async (req, res, next) => {
  try {
    const record = await StudyRecord.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '해당 공부 기록을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '공부 기록이 삭제되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};
