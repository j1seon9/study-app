import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const scoreColor = (score) => {
  if (score >= 90) return 'success';
  if (score >= 70) return 'primary';
  if (score >= 50) return 'warning';
  return 'error';
};

/**
 * props:
 * - test: { _id, subject, score, wrongCount, testDate }
 * - onEdit, onDelete: (test) => void
 */
function WeeklyTestCard({ test, onEdit, onDelete }) {
  const dateLabel = new Date(test.testDate).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">{test.subject}</Typography>
          <Chip size="small" label={`${test.score}점`} color={scoreColor(test.score)} />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            오답 {test.wrongCount}개
          </Typography>
          <Typography variant="body2" color="text.secondary">
            · {dateLabel}
          </Typography>
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <IconButton size="small" aria-label="수정" onClick={() => onEdit(test)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="삭제" onClick={() => onDelete(test)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}

export default WeeklyTestCard;
