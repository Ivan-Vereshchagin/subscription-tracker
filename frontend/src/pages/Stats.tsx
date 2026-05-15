import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsApi } from '../api/client';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants/subscriptions';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

interface CategoryData {
  category: string;
  total: number;
  percentage: number;
  payments: Array<{
    id: string;
    subscription_name: string;
    amount: number;
    payment_date: string;
  }>;
}

export default function Stats() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState<{
    total: number;
    currency: string;
    year: number;
    month: number;
    categories: CategoryData[];
  } | null>(null);

  useEffect(() => {
    loadStats();
  }, [currentDate]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await paymentsApi.getMonthlyStats(year, month);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = MONTHS[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  return (
    <Container maxWidth="lg">
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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Button
              onClick={() => navigate('/dashboard')}
              startIcon={<ArrowBackIcon />}
              sx={{
                position: 'absolute',
                left: 0,
                color: 'white',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.2)',
                },
              }}
            >
              Назад
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 700, textAlign: 'center', width: '100%' }}>
              Статистика расходов
            </Typography>
          </Box>
        </Paper>

        {/* Навигация по месяцам */}
        <Paper elevation={0} sx={{ p: 2, mb: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3 }}>
            <Button onClick={handlePrevMonth} startIcon={<ChevronLeftIcon />}>
              Предыдущий
            </Button>
            <Typography variant="h5" sx={{ fontWeight: 700, minWidth: 200, textAlign: 'center' }}>
              {monthName} {year}
            </Typography>
            <Button onClick={handleNextMonth} endIcon={<ChevronRightIcon />}>
              Следующий
            </Button>
          </Box>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !stats || stats.categories.length === 0 ? (
          <Paper elevation={0} sx={{ p: 6, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Нет данных за этот месяц
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Подтвердите платежи, чтобы увидеть статистику
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Общая сумма */}
            <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Общие расходы за месяц
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {stats.total.toFixed(2)} {stats.currency}
              </Typography>
            </Paper>

            <Grid container spacing={4}>
              {/* Pie Chart */}
              <Grid size={{ xs: 12 }}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
                    Расходы по категориям
                  </Typography>
                  <Box sx={{ width: '100%', height: 600, minHeight: 600, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.categories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => `${entry.category} ${entry.percentage}%`}
                          outerRadius="75%"
                          fill="#8884d8"
                          dataKey="total"
                        >
                          {stats.categories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => [`${value} ₽`, 'Сумма']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Paper>
              </Grid>

              {/* Детализация */}
              <Grid size={{ xs: 12 }}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                    Детализация по категориям
                  </Typography>
                  <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {stats.categories.map((cat) => (
                      <Box key={cat.category} sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 700 }}>
                            {CATEGORY_ICONS[cat.category]} {cat.category}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            — {cat.total.toFixed(2)} ₽ ({cat.percentage}%)
                          </Typography>
                        </Box>
                        <List dense disablePadding sx={{ pl: 2 }}>
                          {cat.payments.map((payment) => (
                            <ListItem key={payment.id} sx={{ py: 0.5 }}>
                              <ListItemAvatar sx={{ minWidth: 40 }}>
                                <Avatar sx={{ bgcolor: CATEGORY_COLORS[cat.category] || '#94a3b8', width: 24, height: 24, fontSize: 12 }}>
                                  ₽
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={payment.subscription_name}
                                secondary={new Date(payment.payment_date).toLocaleDateString('ru-RU')}
                                sx={{ my: 0 }}
                              />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {payment.amount.toFixed(2)} ₽
                              </Typography>
                            </ListItem>
                          ))}
                        </List>
                        <Divider sx={{ mt: 1 }} />
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </Container>
  );
}
