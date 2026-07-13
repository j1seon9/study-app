import { useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { recognizeScoreReport } from '../utils/ocr.js';
import { parseScoreReport } from '../utils/scoreReportParser.js';

const toDateInputValue = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

const emptyRow = () => ({
  subject: '',
  rawScore: '',
  score: '',
  grade: '',
  percentile: '',
  weakQuestionsText: '',
});

/**
 * 성적표 사진 1장 → OCR(브라우저 내 처리, 전처리 포함) → 레이아웃 기반 파싱
 * → 과목별 표로 사용자에게 보여주고 검토/수정 → 한 번에 저장(POST /api/mock-exams/bulk)
 *
 * 원본 이미지는 어떤 경우에도 서버로 전송되지 않으며, 미리보기(전처리된 이미지)만
 * 이 다이얼로그 안에서 확인용으로 사용된다.
 *
 * props:
 * - open, onClose, onSubmit({ examName, examDate, results }) -> Promise
 */
function MockExamBatchImportDialog({ open, onClose, onSubmit }) {
  const [step, setStep] = useState('pick'); // 'pick' | 'recognizing' | 'review'
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState(toDateInputValue());
  const [rows, setRows] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setStep('pick');
    setProgress(0);
    setError('');
    setPreviewUrl('');
    setRawText('');
    setExamName('');
    setExamDate(toDateInputValue());
    setRows([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePickImage = () => fileInputRef.current?.click();

  const handleImageSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    setStep('recognizing');
    setProgress(0);

    try {
      const ocrResult = await recognizeScoreReport(file, setProgress);
      setPreviewUrl(ocrResult.previewDataUrl);
      setRawText(ocrResult.text);

      const parsed = parseScoreReport(ocrResult);

      setExamName(parsed.examName || '');
      setExamDate(toDateInputValue(parsed.examDate));
      setRows(
        parsed.subjectRows.length > 0
          ? parsed.subjectRows.map((r) => ({
              subject: r.subject,
              rawScore: r.rawScore ?? '',
              score: r.score ?? '',
              grade: r.grade ?? '',
              percentile: r.percentile ?? '',
              weakQuestionsText: (r.weakQuestions || []).join(', '),
            }))
          : [emptyRow()]
      );
      setStep('review');
    } catch (err) {
      setError('이미지 인식에 실패했습니다. 다시 촬영하거나 직접 입력해주세요.');
      setStep('review');
      setRows((prev) => (prev.length ? prev : [emptyRow()]));
    }
  };

  const updateRow = (index, field) => (e) => {
    const value = e.target.value;
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow()]);
  };

  const handleSubmit = async () => {
    setError('');

    const validRows = rows.filter((r) => r.subject.trim() && r.score !== '');
    if (validRows.length === 0) {
      setError('과목과 점수가 입력된 행이 1개 이상 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const results = validRows.map((r) => ({
        subject: r.subject.trim(),
        rawScore: r.rawScore === '' ? null : Number(r.rawScore),
        score: Number(r.score),
        grade: r.grade === '' ? null : Number(r.grade),
        percentile: r.percentile === '' ? null : Number(r.percentile),
        weakQuestions: r.weakQuestionsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0),
      }));

      await onSubmit({ examName: examName.trim(), examDate, results });
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>성적표 사진으로 전체 과목 한 번에 등록</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {step === 'pick' && (
            <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                성적표(성적통지표) 사진 한 장을 올리면, 국어/수학/영어/한국사/탐구 과목을
                한 번에 인식합니다. 이미지는 이 브라우저 안에서만 처리되고 서버로 전송되지 않습니다.
              </Typography>
              <Button variant="contained" startIcon={<CameraAltIcon />} onClick={handlePickImage}>
                성적표 사진 선택
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handleImageSelected}
              />
            </Stack>
          )}

          {step === 'recognizing' && (
            <Stack spacing={1} sx={{ py: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                이미지 전처리(회색조·기울기 보정·이진화) 및 문자 인식 중입니다...
              </Typography>
              <LinearProgress variant="determinate" value={Math.round(progress * 100)} />
            </Stack>
          )}

          {step === 'review' && (
            <Stack spacing={2}>
              <Alert severity="info">
                자동 인식된 결과입니다. 값이 정확한지 꼭 확인하고, 틀린 부분은 표에서 직접
                수정한 뒤 저장해주세요.
              </Alert>

              <Stack direction="row" spacing={1}>
                <TextField
                  label="시험명"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="시험 날짜"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ minWidth: 160 }}
                />
              </Stack>

              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>과목</TableCell>
                      <TableCell>원점수</TableCell>
                      <TableCell>점수</TableCell>
                      <TableCell>등급</TableCell>
                      <TableCell>백분위</TableCell>
                      <TableCell>보충학습 문항</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            value={row.subject}
                            onChange={updateRow(index, 'subject')}
                            size="small"
                            sx={{ width: 72 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={row.rawScore}
                            onChange={updateRow(index, 'rawScore')}
                            size="small"
                            sx={{ width: 64 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={row.score}
                            onChange={updateRow(index, 'score')}
                            size="small"
                            sx={{ width: 64 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={row.grade}
                            onChange={updateRow(index, 'grade')}
                            size="small"
                            sx={{ width: 56 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={row.percentile}
                            onChange={updateRow(index, 'percentile')}
                            size="small"
                            sx={{ width: 64 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={row.weakQuestionsText}
                            onChange={updateRow(index, 'weakQuestionsText')}
                            placeholder="12, 35, 27"
                            size="small"
                            sx={{ width: 140 }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => removeRow(index)} aria-label="행 삭제">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              <Button size="small" onClick={addRow} sx={{ alignSelf: 'flex-start' }}>
                + 과목 행 추가
              </Button>

              {previewUrl && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">전처리된 이미지 / 인식된 원문 보기</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      <img
                        src={previewUrl}
                        alt="전처리된 성적표"
                        style={{ maxWidth: '100%', border: '1px solid #ddd' }}
                      />
                      <Typography
                        variant="caption"
                        component="pre"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          maxHeight: 200,
                          overflowY: 'auto',
                          bgcolor: 'grey.100',
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        {rawText}
                      </Typography>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          취소
        </Button>
        {step === 'review' && (
          <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : `${rows.length}개 과목 저장`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default MockExamBatchImportDialog;
