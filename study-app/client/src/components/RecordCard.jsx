import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import IconButton from '@mui/material/IconButton';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';

/**
 * 공부 기록 카드
 * props:
 * - record: { _id, subject, actualMinutes, focusLevel, memo, date, planId }
 * - onEdit, onDelete: (record) => void
 */
function RecordCard({ record, onEdit, onDelete }) {
  const dateLabel = new Date(record.date).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 1 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Typography variant="subtitle1" sx={{ wordBreak: 'break-word' }}>
              {record.subject}
            </Typography>
            {record.planId && (
              <Chip
                size="small"
                icon={<LinkIcon fontSize="small" />}
                label="계획 연동"
                variant="outlined"
              />
            )}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              {record.actualMinutes}분 공부
            </Typography>
            <Typography variant="body2" color="text.secondary">
              · {dateLabel}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Rating value={record.focusLevel} readOnly size="small" max={5} />
            <Typography variant="caption" color="text.secondary">
              집중도 {record.focusLevel}/5
            </Typography>
          </Stack>

          {record.memo && (
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {record.memo}
            </Typography>
          )}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <IconButton size="small" aria-label="수정" onClick={() => onEdit(record)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="삭제" onClick={() => onDelete(record)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}

export default RecordCard;
