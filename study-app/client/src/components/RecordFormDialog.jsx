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
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import { fetchPlans } from '../api/plans.api.js';

const toDateInputValue = (date) => {
  const d = date ? new Date(date) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

const emptyForm = {
  subject: '',
  actualMinutes: 30,
  focusLevel: 3,
  memo: '',
  date: toDateInputValue(new Date()),
  planId: '',
};

/**
 * 공부 기록 생성/수정 다이얼로그
 * props:
 * - open: boolean
 * - initialRecord: 수정 대상 record 객체 (없으면 생성 모드)
 * - onClose: () => void
 * - onSubmit: (payload) => Promise<void>  // 실패 시 throw
 */
function RecordFormDialog({ open, initialRecord, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dayPlans, setDayPlans] = useState([]);

  const isEditMode = Boolean(initialRecord);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        initialRecord
          ? {
              subject: initialRecord.subject,
              actualMinutes: initialRecord.actualMinutes,
              focusLevel: initialRecord.focusLevel ?? 3,
              memo: initialRecord.memo ?? '',
              date: toDateInputValue(initialRecord.date),
              planId: initialRecord.planId ?? '',
            }
          : emptyForm
      );
    }
  }, [open, initialRecord]);

  // 선택된 날짜의 계획 목록을 불러와 "연결할 계획" 드롭다운에 표시한다.
  useEffect(() => {
    if (!open || !form.date) return;

    let ignore = false;
    fetchPlans({ date: form.date })
      .then((plans) => {
        if (!ignore) setDayPlans(plans);
      })
      .catch(() => {
        if (!ignore) setDayPlans([]);
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.date]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handlePlanSelect = (e) => {
    const planId = e.target.value;
    const selectedPlan = dayPlans.find((p) => p._id === planId);

    setForm((prev) => ({
      ...prev,
      planId,
      subject: selectedPlan ? selectedPlan.subject : prev.subject,
      actualMinutes: selectedPlan ? selectedPlan.targetMinutes : prev.actualMinutes,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit({
        subject: form.subject.trim(),
        actualMinutes: Number(form.actualMinutes),
        focusLevel: Number(form.focusLevel),
        memo: form.memo.trim(),
        date: form.date,
        planId: form.planId || null,
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
      <DialogTitle>{isEditMode ? '공부 기록 수정' : '공부 기록 추가'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="날짜"
              type="date"
              value={form.date}
              onChange={handleChange('date')}
              required
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              select
              label="연결할 계획 (선택)"
              value={form.planId}
              onChange={handlePlanSelect}
              fullWidth
              helperText={dayPlans.length === 0 ? '해당 날짜에 등록된 계획이 없습니다.' : ' '}
            >
              <MenuItem value="">연결 안 함</MenuItem>
              {dayPlans.map((plan) => (
                <MenuItem key={plan._id} value={plan._id}>
                  {plan.subject} ({plan.targetMinutes}분){plan.isCompleted ? ' - 완료됨' : ''}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="과목"
              value={form.subject}
              onChange={handleChange('subject')}
              required
              fullWidth
            />
            <TextField
              label="실제 공부시간(분)"
              type="number"
              value={form.actualMinutes}
              onChange={handleChange('actualMinutes')}
              required
              inputProps={{ min: 0 }}
              fullWidth
            />

            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                집중도
              </Typography>
              <Rating
                value={Number(form.focusLevel)}
                onChange={(_e, value) => setForm((prev) => ({ ...prev, focusLevel: value || 1 }))}
              />
            </Stack>

            <TextField
              label="메모"
              value={form.memo}
              onChange={handleChange('memo')}
              multiline
              minRows={2}
              inputProps={{ maxLength: 500 }}
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

export default RecordFormDialog;
