import MockExamResult from '../models/MockExamResult.js';

/**
 * GET /api/mock-exams
 * 쿼리: from, to (날짜 범위), subject (부분 일치)
 */
export const getMockExams = async (req, res, next) => {
  try {
    const { from, to, subject } = req.query;
    const filter = { userId: req.userId };

    if (from && to) {
      filter.examDate = { $gte: new Date(from), $lt: new Date(to) };
    }
    if (subject) {
      filter.subject = { $regex: subject, $options: 'i' };
    }

    const exams = await MockExamResult.find(filter).sort({ examDate: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: '모의고사 결과 목록을 조회했습니다.',
      data: exams,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mock-exams
 * 주의: 원본 이미지는 절대 서버로 전달되거나 저장되지 않는다.
 * 프론트에서 OCR(브라우저 내 처리)로 추출한 뒤 사용자가 검토/수정한 텍스트 결과만 여기로 온다.
 */
export const createMockExam = async (req, res, next) => {
  try {
    const { examName, subject, rawScore, score, grade, percentile, weakQuestions, examDate } = req.body;

    const exam = await MockExamResult.create({
      userId: req.userId,
      examName: examName ?? '',
      subject,
      rawScore: rawScore ?? null,
      score,
      grade: grade ?? null,
      percentile: percentile ?? null,
      weakQuestions: weakQuestions ?? [],
      examDate,
    });

    res.status(201).json({
      success: true,
      message: '모의고사 결과가 저장되었습니다.',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mock-exams/bulk
 * 성적표 사진 한 장에서 인식된 여러 과목(results)을 한 번에 저장한다.
 * examName/examDate는 모든 과목에 공통으로 적용된다.
 */
export const createMockExamsBulk = async (req, res, next) => {
  try {
    const { examName, examDate, results } = req.body;

    const docs = results.map((r) => ({
      userId: req.userId,
      examName: examName ?? '',
      subject: r.subject,
      rawScore: r.rawScore ?? null,
      score: r.score,
      grade: r.grade ?? null,
      percentile: r.percentile ?? null,
      weakQuestions: r.weakQuestions ?? [],
      examDate,
    }));

    const created = await MockExamResult.insertMany(docs, { ordered: true });

    res.status(201).json({
      success: true,
      message: `${created.length}개 과목의 모의고사 결과가 저장되었습니다.`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/mock-exams/:id
 */
export const updateMockExam = async (req, res, next) => {
  try {
    const { examName, subject, rawScore, score, grade, percentile, weakQuestions, examDate } = req.body;

    const updateFields = {};
    if (examName !== undefined) updateFields.examName = examName;
    if (subject !== undefined) updateFields.subject = subject;
    if (rawScore !== undefined) updateFields.rawScore = rawScore;
    if (score !== undefined) updateFields.score = score;
    if (grade !== undefined) updateFields.grade = grade;
    if (percentile !== undefined) updateFields.percentile = percentile;
    if (weakQuestions !== undefined) updateFields.weakQuestions = weakQuestions;
    if (examDate !== undefined) updateFields.examDate = examDate;

    const exam = await MockExamResult.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '해당 모의고사 결과를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '모의고사 결과가 수정되었습니다.',
      data: exam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/mock-exams/:id
 */
export const deleteMockExam = async (req, res, next) => {
  try {
    const exam = await MockExamResult.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: '해당 모의고사 결과를 찾을 수 없습니다.',
      });
    }

    res.status(200).json({
      success: true,
      message: '모의고사 결과가 삭제되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};
