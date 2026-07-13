import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * props:
 * - exam: { _id, examName, subject, rawScore, score, grade, percentile, weakQuestions, examDate }
 * - onEdit, onDelete: (exam) => void
 */
function MockExamCard({ exam, onEdit, onDelete }) {
  const dateLabel = new Date(exam.examDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: 1 }}>
        {exam.examName && (
          <Typography variant="caption" color="text.secondary">
            {exam.examName}
          </Typography>
        )}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">{exam.subject}</Typography>
          <Typography variant="h6" color="primary">
            {exam.score}점
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} alignItems="center" flexWrap="wrap">
          {exam.rawScore != null && exam.rawScore !== exam.score && (
            <Chip size="small" variant="outlined" label={`원점수 ${exam.rawScore}`} />
          )}
          {exam.grade != null && <Chip size="small" label={`${exam.grade}등급`} />}
          {exam.percentile != null && <Chip size="small" label={`백분위 ${exam.percentile}`} />}
          <Typography variant="body2" color="text.secondary">
            {dateLabel}
          </Typography>
        </Stack>
        {exam.weakQuestions?.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            보충학습 필요 문항: {exam.weakQuestions.join(', ')}번
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <IconButton size="small" aria-label="수정" onClick={() => onEdit(exam)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" aria-label="삭제" onClick={() => onDelete(exam)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}

export default MockExamCard;
