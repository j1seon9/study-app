/**
 * OCR/모의고사 성적표 데이터 -> FastAPI /api/ocr-recommend 입력(OcrSubjectRecord) 변환기.
 *
 * scoreReportParser.js(클라이언트) 또는 MockExamResult(MongoDB)에서 나온 과목별 결과를
 * aimodel의 OcrSubjectScore 스키마에 맞게 정규화한다.
 */

/** 학평 표준 문항 수 (오답 비율 계산용). 알 수 없는 과목은 0으로 두어 비율 계산을 생략한다. */
const DEFAULT_TOTAL_ITEMS = {
  국어: 45,
  수학: 30,
  영어: 25,
  한국사: 20,
  사회: 20,
  과학: 20,
};

const resolveTotalItems = (subject) => DEFAULT_TOTAL_ITEMS[subject] ?? 0;

const toInt = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const toFloat = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeWeakItems = (weakQuestions) => {
  if (!Array.isArray(weakQuestions)) return [];
  return weakQuestions
    .map((item) => toInt(item))
    .filter((item) => item !== null && item > 0);
};

/**
 * 단일 과목 행을 FastAPI OcrSubjectRecord 형식으로 변환한다.
 *
 * @param {object} row - OCR 파서 또는 MockExamResult 한 과목분
 * @param {number|null} prevGrade - 직전 시험 등급 (없으면 null)
 */
export const toOcrSubjectRecord = (row, prevGrade = null) => {
  const grade = toInt(row.grade);
  if (grade === null || grade < 1 || grade > 9) {
    throw new Error(`'${row.subject}' 과목의 등급(1~9)이 필요합니다.`);
  }

  const subject = String(row.subject || '').trim();
  if (!subject) {
    throw new Error('과목명이 비어 있습니다.');
  }

  const percentile = toFloat(row.percentile);
  const wrongItems = normalizeWeakItems(row.weakQuestions ?? row.wrong_items);

  return {
    subject,
    grade,
    percentile: percentile === null ? null : Math.max(0, Math.min(100, percentile)),
    wrong_items: wrongItems,
    total_items: resolveTotalItems(subject),
    prev_grade: prevGrade === null || prevGrade === undefined ? null : toInt(prevGrade),
  };
};

/**
 * 여러 과목 행을 OcrSubjectRecord 배열로 변환한다.
 *
 * @param {Array<object>} rows
 * @param {Record<string, number|null>} [prevGradeBySubject] - 과목별 직전 등급
 */
export const buildOcrRecords = (rows, prevGradeBySubject = {}) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('OCR 추천을 위해 최소 1개 과목의 성적 데이터가 필요합니다.');
  }

  return rows.map((row) =>
    toOcrSubjectRecord(row, prevGradeBySubject[row.subject] ?? null)
  );
};

/**
 * MongoDB MockExamResult 문서 배열을 OcrSubjectRecord 배열로 변환한다.
 * 같은 userId의 이전 시험 기록에서 prev_grade를 채운다.
 *
 * @param {Array<object>} currentExams - 현재 시험(동일 examDate)의 MockExamResult 문서들
 * @param {Array<object>} previousExams - 더 이전 시험의 MockExamResult 문서들 (선택)
 */
export const buildOcrRecordsFromMockExams = (currentExams, previousExams = []) => {
  const prevGradeBySubject = {};
  for (const exam of previousExams) {
    if (exam.grade != null && prevGradeBySubject[exam.subject] === undefined) {
      prevGradeBySubject[exam.subject] = exam.grade;
    }
  }

  return buildOcrRecords(
    currentExams.map((exam) => ({
      subject: exam.subject,
      grade: exam.grade,
      percentile: exam.percentile,
      weakQuestions: exam.weakQuestions,
    })),
    prevGradeBySubject
  );
};
