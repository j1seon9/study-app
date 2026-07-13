import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
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
  targetMinutes: 30,
  priority: 'medium',
  planDate: toDateInputValue(new Date()),
};

/**
 * 계획 생성/수정 다이얼로그
 * props:
 * - open: boolean
 * - initialPlan: 수정 대상 plan 객체 (없으면 생성 모드)
 * - onClose: () => void
 * - onSubmit: (payload) => Promise<void>  // 실패 시 throw
 */
function PlanFormDialog({ open, initialPlan, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = Boolean(initialPlan);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        initialPlan
          ? {
              subject: initialPlan.subject,
              targetMinutes: initialPlan.targetMinutes,
              priority: initialPlan.priority,
              planDate: toDateInputValue(initialPlan.planDate),
            }
          : emptyForm
      );
    }
  }, [open, initialPlan]);

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
        targetMinutes: Number(form.targetMinutes),
        priority: form.priority,
        planDate: form.planDate,
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
      <DialogTitle>{isEditMode ? '공부 계획 수정' : '공부 계획 추가'}</DialogTitle>
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
              label="목표 시간(분)"
              type="number"
              value={form.targetMinutes}
              onChange={handleChange('targetMinutes')}
              required
              inputProps={{ min: 1 }}
              fullWidth
            />
            <TextField
              select
              label="우선순위"
              value={form.priority}
              onChange={handleChange('priority')}
              fullWidth
            >
              <MenuItem value="high">상</MenuItem>
              <MenuItem value="medium">중</MenuItem>
              <MenuItem value="low">하</MenuItem>
            </TextField>
            <TextField
              label="계획 날짜"
              type="date"
              value={form.planDate}
              onChange={handleChange('planDate')}
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

export default PlanFormDialog;
