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
  subject: '',
  score: 80,
  wrongCount: 0,
  testDate: toDateInputValue(new Date()),
};

/**
 * props:
 * - open, initialTest, onClose, onSubmit(payload)
 */
function WeeklyTestFormDialog({ open, initialTest, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = Boolean(initialTest);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        initialTest
          ? {
              subject: initialTest.subject,
              score: initialTest.score,
              wrongCount: initialTest.wrongCount,
              testDate: toDateInputValue(initialTest.testDate),
            }
          : emptyForm
      );
    }
  }, [open, initialTest]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit({
        subject: form.subject.trim(),
        score: Number(form.score),
        wrongCount: Number(form.wrongCount),
        testDate: form.testDate,
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
      <DialogTitle>{isEditMode ? '미니테스트 수정' : '미니테스트 결과 추가'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="과목"
              value={form.subject}
              onChange={handleChange('subject')}
              required
              autoFocus
              fullWidth
            />
            <TextField
              label="점수 (0~100)"
              type="number"
              value={form.score}
              onChange={handleChange('score')}
              required
              inputProps={{ min: 0, max: 100 }}
              fullWidth
            />
            <TextField
              label="오답 개수"
              type="number"
              value={form.wrongCount}
              onChange={handleChange('wrongCount')}
              required
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="테스트 날짜"
              type="date"
              value={form.testDate}
              onChange={handleChange('testDate')}
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

export default WeeklyTestFormDialog;
