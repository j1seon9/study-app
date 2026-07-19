// src/pages/RegisterPage.jsx

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';

import axiosInstance from '../api/axiosInstance.js';

function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      await axiosInstance.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      const serverErrors = err.response?.data?.errors;

      setError(
        serverErrors?.map((e2) => e2.message).join(', ') ||
        err.response?.data?.message ||
        '회원가입에 실패했습니다.'
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
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background:
          'radial-gradient(circle at top left, rgba(37,99,235,.12), transparent 35%), radial-gradient(circle at bottom right, rgba(124,58,237,.12), transparent 35%)',
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 4,
          borderRadius: 5,
          boxShadow: 5,
        }}
      >
        <Stack spacing={3}>

          {/* Header */}
          <Box textAlign="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                mx: 'auto',
                mb: 2,
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'linear-gradient(135deg,#2563EB 0%,#7C3AED 100%)',
                color: '#fff',
                boxShadow: 4,
              }}
            >
              <PersonAddRoundedIcon fontSize="large" />
            </Box>

            <Typography variant="h5">
              회원가입
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 1,
                color: 'text.secondary',
              }}
            >
              AI 학습 서비스를 시작하세요
            </Typography>
          </Box>


          {error && (
            <Alert
              severity="error"
              sx={{
                borderRadius: 3,
              }}
            >
              {error}
            </Alert>
          )}


          {/* Form */}
          <Stack spacing={2}>
            <TextField
              label="이름"
              value={form.name}
              onChange={handleChange('name')}
              required
            />

            <TextField
              label="이메일"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              required
            />

            <TextField
              label="비밀번호"
              type="password"
              helperText="8자 이상 입력해주세요"
              value={form.password}
              onChange={handleChange('password')}
              required
            />
          </Stack>


          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            fullWidth
            sx={{
              mt: 1,
            }}
          >
            {isSubmitting ? '가입 중...' : '회원가입'}
          </Button>


          <Divider />


          <Typography
            variant="body2"
            textAlign="center"
          >
            이미 계정이 있으신가요?
            <Box
              component={Link}
              to="/login"
              sx={{
                ml: 0.5,
                color: 'primary.main',
                fontWeight: 600,
                '&:hover': {
                  color: 'secondary.main',
                },
              }}
            >
              로그인
            </Box>
          </Typography>

        </Stack>
      </Paper>
    </Box>
  );
}

export default RegisterPage;