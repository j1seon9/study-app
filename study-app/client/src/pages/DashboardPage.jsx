import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';

import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';

import axios from 'axios';

import { useAuth } from '../context/AuthContext.jsx';
import NavBar from '../components/NavBar.jsx';


const API =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000';


const MENU_ITEMS = [
  {
    to: '/study-plan',
    label: '학습 계획',
    desc: 'AI 맞춤 학습 일정 관리',
    icon: CalendarMonthRoundedIcon,
  },
  {
    to: '/study-record',
    label: '공부 기록',
    desc: '학습 시간 기록',
    icon: AccessTimeRoundedIcon,
  },
  {
    to: '/test',
    label: '미니 테스트',
    desc: '약점 분석 테스트',
    icon: SchoolRoundedIcon,
  },
  {
    to: '/analysis',
    label: 'AI 분석',
    desc: '학습 데이터 분석',
    icon: TrendingUpRoundedIcon,
  },
];


function DashboardPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState({
    todayStudyMinutes: 0,
    todayTargetMinutes: 0,
    weeklyStudyMinutes: 0,
    weeklyTargetMinutes: 0,
    totalRecords: 0,
    planCount: 0,
    recentSubject: '-',
    aiScore: null,
  });


  const [loading, setLoading] = useState(true);


  useEffect(() => {
    loadDashboard();
  }, []);


  async function loadDashboard() {
    try {
      const token =
        localStorage.getItem('token');


      const { data } =
        await axios.get(
          `${API}/api/dashboard/summary`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      setSummary(data);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  }


  const todayPercent = useMemo(() => {

    if (!summary.todayTargetMinutes)
      return 0;


    return Math.min(
      100,
      Math.round(
        (summary.todayStudyMinutes /
          summary.todayTargetMinutes) *
        100
      )
    );

  }, [summary]);


  const weekPercent = useMemo(() => {

    if (!summary.weeklyTargetMinutes)
      return 0;


    return Math.min(
      100,
      Math.round(
        (summary.weeklyStudyMinutes /
          summary.weeklyTargetMinutes) *
        100
      )
    );

  }, [summary]);



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
          py: 2,
          pb: 6,
        }}
      >

        <Stack spacing={1.5}>


          <Paper
            sx={{
              p: 2,
              background:
                'linear-gradient(135deg,rgba(37,99,235,.08),rgba(124,58,237,.08))',
              backdropFilter:
                'blur(12px)',
            }}
          >

            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
            >

              <Avatar
                sx={{
                  width: 52,
                  height: 52,
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  background:
                    'linear-gradient(135deg,#2563EB,#7C3AED)',
                }}
              >

                {user?.name?.charAt(0)}

              </Avatar>


              <Box flex={1}>

                <Typography variant="h6">
                  {user?.name}님
                </Typography>


                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  AI 기반 맞춤 학습 대시보드
                </Typography>

              </Box>


              <Chip
                size="small"
                color="primary"
                icon={<SchoolRoundedIcon />}
                label="학생"
              />

            </Stack>

          </Paper>



          <Paper
            sx={{
              p: 2,
            }}
          >

            <Stack spacing={1}>

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >

                <Typography variant="subtitle2">
                  오늘의 학습 진행률
                </Typography>


                <Chip
                  size="small"
                  color="primary"
                  label={`${todayPercent}%`}
                />

              </Stack>


              <Stack
                direction="row"
                justifyContent="space-between"
              >

                <Typography variant="body2">
                  {summary.todayStudyMinutes}분
                </Typography>


                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  목표 {summary.todayTargetMinutes}분
                </Typography>

              </Stack>


              <LinearProgress
                variant="determinate"
                value={todayPercent}
              />

            </Stack>

          </Paper>



          <Paper
            sx={{
              p: 2,
            }}
          >

            <Stack spacing={1}>

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >

                <Typography variant="subtitle2">
                  이번 주 학습
                </Typography>


                <Chip
                  size="small"
                  color="secondary"
                  label={`${weekPercent}%`}
                />

              </Stack>


              <Stack
                direction="row"
                justifyContent="space-between"
              >

                <Typography variant="body2">
                  {summary.weeklyStudyMinutes}분
                </Typography>


                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  목표 {summary.weeklyTargetMinutes}분
                </Typography>

              </Stack>


              <LinearProgress
                variant="determinate"
                value={weekPercent}
                color="secondary"
              />

            </Stack>

          </Paper>



          <Grid
            container
            spacing={1.5}
          >

            <Grid
              item
              xs={12}
              sm={6}
            >

              <Paper
                sx={{
                  p: 2,
                  height: '100%',
                  transition: '.2s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                  },
                }}
              >

                <Stack spacing={0.8}>

                  <AccessTimeRoundedIcon
                    color="primary"
                    sx={{
                      fontSize: 30,
                    }}
                  />


                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    총 공부 기록
                  </Typography>


                  <Typography variant="h5">
                    {summary.totalRecords}
                  </Typography>


                  <Typography variant="caption">
                    누적 학습 기록
                  </Typography>

                </Stack>

              </Paper>

            </Grid>


            <Grid
              item
              xs={12}
              sm={6}
            >

              <Paper
                sx={{
                  p: 2,
                  height: '100%',
                  transition: '.2s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                  },
                }}
              >

                <Stack spacing={0.8}>

                  <CalendarMonthRoundedIcon
                    color="success"
                    sx={{
                      fontSize: 30,
                    }}
                  />


                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    등록된 계획
                  </Typography>


                  <Typography variant="h5">
                    {summary.planCount}
                  </Typography>


                  <Typography variant="caption">
                    현재 학습 계획
                  </Typography>

                </Stack>

              </Paper>

            </Grid>

          </Grid>
          {/* AI Analysis */}
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 4,
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{
                mb: 1.5,
              }}
            >
              <Typography variant="subtitle1">
                AI 학습 분석
              </Typography>

              <TrendingUpRoundedIcon
                color="primary"
              />
            </Stack>


            {summary.aiScore == null ? (
              <Typography
                variant="body2"
                color="text.secondary"
              >
                아직 AI 분석 결과가 없습니다.
                <br />
                공부 기록과 미니테스트를 입력하면
                AI가 맞춤 학습 리포트를 제공합니다.
              </Typography>
            ) : (
              <Stack spacing={1.5}>

                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {summary.aiScore}

                  <Typography
                    component="span"
                    variant="h6"
                    sx={{
                      ml: 0.5,
                    }}
                  >
                    점
                  </Typography>

                </Typography>


                <LinearProgress
                  variant="determinate"
                  value={summary.aiScore}
                />


                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  AI는 최근 공부시간,
                  목표 달성률,
                  미니테스트 결과,
                  모의고사 성적 등을
                  종합하여 현재 학습 상태를 분석합니다.
                </Typography>


                <Chip
                  size="small"
                  sx={{
                    width: 'fit-content',
                  }}

                  color={
                    summary.aiScore >= 90
                      ? 'success'
                      : summary.aiScore >= 70
                        ? 'primary'
                        : summary.aiScore >= 50
                          ? 'warning'
                          : 'error'
                  }

                  label={
                    summary.aiScore >= 90
                      ? '매우 우수'
                      : summary.aiScore >= 70
                        ? '양호'
                        : summary.aiScore >= 50
                          ? '보통'
                          : '학습 보완 필요'
                  }
                />

              </Stack>
            )}

          </Paper>



          {/* Loading */}
          {loading && (
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 4,
              }}
            >

              <Stack spacing={1.5}>

                <Typography
                  variant="body2"
                >
                  데이터를 불러오는 중입니다...
                </Typography>


                <LinearProgress />

              </Stack>

            </Paper>
          )}


        </Stack>

      </Container>

    </Box>
  );
}


export default DashboardPage;