import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionsApi } from '../api/client';
import { type Subscription } from '../types';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Box,
} from '@mui/material';

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

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h4">Мои подписки</Typography>
        <Box>
          <Button
            variant="contained"
            onClick={() => navigate('/subscriptions/new')}
            sx={{ mr: 2 }}
          >
            Добавить
          </Button>
          <Button variant="outlined" onClick={handleLogout}>
            Выйти
          </Button>
        </Box>
      </Box>

      {subscriptions.length === 0 ? (
        <Typography>У вас пока нет подписок</Typography>
      ) : (
        <Grid container spacing={3}>
          {subscriptions.map((sub) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={sub.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{sub.name}</Typography>
                  <Typography color="text.secondary">
                    {sub.price} {sub.currency}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {sub.billing_cycle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
