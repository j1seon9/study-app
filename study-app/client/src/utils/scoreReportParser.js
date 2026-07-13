/**
 * "OO학년도 O월 고O 전국연합학력평가 성적통지표" 형식 전용 파서.
 *
 * 접근 방식:
 * 1) 단어들을 y좌표로 묶어 "행(line)"으로 재구성한다.
 * 2) 서브헤더 행(배점/득점/범위/득점/전국백분위/등급)에서 각 열의 x좌표를 찾는다.
 * 3) 과목명으로 시작하는 행을 찾아, 그 행의 숫자 토큰 중 각 열 x좌표에 가장 가까운 값을 채택한다.
 * 4) "보충학습이 필요한 문항 번호" 표에서 과목별 문항 번호 목록을 별도로 추출한다.
 *
 * 표 서식은 학교/시행처마다 미세하게 다를 수 있어 100% 정확도를 보장하지 않는다.
 * 그래서 이 파서의 결과는 항상 사용자가 검토·수정한 뒤 저장하도록 화면을 구성해야 한다.
 */

const MAIN_SUBJECTS = ['국어', '수학', '영어', '한국사', '사회', '과학'];
const REMEDIATION_SUBJECTS = [
  { label: '국어', keys: ['국어'] },
  { label: '수학', keys: ['수학'] },
  { label: '영어', keys: ['영어'] },
  { label: '한국사', keys: ['한국사'] },
  { label: '사회', keys: ['사회탐구', '사회'] },
  { label: '과학', keys: ['과학탐구', '과학'] },
];

/** 단어들을 y좌표 기준으로 묶어 표의 "행" 단위로 재구성한다. */
const clusterIntoLines = (words) => {
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const lines = [];

  for (const word of sorted) {
    const cy = (word.bbox.y0 + word.bbox.y1) / 2;
    const height = word.bbox.y1 - word.bbox.y0 || 10;
    const last = lines[lines.length - 1];

    if (last && Math.abs(cy - last.cy) <= height * 0.6) {
      last.words.push(word);
      last.cy = (last.cy * last.count + cy) / (last.count + 1);
      last.count += 1;
    } else {
      lines.push({ cy, count: 1, words: [word] });
    }
  }

  lines.forEach((line) => line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0));
  return lines;
};

/**
 * 한 줄 맨 앞쪽 단어들을 이어 붙여가며 지정된 라벨 후보와 일치하는지 확인한다.
 * "국 어"처럼 글자 사이가 벌어져 각각 다른 단어로 인식된 경우까지 대응하기 위함이다.
 */
const matchLeadingLabel = (lineWords, candidates, maxTokens = 5) => {
  let acc = '';
  for (let i = 0; i < Math.min(lineWords.length, maxTokens); i += 1) {
    acc += lineWords[i].text.trim();
    if (candidates.includes(acc)) {
      return { label: acc, consumed: i + 1 };
    }
  }
  return null;
};

const isNumericToken = (text) => /^\d+(\.\d+)?$/.test(text.trim());

const nearestNumeric = (tokens, colX) => {
  if (colX == null || tokens.length === 0) return null;
  let best = null;
  let bestDist = Infinity;
  for (const token of tokens) {
    const cx = (token.bbox.x0 + token.bbox.x1) / 2;
    const dist = Math.abs(cx - colX);
    if (dist < bestDist) {
      bestDist = dist;
      best = token;
    }
  }
  return best ? Number(best.text.replace(/,/g, '')) : null;
};

/** 서브헤더 행(배점/득점/범위/득점/전국백분위/등급)에서 열 x좌표 기준선을 찾는다. */
const findColumnReferences = (lines) => {
  const subHeaderLine = lines.find((line) => {
    const texts = line.words.map((w) => w.text.trim());
    return texts.includes('배점') && texts.includes('득점') && texts.includes('범위');
  });

  const refs = { rawScoreX: null, standardScoreX: null, percentileX: null, gradeX: null };
  if (!subHeaderLine) return refs;

  const rangeWord = subHeaderLine.words.find((w) => w.text.trim() === '범위');
  const scoreWords = subHeaderLine.words.filter((w) => w.text.trim() === '득점');

  if (rangeWord) {
    const before = scoreWords.filter((w) => w.bbox.x1 <= rangeWord.bbox.x0);
    const after = scoreWords.filter((w) => w.bbox.x0 >= rangeWord.bbox.x1);
    if (before.length) refs.rawScoreX = (before[0].bbox.x0 + before[0].bbox.x1) / 2;
    if (after.length) refs.standardScoreX = (after[0].bbox.x0 + after[0].bbox.x1) / 2;
  } else if (scoreWords.length) {
    // 범위 칸을 못 찾았을 때의 대비책: 첫 번째 득점만이라도 원점수로 사용
    refs.rawScoreX = (scoreWords[0].bbox.x0 + scoreWords[0].bbox.x1) / 2;
  }

  const percentileWord = subHeaderLine.words.find((w) => w.text.includes('백분위'));
  if (percentileWord) refs.percentileX = (percentileWord.bbox.x0 + percentileWord.bbox.x1) / 2;

  const gradeWord = subHeaderLine.words.find((w) => w.text.trim() === '등급');
  if (gradeWord) refs.gradeX = (gradeWord.bbox.x0 + gradeWord.bbox.x1) / 2;

  return refs;
};

