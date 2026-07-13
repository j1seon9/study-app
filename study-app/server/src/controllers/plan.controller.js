import StudyPlan from '../models/StudyPlan.js';

/**
 * GET /api/plans
 * 쿼리 파라미터:
 * - date: 특정 날짜(YYYY-MM-DD)의 계획만 조회
 * - from, to: 날짜 범위로 조회 (둘 다 있어야 범위 조건이 적용됨)
 * 아무 파라미터도 없으면 로그인한 사용자의 전체 계획을 최신순으로 반환한다.
 */
export const getPlans = async (req, res, next) => {
  try {
    const { date, from, to } = req.query;

    const filter = { userId: req.userId };

    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      filter.planDate = { $gte: start, $lt: end };
    } else if (from && to) {
      filter.planDate = { $gte: new Date(from), $lt: new Date(to) };
    }

    const plans = await StudyPlan.find(filter).sort({ planDate: 1, createdAt: 1 });

    res.status(200).json({
      success: true,
      message: '공부 계획 목록을 조회했습니다.',
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/plans/:id
 */
export const getPlanById = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ _id: req.params.id, userId: req.userId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '해당 공부 계획을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '공부 계획을 조회했습니다.',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/plans
 */
export const createPlan = async (req, res, next) => {
  try {
    const { subject, targetMinutes, priority, planDate } = req.body;

    const plan = await StudyPlan.create({
      userId: req.userId,
      subject,
      targetMinutes,
      priority,
      planDate,
    });

    res.status(201).json({
      success: true,
      message: '공부 계획이 생성되었습니다.',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/plans/:id
 * 본인 소유의 계획만 수정 가능 (req.userId로 필터링).
 */
export const updatePlan = async (req, res, next) => {
  try {
    const { subject, targetMinutes, priority, planDate, isCompleted } = req.body;

    const updateFields = {};
    if (subject !== undefined) updateFields.subject = subject;
    if (targetMinutes !== undefined) updateFields.targetMinutes = targetMinutes;
    if (priority !== undefined) updateFields.priority = priority;
    if (planDate !== undefined) updateFields.planDate = planDate;
    if (isCompleted !== undefined) updateFields.isCompleted = isCompleted;

    const plan = await StudyPlan.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '해당 공부 계획을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '공부 계획이 수정되었습니다.',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/plans/:id/toggle
 * 카드 UI에서 체크박스 등으로 빠르게 완료 상태만 토글할 때 사용.
 */
export const toggleComplete = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ _id: req.params.id, userId: req.userId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '해당 공부 계획을 찾을 수 없습니다.',
      });
    }

    plan.isCompleted = !plan.isCompleted;
    await plan.save();

    res.status(200).json({
      success: true,
      message: '완료 상태가 변경되었습니다.',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/plans/:id
 */
export const deletePlan = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '해당 공부 계획을 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '공부 계획이 삭제되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};
