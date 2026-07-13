import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const PRIORITY_LABEL = { high: '상', medium: '중', low: '하' };
const PRIORITY_COLOR = { high: 'error', medium: 'warning', low: 'default' };

/**
 * 공부 계획 카드 (모바일 우선 레이아웃)
 * props:
 * - plan: { _id, subject, targetMinutes, priority, planDate, isCompleted }
 * - onToggle, onEdit, onDelete: (plan) => void
 */
function PlanCard({ plan, onToggle, onEdit, onDelete }) {
  const dateLabel = new Date(plan.planDate).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <Card
      variant="outlined"
      sx={{
        opacity: plan.isCompleted ? 0.6 : 1,
        borderColor: plan.isCompleted ? 'divider' : 'primary.light',
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Checkbox
            checked={plan.isCompleted}
            onChange={() => onToggle(plan)}
            sx={{ p: 0, mt: 0.25 }}
          />
          <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                textDecoration: plan.isCompleted ? 'line-through' : 'none',
                wordBreak: 'break-word',
              }}
            >
              {plan.subject}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip
                size="small"
                label={`우선순위 ${PRIORITY_LABEL[plan.priority] ?? '중'}`}
                color={PRIORITY_COLOR[plan.priority] ?? 'default'}
              />
              <Typography variant="body2" color="text.secondary">
                목표 {plan.targetMinutes}분
              </Typography>
              <Typography variant="body2" color="text.secondary">
                · {dateLabel}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <IconButton size="small" aria-label="수정" onClick={() => onEdit(plan)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="삭제" onClick={() => onDelete(plan)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}

export default PlanCard;
