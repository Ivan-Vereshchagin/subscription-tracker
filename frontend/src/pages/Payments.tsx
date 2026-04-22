import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsApi, subscriptionsApi } from '../api/client';
import type { Payment, Subscription } from '../types';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  MenuItem,
  Grid,
  Button,
  Chip,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';

// Статусы платежей с переводом
const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидается',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

const STATUS_COLORS: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  pending: 'warning',
  completed: 'success',
  cancelled: 'default',
};

type SortField = 'payment_date' | 'amount' | 'subscription_id';
type SortOrder = 'asc' | 'desc';

export default function Payments() {
  const navigate = useNavigate();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Фильтры
  const [filters, setFilters] = useState({
    status: '',
    subscription_id: '',
    date_from: '',
    date_to: '',
  });
  
  // Сортировка
  const [sortField, setSortField] = useState<SortField>('payment_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Пагинация
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [paymentsRes, subscriptionsRes] = await Promise.all([
        paymentsApi.list(),
        subscriptionsApi.list(),
      ]);
      setPayments(paymentsRes.data.items);
      setSubscriptions(subscriptionsRes.data.items);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Получение названия подписки по ID
  const getSubscriptionName = (subscriptionId: string) => {
    const sub = subscriptions.find(s => s.id === subscriptionId);
    return sub ? sub.name : 'Неизвестно';
  };

  // Фильтрация платежей
  const filteredPayments = payments.filter(payment => {
    if (filters.status && payment.status !== filters.status) return false;
    if (filters.subscription_id && payment.subscription_id !== filters.subscription_id) return false;
    if (filters.date_from && payment.payment_date < filters.date_from) return false;
    if (filters.date_to && payment.payment_date > filters.date_to) return false;
    return true;
  });

  // Сортировка
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];
    
    if (sortField === 'subscription_id') {
      aVal = getSubscriptionName(a.subscription_id);
      bVal = getSubscriptionName(b.subscription_id);
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Обработчики
  const handleSort = (field: SortField) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortField(field);
    setSortOrder(isAsc ? 'desc' : 'asc');
  };

  const handleFilterChange = (field: string) => (e: any) => {
    setFilters(prev => ({ ...prev, [field]: e.target.value }));
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      subscription_id: '',
      date_from: '',
      date_to: '',
    });
    setPage(0);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Пагинированные данные
  const paginatedPayments = sortedPayments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
            <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
              История платежей
            </Typography>
            <IconButton
              onClick={loadData}
              sx={{ color: 'white' }}
              title="Обновить"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Paper>

        {/* Фильтры */}
        <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                select
                label="Статус"
                value={filters.status}
                onChange={handleFilterChange('status')}
                size="small"
              >
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="completed">✅ Завершён</MenuItem>
                <MenuItem value="pending">⏳ Ожидается</MenuItem>
                <MenuItem value="cancelled">🚫 Отменён</MenuItem>
              </TextField>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                select
                label="Подписка"
                value={filters.subscription_id}
                onChange={handleFilterChange('subscription_id')}
                size="small"
              >
                <MenuItem value="">Все</MenuItem>
                {subscriptions
                  .filter(sub => sub.is_active)  // Только активные
                  .map(sub => (
                    <MenuItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                label="С даты"
                type="date"
                value={filters.date_from}
                onChange={handleFilterChange('date_from')}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                label="По дату"
                type="date"
                value={filters.date_to}
                onChange={handleFilterChange('date_to')}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={handleClearFilters}
                sx={{ height: 40 }}
              >
                Сбросить
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Таблица */}
        <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ background: '#f8fafc' }}>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'payment_date'}
                      direction={sortField === 'payment_date' ? sortOrder : 'asc'}
                      onClick={() => handleSort('payment_date')}
                    >
                      Дата
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'subscription_id'}
                      direction={sortField === 'subscription_id' ? sortOrder : 'asc'}
                      onClick={() => handleSort('subscription_id')}
                    >
                      Подписка
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'amount'}
                      direction={sortField === 'amount' ? sortOrder : 'asc'}
                      onClick={() => handleSort('amount')}
                    >
                      Сумма
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Период</TableCell>
                  <TableCell>Статус</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        {loading ? 'Загрузка...' : 'Платежи не найдены'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPayments.map(payment => (
                    <TableRow
                      key={payment.id}
                      sx={{
                        '&:hover': {
                          background: 'rgba(99, 102, 241, 0.04)',
                        },
                      }}
                    >
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {getSubscriptionName(payment.subscription_id)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="primary">
                          {payment.amount} {payment.currency}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(payment.period_start).toLocaleDateString('ru-RU')} — 
                          {new Date(payment.period_end).toLocaleDateString('ru-RU')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[payment.status] || payment.status}
                          color={STATUS_COLORS[payment.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Пагинация */}
          <TablePagination
            component="div"
            count={sortedPayments.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Записей на странице"
          />
        </Paper>
      </Box>
    </Container>
  );
}
