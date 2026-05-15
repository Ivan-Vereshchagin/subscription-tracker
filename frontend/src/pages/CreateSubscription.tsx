import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsApi } from '../api/client';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import { useNotification } from '../context/NotificationContext';
import { CATEGORIES, BILLING_CYCLES } from '../constants/subscriptions';
import { getApiError } from '../api/client';

export default function CreateSubscription() {
  const { notifyError } = useNotification();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    billing_cycle: 'monthly',
    description: '',
    next_billing_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Введите название подписки';
    }
    
    if (!formData.category) {
      newErrors.category = 'Выберите категорию';
    }
    
    if (!formData.price) {
      newErrors.price = 'Введите цену';
    } else {
      const priceNum = parseFloat(formData.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        newErrors.price = 'Цена должна быть больше 0';
      }
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
    
    let nextBillingDate = null;
    if (formData.next_billing_date) {
      nextBillingDate = formData.next_billing_date + 'T00:00:00';
    }
    
    const subscriptionData = {
      name: formData.name.trim(),
      category: formData.category,
      price: parseFloat(formData.price),
      currency: 'RUB',
      billing_cycle: formData.billing_cycle,
      description: formData.description.trim() || null,
      next_billing_date: nextBillingDate,
      is_active: true,
    };
    
    try {
      await subscriptionsApi.create(subscriptionData);
      navigate('/dashboard');
    } catch (err: unknown) {
      notifyError('Ошибка: ' + (getApiError(err) ?? 'Ошибка при создании подписки'));
    } finally {
      setIsSubmitting(false);
    }
  };

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
              onClick={() => navigate('/dashboard')}
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
            <Typography variant="h4"
              sx={{
                fontWeight: 700,
                textAlign: 'center'
              }}
            >
              Новая подписка
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
              {/* Название */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Название подписки"
                  name="name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  placeholder="Например: Netflix Premium"
                  required
                />
              </Grid>

              {/* Категория */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required error={!!errors.category}>
                  <InputLabel>Категория</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleChange('category')}
                    label="Категория"
                  >
                    {CATEGORIES.map(cat => (
                      <MenuItem key={cat.value} value={cat.value}>
                        <span style={{ marginRight: 8 }}>{cat.icon}</span>
                        {cat.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.category && (
                    <FormHelperText>{errors.category}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Цена */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Цена"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleChange('price')}
                  error={!!errors.price}
                  helperText={errors.price}
                  placeholder="0.00"
                  InputProps={{ inputProps: { step: '0.01', min: '0' } }}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel>Период оплаты</InputLabel>
                  <Select
                    name="billing_cycle"
                    value={formData.billing_cycle}
                    onChange={handleChange('billing_cycle')}
                    label="Период оплаты"
                  >
                    {BILLING_CYCLES.map(cycle => (
                      <MenuItem key={cycle.value} value={cycle.value}>
                        {cycle.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Описание */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Описание (опционально)"
                  name="description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={handleChange('description')}
                  placeholder="Расскажите подробнее о подписке..."
                  helperText={`${formData.description.length}/1000`}
                  inputProps={{ maxLength: 1000 }}
                />
              </Grid>

              {/* Дата списания */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Дата следующего списания"
                  name="next_billing_date"
                  type="date"
                  value={formData.next_billing_date}
                  onChange={handleChange('next_billing_date')}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Пустой Grid для симметрии */}
              <Grid size={{ xs: 12, sm: 6 }} />

              {/* Кнопки */}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/dashboard')}
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
