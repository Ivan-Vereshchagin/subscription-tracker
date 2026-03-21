import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsApi } from '../api/client';
import type { Subscription } from '../types';
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

export default function Dashboard() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await subscriptionsApi.list();
      setSubscriptions(response.data.items);
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const getBillingCycleEmoji = (cycle: string) => {
    const emojis: Record<string, string> = {
      weekly: '📅',
      monthly: '🗓️',
      quarterly: '📆',
      'semi-annual': '📆',
      yearly: '📅',
    };
    return emojis[cycle] || '💳';
  };

  const getTotalMonthlyCost = () => {
    return subscriptions.reduce((total, sub) => {
      const price = sub.price;
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
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Управляйте своими подписками в одном месте
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/subscriptions/new')}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
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
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AttachMoneyIcon sx={{ fontSize: 20 }} />
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                В месяц
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {getTotalMonthlyCost().toFixed(2)} ₽
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
        <Grid container spacing={3}>
          {subscriptions.map((sub) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={sub.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Chip
                      label={sub.category}
                      size="small"
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
                        fontWeight: 600,
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {getBillingCycleEmoji(sub.billing_cycle)}
                    </Typography>
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

                  <Box sx={{ mt: 'auto' }}>
                    <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                      {sub.price} {sub.currency}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
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
      )}
    </Container>
  );
}
