import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';

const LEVEL_LABELS = {
  very_high: { label: '매우 높음', color: 'success' },
  high: { label: '높음', color: 'success' },
  medium: { label: '보통', color: 'warning' },
  low: { label: '낮음', color: 'error' },
  very_low: { label: '매우 낮음', color: 'error' },
};

/**
 * props:
 * - report: AiReport 도큐먼트
 */
function AiReportCard({ report }) {
  const dateLabel = new Date(report.analyzedAt ?? report.createdAt).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const level = LEVEL_LABELS[report.goalProbabilityLevel] ?? null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {dateLabel}
          </Typography>
          {level && (
            <Chip size="small" color={level.color} label={`목표 달성 가능성: ${level.label}`} />
          )}
        </Stack>

        {report.goalAchievability != null && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                목표 달성 확률
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {report.goalAchievability}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={report.goalAchievability}
              sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
            />
          </Box>
        )}

        {report.recommendedStudyMinutes != null && (
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            하루 추천 공부시간: {report.recommendedStudyMinutes}분
          </Typography>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {report.recommendedSubject && (
            <Chip size="small" color="primary" label={`집중 추천: ${report.recommendedSubject}`} />
          )}
          {report.recommendedReviewSubject && (
            <Chip size="small" variant="outlined" label={`복습 추천: ${report.recommendedReviewSubject}`} />
          )}
          {report.weakSubjects?.map((s) => (
            <Chip key={`weak-${s}`} size="small" color="error" variant="outlined" label={`취약: ${s}`} />
          ))}
          {report.strongSubjects?.map((s) => (
            <Chip key={`strong-${s}`} size="small" color="success" variant="outlined" label={`강점: ${s}`} />
          ))}
        </Stack>

        {report.recommendedOrder?.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            추천 학습 순서: {report.recommendedOrder.join(' → ')}
          </Typography>
        )}

        {report.reason && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {report.reason}
          </Typography>
        )}

        {report.curriculum?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              오늘의 학습 배분
            </Typography>
            <Stack spacing={0.5}>
              {report.curriculum.map((item) => (
                <Stack
                  key={`curriculum-${item.order}-${item.subject}`}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="baseline"
                >
                  <Typography variant="body2">
                    {item.order}. {item.subjectLabel || item.subject} — {item.focus}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                    {item.allocatedMinutes}분
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {report.ebsRecommendations?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              EBS 강의 추천
            </Typography>
            <Stack spacing={0.5}>
              {report.ebsRecommendations.map((item) => (
                <Typography key={`ebs-${item.subject}`} variant="body2" color="text.secondary">
                  {item.subjectLabel || item.subject} · {item.category}
                </Typography>
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default AiReportCard;
