import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';

const toDateInputValue = (date) => {
  const d = date ? new Date(date) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

const emptyForm = {
  examName: '',
  subject: '',
  rawScore: '',
  score: '',
  grade: '',
  percentile: '',
  weakQuestions: '',
  examDate: toDateInputValue(new Date()),
};

const toWeakQuestionsText = (arr) => (Array.isArray(arr) ? arr.join(', ') : '');

const parseWeakQuestionsText = (text) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);

/**
 * 모의고사 결과 1건을 수기로 추가/수정하는 다이얼로그.
 * 성적표 사진으로 여러 과목을 한 번에 등록하려면 MockExamBatchImportDialog를 사용한다.
 *
 * props:
 * - open, initialExam, onClose, onSubmit(payload)
 */
function MockExamFormDialog({ open, initialExam, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = Boolean(initialExam);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        initialExam
          ? {
              examName: initialExam.examName ?? '',
              subject: initialExam.subject,
              rawScore: initialExam.rawScore ?? '',
              score: initialExam.score,
              grade: initialExam.grade ?? '',
              percentile: initialExam.percentile ?? '',
              weakQuestions: toWeakQuestionsText(initialExam.weakQuestions),
              examDate: toDateInputValue(initialExam.examDate),
            }
          : emptyForm
      );
    }
  }, [open, initialExam]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit({
        examName: form.examName.trim(),
        subject: form.subject.trim(),
        rawScore: form.rawScore === '' ? null : Number(form.rawScore),
        score: Number(form.score),
        grade: form.grade === '' ? null : Number(form.grade),
        percentile: form.percentile === '' ? null : Number(form.percentile),
        weakQuestions: parseWeakQuestionsText(form.weakQuestions),
        examDate: form.examDate,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEditMode ? '모의고사 결과 수정' : '모의고사 결과 추가 (수기 입력)'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="시험명 (선택, 예: 2026학년도 6월 고2 전국연합학력평가)"
              value={form.examName}
              onChange={handleChange('examName')}
              fullWidth
            />
            <TextField
              label="과목"
              value={form.subject}
              onChange={handleChange('subject')}
              required
              fullWidth
            />
            <TextField
              label="원점수 (선택)"
              type="number"
              value={form.rawScore}
              onChange={handleChange('rawScore')}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="점수 (상대평가는 표준점수, 절대평가는 원점수)"
              type="number"
              value={form.score}
              onChange={handleChange('score')}
              required
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="등급 (선택, 1~9)"
              type="number"
              value={form.grade}
              onChange={handleChange('grade')}
              inputProps={{ min: 1, max: 9 }}
              fullWidth
            />
            <TextField
              label="백분위 (선택, 0~100)"
              type="number"
              value={form.percentile}
              onChange={handleChange('percentile')}
              inputProps={{ min: 0, max: 100 }}
              fullWidth
            />
            <TextField
              label="보충학습이 필요한 문항 번호 (쉼표로 구분, 선택)"
              placeholder="예: 12, 35, 27, 2, 6"
              value={form.weakQuestions}
              onChange={handleChange('weakQuestions')}
              fullWidth
            />
            <TextField
              label="시험 날짜"
              type="date"
              value={form.examDate}
              onChange={handleChange('examDate')}
              required
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default MockExamFormDialog;
