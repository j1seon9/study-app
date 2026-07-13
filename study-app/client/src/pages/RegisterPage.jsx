import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import axiosInstance from '../api/axiosInstance.js';

function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

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
      component="form"
      onSubmit={handleSubmit}
      sx={{ maxWidth: 360, mx: 'auto', mt: 8, px: 2, display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography variant="h5" textAlign="center">
        회원가입
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField label="이름" value={form.name} onChange={handleChange('name')} required fullWidth />
      <TextField
        label="이메일"
        type="email"
        value={form.email}
        onChange={handleChange('email')}
        required
        fullWidth
      />
      <TextField
        label="비밀번호 (8자 이상)"
        type="password"
        value={form.password}
        onChange={handleChange('password')}
        required
        fullWidth
      />
      <Button type="submit" variant="contained" size="large" disabled={isSubmitting} fullWidth>
        {isSubmitting ? '가입 중...' : '회원가입'}
      </Button>

      <Typography variant="body2" textAlign="center">
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </Typography>
    </Box>
  );
}

export default RegisterPage;
