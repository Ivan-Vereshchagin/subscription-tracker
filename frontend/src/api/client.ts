import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (email: string, password: string) =>
    apiClient.post('/auth/register', { email, password }),

  login: (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    return apiClient.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },
};

export const subscriptionsApi = {
  list: () => apiClient.get('/subscriptions/'),
  get: (id: string) => apiClient.get(`/subscriptions/${id}`),
  create: (data: any) => apiClient.post('/subscriptions/', data),
  update: (id: string, data: any) => apiClient.put(`/subscriptions/${id}`, data),
  delete: (id: string) => apiClient.delete(`/subscriptions/${id}`),
  statsByCategory: () => apiClient.get('/subscriptions/stats/by-category'),
  statsByPeriod: (start: string, end: string) =>
    apiClient.get('/subscriptions/stats/by-period', {
      params: { start_date: start, end_date: end },
    }),
};

export const paymentsApi = {
  list: () => apiClient.get('/payments/'),
  listBySubscription: (subscriptionId: string) =>
    apiClient.get(`/payments/subscription/${subscriptionId}`),
  create: (data: any) => apiClient.post('/payments/', data),
  statsByPeriod: (start: string, end: string) =>
    apiClient.get('/payments/stats/by-period', {
      params: { start_date: start, end_date: end },
    }),
  statsByCategory: (start: string, end: string) =>
    apiClient.get('/payments/stats/by-category', {
      params: { start_date: start, end_date: end },
    }),
};
