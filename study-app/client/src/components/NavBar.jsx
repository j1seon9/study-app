import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * 상단: 타이틀 + 로그아웃
 * 하단: 가로 스크롤 가능한 메뉴 (모바일에서 메뉴가 많아져도 줄바꿈 없이 스크롤로 대응)
 */
const NAV_ITEMS = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/plans', label: '공부 계획' },
  { to: '/records', label: '공부 기록' },
  { to: '/stats', label: '통계' },
  { to: '/weekly-tests', label: '미니테스트' },
  { to: '/mock-exams', label: '모의고사' },
  { to: '/ai-report', label: 'AI 리포트' },
];

function NavBar() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ gap: 1 }}>
        <Typography variant="h6" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          자율학습 지원
        </Typography>
        <Button size="small" variant="outlined" onClick={logout}>
          로그아웃
        </Button>
      </Toolbar>
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          px: 1,
          pb: 1,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {NAV_ITEMS.map((item) => (
          <Button
            key={item.to}
            component={Link}
            to={item.to}
            size="small"
            variant={location.pathname === item.to ? 'contained' : 'text'}
            sx={{ flexShrink: 0 }}
          >
            {item.label}
          </Button>
        ))}
      </Box>
    </AppBar>
  );
}

export default NavBar;
