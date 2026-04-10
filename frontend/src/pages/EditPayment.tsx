import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentsApi } from '../api/client';
import type { Payment } from '../types';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNotification } from '../context/NotificationContext';

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Ожидается',
  completed: '✅ Завершён',
  failed: '❌ Не удался',
  cancelled: '🚫 Отменён',
};

export default function EditPayment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'RUB',
    payment_date: '',
    period_start: '',
    period_end: '',
    status: 'pending',
    subscription_id: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { notifyError } = useNotification();

  // Загрузка данных платежа
  useEffect(() => {
    loadPayment();
  }, [id]);

  const loadPayment = async () => {
    if (!id) return;
    
    try {
      const response = await paymentsApi.get(id);
      const payment: Payment = response.data;
      
      setFormData({
        amount: payment.amount.toString(),
        currency: payment.currency,
        payment_date: payment.payment_date.split('T')[0],
        period_start: payment.period_start.split('T')[0],
        period_end: payment.period_end.split('T')[0],
        status: payment.status,
        subscription_id: payment.subscription_id,
      });
      
      setIsCompleted(payment.status === 'completed');
    } catch (error: any) {
      console.error('Failed to load payment:', error);
      if (error.response?.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (event: any) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Введите корректную сумму';
    }
    
    if (!formData.payment_date) {
      newErrors.payment_date = 'Введите дату платежа';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    setIsSubmitting(true);
    
    const paymentData = {
      subscription_id: formData.subscription_id,
      amount: parseFloat(formData.amount),
      currency: 'RUB',  // Только рубли
      payment_date: formData.payment_date + 'T00:00:00',
      period_start: formData.period_start + 'T00:00:00',
      period_end: formData.period_end + 'T00:00:00',
    };
    
    try {
      if (!id) throw new Error('No payment ID');
      await paymentsApi.update(id, paymentData);
      navigate('/payments');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      
      if (Array.isArray(detail)) {
        const messages = detail.map((e: any) => e.msg).join(', ');
        notifyError('Ошибка: ' + messages);
      } else if (typeof detail === 'string') {
        notifyError('Ошибка: ' + detail);
      } else {
        notifyError('Ошибка при сохранении платежа');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (notFound) {
    return (
      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Платёж не найден
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/payments')}
            startIcon={<ArrowBackIcon />}
          >
            Назад к истории платежей
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: 3,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              onClick={() => navigate('/payments')}
              startIcon={<ArrowBackIcon />}
              sx={{
                color: 'white',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              Назад
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Редактирование платежа
            </Typography>
          </Box>
        </Paper>

        {/* Form */}
        <Paper
          elevation={0}
          sx={{
            p: 5,
            borderRadius: 3,
            boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.08)',
          }}
        >
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Сумма */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Сумма"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleChange('amount')}
                  error={!!errors.amount}
                  helperText={errors.amount}
                  placeholder="0.00"
                  InputProps={{ inputProps: { step: '0.01', min: '0' } }}
                  required
                />
              </Grid>

              {/* Валюта (только рубли) */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Валюта"
                  value="₽ RUB"
                  InputProps={{ readOnly: true }}
                  helperText="Только рубли"
                />
              </Grid>

              {/* Дата платежа */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Дата платежа"
                  name="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={handleChange('payment_date')}
                  error={!!errors.payment_date}
                  helperText={errors.payment_date}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>

              {/* Статус (только просмотр) */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Статус"
                  value={STATUS_LABELS[formData.status]}
                  InputProps={{ readOnly: true }}
                />
                {formData.status === 'pending' && (
                  <FormHelperText>
                    ℹ️ Для подтверждения используйте кнопку "Подтвердить" на Dashboard
                  </FormHelperText>
                )}
              </Grid>

              {/* Период: Начало */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Начало периода"
                  name="period_start"
                  type="date"
                  value={formData.period_start}
                  onChange={handleChange('period_start')}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Период: Конец */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Конец периода"
                  name="period_end"
                  type="date"
                  value={formData.period_end}
                  onChange={handleChange('period_end')}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Кнопки */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/payments')}
                    disabled={isSubmitting}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={isSubmitting}
                    sx={{
                      minWidth: 150,
                      background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                    }}
                  >
                    {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </Container>
  );
}
