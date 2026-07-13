import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import { Link } from 'react-router-dom';
import EventNoteIcon from '@mui/icons-material/EventNote';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import BarChartIcon from '@mui/icons-material/BarChart';
import QuizIcon from '@mui/icons-material/Quiz';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../context/AuthContext.jsx';
import NavBar from '../components/NavBar.jsx';

const MENU_ITEMS = [
  { to: '/plans', label: '공부 계획', icon: EventNoteIcon, desc: '오늘 할 일을 등록하고 관리해요' },
  { to: '/records', label: '공부 기록', icon: HistoryEduIcon, desc: '실제로 공부한 시간을 기록해요' },
  { to: '/stats', label: '통계', icon: BarChartIcon, desc: '주간/월간 공부시간을 확인해요' },
  { to: '/weekly-tests', label: '미니테스트', icon: QuizIcon, desc: '주간 테스트 점수를 관리해요' },
  { to: '/mock-exams', label: '모의고사', icon: AssessmentIcon, desc: '성적표 사진으로 빠르게 기록해요' },
  { to: '/ai-report', label: 'AI 리포트', icon: AutoAwesomeIcon, desc: 'AI가 분석한 맞춤 학습 추천을 받아요' },
];

/**
 * 대시보드 - 각 기능으로 이동하는 카드 메뉴
 * 실제 요약 지표(오늘의 공부시간 등)는 이후 단계에서 확장 가능
 */
function DashboardPage() {
  const { user } = useAuth();

  return (
    <Box>
      <NavBar />
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Typography variant="h5">환영합니다, {user?.name}님</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          아래에서 원하는 기능으로 바로 이동할 수 있어요.
        </Typography>

        <Grid container spacing={1.5}>
          {MENU_ITEMS.map(({ to, label, icon: Icon, desc }) => (
            <Grid item xs={6} key={to}>
              <Card variant="outlined">
                <CardActionArea component={Link} to={to} sx={{ height: '100%' }}>
                  <CardContent>
                    <Icon color="primary" sx={{ mb: 1 }} />
                    <Typography variant="subtitle1">{label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {desc}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default DashboardPage;
