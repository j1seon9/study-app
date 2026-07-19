// src/pages/StatsPage.jsx

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

import EqualizerRoundedIcon from '@mui/icons-material/EqualizerRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

import { Bar, Doughnut } from 'react-chartjs-2';

import NavBar from '../components/NavBar.jsx';
import { fetchStats } from '../api/stats.api.js';

import '../utils/chartSetup.js';


const SUBJECT_COLORS = [
  '#2563EB',
  '#EF4444',
  '#22C55E',
  '#F59E0B',
  '#7C3AED',
  '#0EA5E9',
  '#84CC16',
  '#8B5CF6',
  '#EC4899',
  '#6366F1',
];


function StatCard({ label, value }) {
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 4,
      }}
    >
      <CardContent
        sx={{
          textAlign: 'center',
          py: 2.5,
        }}
      >
        <Typography variant="h5">
          {value}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
        >
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}


function StatsPage() {
  const [range, setRange] = useState('week');

  const [stats, setStats] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState('');


  const loadStats = useCallback(
    async (currentRange) => {
      setIsLoading(true);
      setError('');

      try {
        const data = await fetchStats({
          range: currentRange,
        });

        setStats(data);

      } catch (err) {
        setError(
          err.response?.data?.message ||
          '통계를 불러오지 못했습니다.'
        );

      } finally {
        setIsLoading(false);
      }
    },
    []
  );


  useEffect(() => {
    loadStats(range);
  }, [range, loadStats]);


  const handleRangeChange = (_, value) => {
    if (value) {
      setRange(value);
    }
  };


  const barData = useMemo(() => {
    if (!stats) return null;

    return {
      labels: stats.dailySeries.map((row) =>
        new Date(row.date).toLocaleDateString(
          'ko-KR',
          {
            month: 'numeric',
            day: 'numeric',
          }
        )
      ),

      datasets: [
        {
          label: '공부 시간(분)',
          data: stats.dailySeries.map(
            (row) => row.totalMinutes
          ),
          backgroundColor: '#2563EB',
          borderRadius: 8,
        },
      ],
    };
  }, [stats]);


  const doughnutData = useMemo(() => {
    if (
      !stats ||
      stats.subjectBreakdown.length === 0
    ) {
      return null;
    }

    return {
      labels: stats.subjectBreakdown.map(
        (row) => row.subject
      ),

      datasets: [
        {
          data: stats.subjectBreakdown.map(
            (row) => row.totalMinutes
          ),

          backgroundColor:
            stats.subjectBreakdown.map(
              (_, index) =>
                SUBJECT_COLORS[
                index % SUBJECT_COLORS.length
                ]
            ),
        },
      ],
    };
  }, [stats]);


  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg,#F8FAFC 0%,#EFF6FF 50%,#EEF2FF 100%)',
      }}
    >

      <NavBar />


      <Container
        maxWidth="md"
        sx={{
          py: 2.5,
          pb: 6,
        }}
      >

        <Stack spacing={2}>


          {/* Header */}
          <Card>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >

                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                >

                  <EqualizerRoundedIcon
                    color="primary"
                    sx={{
                      fontSize: 36,
                    }}
                  />

                  <Box>
                    <Typography variant="h6">
                      공부 통계
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      학습 기록을 분석하여 성장 흐름을 확인합니다.
                    </Typography>
                  </Box>

                </Stack>


                <ToggleButtonGroup
                  size="small"
                  value={range}
                  exclusive
                  onChange={handleRangeChange}
                >
                  <ToggleButton value="week">
                    주간
                  </ToggleButton>

                  <ToggleButton value="month">
                    월간
                  </ToggleButton>

                </ToggleButtonGroup>

              </Stack>
            </CardContent>
          </Card>



          {error && (
            <Alert
              severity="error"
              onClose={() => setError('')}
              sx={{
                borderRadius: 3,
              }}
            >
              {error}
            </Alert>
          )}



          {isLoading || !stats ? (

            <Card>
              <Stack
                alignItems="center"
                sx={{
                  py: 6,
                }}
              >
                <CircularProgress size={28} />
              </Stack>
            </Card>

          ) : (

            <Stack spacing={2}>


              <Typography
                variant="body2"
                color="text.secondary"
              >
                {stats.start} ~ {stats.end}
              </Typography>



              <Grid
                container
                spacing={1.5}
              >

                <Grid
                  item
                  xs={12}
                  sm={4}
                >
                  <StatCard
                    label="총 공부시간"
                    value={`${stats.totalMinutes}분`}
                  />
                </Grid>


                <Grid
                  item
                  xs={12}
                  sm={4}
                >
                  <StatCard
                    label="평균 집중도"
                    value={
                      stats.avgFocusLevel != null
                        ? `${stats.avgFocusLevel} / 5`
                        : '-'
                    }
                  />
                </Grid>


                <Grid
                  item
                  xs={12}
                  sm={4}
                >
                  <StatCard
                    label="계획 달성률"
                    value={
                      stats.planStats.rate != null
                        ? `${stats.planStats.rate}%`
                        : '-'
                    }
                  />
                </Grid>

              </Grid>
              {/* Daily Study Chart */}
              <Card>
                <CardContent
                  sx={{
                    p: 3,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      mb: 2,
                    }}
                  >
                    <TrendingUpRoundedIcon
                      color="primary"
                    />

                    <Typography variant="subtitle1">
                      일별 공부시간
                    </Typography>
                  </Stack>


                  {barData && (
                    <Box
                      sx={{
                        width: '100%',
                        overflowX: 'auto',
                      }}
                    >
                      <Bar
                        data={barData}
                        options={{
                          responsive: true,

                          plugins: {
                            legend: {
                              display: false,
                            },
                          },

                          scales: {
                            y: {
                              beginAtZero: true,

                              title: {
                                display: true,
                                text: '분',
                              },
                            },
                          },
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>



              {/* Subject Chart */}
              <Card>
                <CardContent
                  sx={{
                    p: 3,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      mb: 2,
                    }}
                  >
                    과목별 공부 비중
                  </Typography>


                  {doughnutData ? (

                    <Box
                      sx={{
                        maxWidth: 320,
                        mx: 'auto',
                      }}
                    >
                      <Doughnut
                        data={doughnutData}
                        options={{
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    </Box>

                  ) : (

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                    >
                      해당 기간에 공부 기록이 없습니다.
                    </Typography>

                  )}

                </CardContent>
              </Card>



              {/* Plan Progress */}
              <Card>
                <CardContent
                  sx={{
                    p: 3,
                  }}
                >

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      mb: 2,
                    }}
                  >

                    <Typography variant="subtitle1">
                      계획 달성률
                    </Typography>


                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {stats.planStats.completed}
                      /
                      {stats.planStats.total}
                    </Typography>

                  </Stack>



                  <LinearProgress
                    variant="determinate"
                    value={
                      stats.planStats.rate ?? 0
                    }
                  />


                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      mt: 1,
                    }}
                  >
                    목표 대비 학습 계획 완료 비율
                  </Typography>

                </CardContent>
              </Card>


            </Stack>

          )}

        </Stack>

      </Container>

    </Box>
  );
}


export default StatsPage;