/** 메인 성적표(영역별 원점수/표준점수/백분위/등급)를 과목별로 추출한다. */
const extractSubjectRows = (mainLines, columnRefs) => {
  const rows = [];

  for (const line of mainLines) {
    const match = matchLeadingLabel(line.words, MAIN_SUBJECTS, 4);
    if (!match) continue;

    const lineText = line.words.map((w) => w.text).join(' ');
    const numericTokens = line.words.filter((w) => isNumericToken(w.text));

    // 영어/한국사는 상대평가 점수가 없고 "원점수에 의한 등급 ( N )" 형태로만 등급이 표시된다.
    const parenGradeMatch = lineText.match(/\(\s*(\d)\s*\)/);
    const isAbsoluteEvaluation = Boolean(parenGradeMatch);

    if (isAbsoluteEvaluation) {
      const rawScore = nearestNumeric(numericTokens, columnRefs.rawScoreX);
      rows.push({
        subject: match.label,
        rawScore,
        score: rawScore,
        grade: Number(parenGradeMatch[1]),
        percentile: null,
        weakQuestions: [],
      });
    } else {
      rows.push({
        subject: match.label,
        rawScore: nearestNumeric(numericTokens, columnRefs.rawScoreX),
        score: nearestNumeric(numericTokens, columnRefs.standardScoreX),
        grade: nearestNumeric(numericTokens, columnRefs.gradeX),
        percentile: nearestNumeric(numericTokens, columnRefs.percentileX),
        weakQuestions: [],
      });
    }
  }

  return rows;
};

/** "보충학습이 필요한 문항 번호" 표에서 과목별 문항 번호 배열을 추출한다. */
const extractWeakQuestionsMap = (remediationLines) => {
  const map = {};
  const stopWords = ['기타', '참고자료', '오류코드'];

  for (const line of remediationLines) {
    const lineText = line.words.map((w) => w.text).join(' ');
    if (stopWords.some((w) => lineText.includes(w))) break;

    const match = matchLeadingLabel(
      line.words,
      REMEDIATION_SUBJECTS.flatMap((s) => s.keys),
      5
    );
    if (!match) continue;

    const target = REMEDIATION_SUBJECTS.find((s) => s.keys.includes(match.label));
    if (!target) continue;

    const restText = line.words.slice(match.consumed).map((w) => w.text).join(' ');
    const numbers = restText.match(/\d+/g);
    if (numbers) {
      map[target.label] = numbers.map(Number).filter((n) => n > 0 && n <= 50);
    }
  }

  return map;
};

/** 시험명(예: 2026학년도 6월 고2 전국연합학력평가)과 시행일을 최대한 추측한다. */
const extractExamMeta = (lines, fullText) => {
  let examName = null;
  const nameMatch = fullText.match(/\d{4}\s*학년도[^\n]{0,25}평가/);
  if (nameMatch) examName = nameMatch[0].replace(/\s+/g, ' ').trim();

  let examDate = null;
  const dateLine = lines.find((line) =>
    line.words.some((w) => w.text.includes('실시일') || w.text.includes('실시'))
  );
  if (dateLine) {
    const joined = dateLine.words.map((w) => w.text).join(' ');
    const m = joined.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (m) examDate = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  }
  if (!examDate) {
    const m2 = fullText.match(/(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})/);
    if (m2) examDate = `${m2[1]}-${String(m2[2]).padStart(2, '0')}-${String(m2[3]).padStart(2, '0')}`;
  }

  return { examName, examDate };
};

/**
 * @param {{ text: string, words: Array }} ocrResult - recognizeScoreReport()의 반환값
 * @returns {{
 *   subjectRows: Array<{subject, rawScore, score, grade, percentile, weakQuestions}>,
 *   examName: string|null,
 *   examDate: string|null,
 *   rawText: string,
 * }}
 */
export const parseScoreReport = (ocrResult) => {
  const words = (ocrResult.words || []).filter((w) => w.text && w.text.trim());
  const lines = clusterIntoLines(words);

  // "보충학습이 필요한 문항 번호" 표는 메인 성적표 아래쪽에 위치하므로,
  // 그 경계선을 기준으로 메인 표 영역과 보충학습 표 영역을 나눈다.
  // (사회탐구/과학탐구처럼 "사회"/"과학"으로 시작하는 라벨이 메인 표 파싱에
  //  잘못 섞이는 것을 막기 위함이기도 하다.)
  const remediationHeaderIdx = lines.findIndex((line) =>
    line.words.some((w) => w.text.includes('보충학습'))
  );
  const mainLines = remediationHeaderIdx === -1 ? lines : lines.slice(0, remediationHeaderIdx);
  const remediationLines = remediationHeaderIdx === -1 ? [] : lines.slice(remediationHeaderIdx + 1);

  const columnRefs = findColumnReferences(mainLines);
  const subjectRows = extractSubjectRows(mainLines, columnRefs);

  const weakQuestionsMap = extractWeakQuestionsMap(remediationLines);
  subjectRows.forEach((row) => {
    row.weakQuestions = weakQuestionsMap[row.subject] || [];
  });

  const { examName, examDate } = extractExamMeta(lines, ocrResult.text || '');

  return { subjectRows, examName, examDate, rawText: ocrResult.text || '' };
};
