import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import { Bar, Doughnut } from 'react-chartjs-2';
import NavBar from '../components/NavBar.jsx';
import { fetchStats } from '../api/stats.api.js';
import '../utils/chartSetup.js';

const SUBJECT_COLORS = [
  '#1976d2', '#e53935', '#43a047', '#fb8c00', '#8e24aa',
  '#00897b', '#c0ca33', '#5e35b1', '#d81b60', '#3949ab',
];

function StatCard({ label, value }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="h5">{value}</Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * 공부 통계 페이지
 * - 주간(week) / 월간(month) 토글
 * - 일별 공부시간 막대그래프, 과목별 비중 도넛차트, 계획 달성률
 */
function StatsPage() {
  const [range, setRange] = useState('week');
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async (currentRange) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchStats({ range: currentRange });
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.message || '통계를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats(range);
  }, [range, loadStats]);

  const handleRangeChange = (_e, value) => {
    if (value) setRange(value);
  };

  const barData = useMemo(() => {
    if (!stats) return null;
    return {
      labels: stats.dailySeries.map((row) =>
        new Date(row.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
      ),
      datasets: [
        {
          label: '공부 시간(분)',
          data: stats.dailySeries.map((row) => row.totalMinutes),
          backgroundColor: '#1976d2',
          borderRadius: 4,
        },
      ],
    };
  }, [stats]);

  const doughnutData = useMemo(() => {
    if (!stats || stats.subjectBreakdown.length === 0) return null;
    return {
      labels: stats.subjectBreakdown.map((row) => row.subject),
      datasets: [
        {
          data: stats.subjectBreakdown.map((row) => row.totalMinutes),
          backgroundColor: stats.subjectBreakdown.map(
            (_row, i) => SUBJECT_COLORS[i % SUBJECT_COLORS.length]
          ),
        },
      ],
    };
  }, [stats]);

  return (
    <Box>
      <NavBar />
      <Container maxWidth="sm" sx={{ py: 3, pb: 6 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">공부 통계</Typography>
          <ToggleButtonGroup size="small" value={range} exclusive onChange={handleRangeChange}>
            <ToggleButton value="week">주간</ToggleButton>
            <ToggleButton value="month">월간</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {isLoading || !stats ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {stats.start} ~ {stats.end}
            </Typography>

            <Grid container spacing={1.5}>
              <Grid item xs={4}>
                <StatCard label="총 공부시간" value={`${stats.totalMinutes}분`} />
              </Grid>
              <Grid item xs={4}>
                <StatCard
                  label="평균 집중도"
                  value={stats.avgFocusLevel != null ? `${stats.avgFocusLevel} / 5` : '-'}
                />
              </Grid>
              <Grid item xs={4}>
                <StatCard
                  label="계획 달성률"
                  value={stats.planStats.rate != null ? `${stats.planStats.rate}%` : '-'}
                />
              </Grid>
            </Grid>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  일별 공부시간
                </Typography>
                {barData && (
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, title: { display: true, text: '분' } } },
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  과목별 비중
                </Typography>
                {doughnutData ? (
                  <Box sx={{ maxWidth: 280, mx: 'auto' }}>
                    <Doughnut
                      data={doughnutData}
                      options={{ plugins: { legend: { position: 'bottom' } } }}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    해당 기간에 공부 기록이 없습니다.
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  계획 달성률 ({stats.planStats.completed}/{stats.planStats.total})
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={stats.planStats.rate ?? 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Stack>
        )}
      </Container>
    </Box>
  );
}

export default StatsPage;
