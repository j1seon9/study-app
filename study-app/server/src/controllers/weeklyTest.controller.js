import WeeklyTest from '../models/WeeklyTest.js';

/**
 * GET /api/weekly-tests
 * 쿼리: from, to (날짜 범위), subject (부분 일치)
 */
export const getWeeklyTests = async (req, res, next) => {
  try {
    const { from, to, subject } = req.query;
    const filter = { userId: req.userId };

    if (from && to) {
      filter.testDate = { $gte: new Date(from), $lt: new Date(to) };
    }
    if (subject) {
      filter.subject = { $regex: subject, $options: 'i' };
    }

    const tests = await WeeklyTest.find(filter).sort({ testDate: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: '미니테스트 목록을 조회했습니다.',
      data: tests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/weekly-tests
 */
export const createWeeklyTest = async (req, res, next) => {
  try {
    const { subject, score, wrongCount, testDate } = req.body;

    const test = await WeeklyTest.create({
      userId: req.userId,
      subject,
      score,
      wrongCount,
      testDate,
    });

    res.status(201).json({
      success: true,
      message: '미니테스트 결과가 저장되었습니다.',
      data: test,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/weekly-tests/:id
 */
export const updateWeeklyTest = async (req, res, next) => {
  try {
    const { subject, score, wrongCount, testDate } = req.body;

    const updateFields = {};
    if (subject !== undefined) updateFields.subject = subject;
    if (score !== undefined) updateFields.score = score;
    if (wrongCount !== undefined) updateFields.wrongCount = wrongCount;
    if (testDate !== undefined) updateFields.testDate = testDate;

    const test = await WeeklyTest.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!test) {
      return res.status(404).json({
        success: false,
        message: '해당 미니테스트를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '미니테스트 결과가 수정되었습니다.',
      data: test,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/weekly-tests/:id
 */
export const deleteWeeklyTest = async (req, res, next) => {
  try {
    const test = await WeeklyTest.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: '해당 미니테스트를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '미니테스트 결과가 삭제되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};
