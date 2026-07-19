import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';

import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import { useAuth } from '../context/AuthContext.jsx';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        '로그인에 실패했습니다.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        px: 2,
        py: 4,
        background:
          'linear-gradient(180deg,#F8FAFC 0%,#EFF6FF 50%,#EEF2FF 100%)',
      }}
    >
      <Paper
        elevation={0}
        className="fade-in"
        sx={{
          width: '100%',
          maxWidth: 470,
          p: 5,
          borderRadius: 6,
          backdropFilter: 'blur(18px)',
          background: 'rgba(255,255,255,.82)',
          border: '1px solid rgba(255,255,255,.7)',
          boxShadow: '0 20px 60px rgba(15,23,42,.08)',
        }}
      >
        <Stack
          spacing={3}
          alignItems="center"
        >
          <Box
            sx={{
              width: 84,
              height: 84,
              borderRadius: '28px',
              background:
                'linear-gradient(135deg,#2563EB,#7C3AED)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow:
                '0 15px 40px rgba(37,99,235,.28)',
            }}
          >
            <SchoolRoundedIcon
              sx={{
                fontSize: 42,
              }}
            />
          </Box>

          <Stack
            spacing={1}
            alignItems="center"
          >
            <Chip
              color="secondary"
              icon={<AutoAwesomeRoundedIcon />}
              label="AI Study Platform"
            />

            <Typography
              variant="h4"
              fontWeight={700}
            >
              다시 오신 것을 환영합니다
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              textAlign="center"
            >
              AI 기반 자기주도학습 플랫폼에 로그인하여
              <br />
              오늘의 학습을 시작해보세요.
            </Typography>
          </Stack>

          <Divider
            flexItem
            sx={{ my: 1 }}
          />

          {error && (
            <Alert
              severity="error"
              sx={{ width: '100%' }}
            >
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.25,
            }}
          >
            <TextField
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailRoundedIcon />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />

            <TextField
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockRoundedIcon />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                mt: 1,
                height: 54,
                fontSize: '1rem',
                fontWeight: 700,
                background:
                  'linear-gradient(135deg,#2563EB,#7C3AED)',

                '&:hover': {
                  background:
                    'linear-gradient(135deg,#1D4ED8,#6D28D9)',
                },
              }}
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </Button>

            <Typography
              variant="body2"
              textAlign="center"
              sx={{ mt: 1 }}
            >
              계정이 없으신가요?{' '}
              <Typography
                component={Link}
                to="/register"
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  textDecoration: 'none',

                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                회원가입
              </Typography>
            </Typography>
          </Box>

          <Divider
            flexItem
            sx={{ my: 3 }}
          />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
            >
              AI 기반 개인 맞춤형 자율학습 지원 웹서비스
            </Typography>

            <Chip
              size="small"
              color="primary"
              label="v1.0"
              variant="outlined"
            />
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

export default LoginPage;