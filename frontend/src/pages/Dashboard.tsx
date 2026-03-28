import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsApi, paymentsApi } from '../api/client';
import type { Subscription, Payment } from '../types';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Box,
  Paper,
  IconButton,
  Chip,
  Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';

export default function Dashboard() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadSubscriptions();
    loadPendingPayments();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await subscriptionsApi.list();
      const activeSubscriptions = response.data.items.filter((sub: Subscription) => sub.is_active);
      setSubscriptions(activeSubscriptions);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  const loadPendingPayments = async () => {
    try {
      const response = await paymentsApi.listPending();
      setPendingPayments(response.data.items);
    } catch (error) {
      console.error('Failed to load pending payments:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Вы уверены, что хотите удалить эту подписку?')) {
      return;
    }

    try {
      await subscriptionsApi.update(id, { is_active: false });
      setSubscriptions(prev => prev.filter(sub => sub.id !== id));
    } catch (error) {
      console.error('Failed to archive subscription:', error);
      alert('Ошибка при удалении подписки');
    }
  };

  const handleConfirmPayment = async (paymentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await paymentsApi.confirm(paymentId);
      // Обновляем список pending платежей
      await loadPendingPayments();
      // Обновляем подписки (возможно, next_billing_date обновился)
      await loadSubscriptions();
      alert('Платёж подтверждён!');
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      alert('Ошибка при подтверждении платежа');
    }
  };

  const getTotalMonthlyCost = () => {
    if (subscriptions.length === 0) return 0;
    
    return subscriptions.reduce((total, sub) => {
      const price = typeof sub.price === 'string' ? parseFloat(sub.price) : sub.price;
      switch (sub.billing_cycle) {
        case 'weekly':
          return total + price * 4;
        case 'monthly':
          return total + price;
        case 'quarterly':
          return total + price / 3;
        case 'semi-annual':
          return total + price / 6;
        case 'yearly':
          return total + price / 12;
        default:
          return total + price;
      }
    }, 0);
  };

  const getSubscriptionName = (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    return sub ? sub.name : 'Подписка';
  };

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mt: 4,
          mb: 4,
          p: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Мои подписки
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AttachMoneyIcon />}
              onClick={() => navigate('/payments/new')}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                },
              }}
            >
              Добавить платёж
            </Button>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => navigate('/payments')}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              История платежей
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/subscriptions/new')}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                  borderColor: 'rgba(255, 255, 255, 0.8)',
                },
              }}
            >
              Добавить
            </Button>
            <IconButton
              onClick={handleLogout}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Stats */}
        <Box sx={{ mt: 3, display: 'flex', gap: 3 }}>
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 2,
              p: 2,
              flex: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
              В месяц
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {Number(getTotalMonthlyCost()).toFixed(2)} ₽
            </Typography>
          </Box>
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 2,
              p: 2,
              flex: 1,
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
              Всего подписок
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {subscriptions.length}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Subscriptions Grid */}
      {subscriptions.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            border: '2px dashed',
            borderColor: 'divider',
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 2,
              bgcolor: 'primary.light',
            }}
          >
            <AttachMoneyIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            У вас пока нет подписок
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Добавьте первую подписку, чтобы отслеживать расходы
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/subscriptions/new')}
          >
            Добавить подписку
          </Button>
        </Paper>
      ) : (
        <>
          {/* Секция предстоящих платежей */}
          {pendingPayments.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                mb: 4,
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '2px solid #f59e0b',
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#92400e' }}>
                ⏰ Предстоящие платежи ({pendingPayments.length})
              </Typography>
              <Grid container spacing={2}>
                {pendingPayments.map((payment) => (
                  <Grid size={{ xs: 12, sm: 6, md: 12 }} key={payment.id}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {getSubscriptionName(payment.subscription_id)}
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
                        {payment.amount} {payment.currency}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {new Date(payment.payment_date).toLocaleDateString('ru-RU')}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={(e) => handleConfirmPayment(payment.id, e)}
                          sx={{ flex: 1 }}
                        >
                          ✅ Подтвердить
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/payments/${payment.id}/edit`)}
                        >
                          ✏️
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          <Grid container spacing={3}>
          {subscriptions.map((sub) => (
            <Grid size={{ xs: 12, sm: 6, md: 12 }} key={sub.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  background: 'linear-gradient(135deg, #fce7f3 0%, #f1f5f9 100%)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px 0 rgba(99, 102, 241, 0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 30px 0 rgba(99, 102, 241, 0.15)',
                  },
                }}
              >
                {/* Кнопки в правом верхнем углу */}
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1, display: 'flex', gap: 0.5 }}>
                  <IconButton
                    onClick={(e) => handleArchive(sub.id, e)}
                    sx={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      '&:hover': {
                        background: 'rgba(239, 68, 68, 0.2)',
                      },
                    }}
                    size="small"
                    title="Удалить подписку"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => navigate(`/subscriptions/${sub.id}/edit`)}
                    sx={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: '#6366f1',
                      '&:hover': {
                        background: 'rgba(99, 102, 241, 0.2)',
                      },
                    }}
                    size="small"
                    title="Редактировать"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>

                <CardContent sx={{ flexGrow: 1, pt: 2 }}>
                  {/* Категория в верхнем левом углу */}
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={sub.category}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        fontWeight: 600,
                        justifyContent: 'flex-start',
                      }}
                    />
                  </Box>

                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    {sub.name}
                  </Typography>

                  {sub.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2, lineHeight: 1.5 }}
                    >
                      {sub.description}
                    </Typography>
                  )}

                  <Box sx={{ mt: 'auto', textAlign: 'center' }}>
                    <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                      {sub.price} ₽
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {sub.billing_cycle === 'weekly' && 'в неделю'}
                      {sub.billing_cycle === 'monthly' && 'в месяц'}
                      {sub.billing_cycle === 'quarterly' && 'в квартал'}
                      {sub.billing_cycle === 'semi-annual' && 'в полгода'}
                      {sub.billing_cycle === 'yearly' && 'в год'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </>
      )}
    </Container>
  );
}
