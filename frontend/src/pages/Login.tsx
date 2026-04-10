import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  InputAdornment,
  IconButton,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister && password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    try {
      if (isRegister) {
        await authApi.register(email, password);
        notifySuccess('Регистрация успешна! Теперь войдите.');
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        const response = await authApi.login(email, password);
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        notifySuccess('Добро пожаловать!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const errorMsg = Array.isArray(detail) 
        ? detail.map((e: any) => e.msg).join(', ') 
        : typeof detail === 'string' ? detail : 'Ошибка при входе';
      
      setError(errorMsg);
      notifyError(errorMsg);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 5,
            borderRadius: 3,
            boxShadow: '0 8px 32px 0 rgba(99, 102, 241, 0.15)',
            width: '100%',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
                bg: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LockOutlinedIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {isRegister ? 'Создать аккаунт' : 'С возвращением!'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isRegister
                ? 'Заполните форму для регистрации'
                : 'Введите данные для входа'}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon color="action" />
                  </InputAdornment>
                ),
              }}
              placeholder="you@example.com"
            />

            <TextField
              fullWidth
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              placeholder="••••••••"
            />

            {isRegister && (
              <TextField
                fullWidth
                label="Подтвердите пароль"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
                error={confirmPassword !== '' && confirmPassword !== password}
                helperText={
                  confirmPassword !== '' && confirmPassword !== password
                    ? 'Пароли не совпадают'
                    : ''
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                mt: 4,
                mb: 2,
                py: 1.5,
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              }}
            >
              {isRegister ? 'Зарегистрироваться' : 'Войти'}
            </Button>

            <Button
              fullWidth
              onClick={() => {
                setIsRegister(!isRegister);
                setPassword('');
                setConfirmPassword('');
                setError('');
              }}
              sx={{ color: 'text.secondary' }}
            >
              {isRegister
                ? 'Уже есть аккаунт? Войти'
                : 'Нет аккаунта? Зарегистрироваться'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
