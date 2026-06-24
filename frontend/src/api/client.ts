import axios from 'axios';
import type { SubscriptionPayload, PaymentPayload } from '../types';

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
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
          localStorage.setItem('access_token', res.data.access_token);
          localStorage.setItem('refresh_token', res.data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          return apiClient(originalRequest);
        } catch {
          // refresh не сработал — на логин
        }
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function getApiError(err: unknown): string | null {
  if (err && typeof err === 'object' && 'response' in err) {
    const detail = (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (Array.isArray(detail)) {
      return detail.map((e: { msg: string }) => e.msg).join(', ');
    }
    if (typeof detail === 'string') return detail;
  }
  return null;
}

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
  create: (data: SubscriptionPayload) => apiClient.post('/subscriptions/', data),
  update: (id: string, data: Partial<SubscriptionPayload>) => apiClient.put(`/subscriptions/${id}`, data),
  delete: (id: string) => apiClient.delete(`/subscriptions/${id}`),
  statsByCategory: () => apiClient.get('/subscriptions/stats/by-category'),
  statsByPeriod: (start: string, end: string) =>
    apiClient.get('/subscriptions/stats/by-period', {
      params: { start_date: start, end_date: end },
    }),
};

export const statementsApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/statements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  confirm: (transactions: {
    transaction_date: string;
    transaction_amount: number;
    transaction_currency: string;
    subscription_id: string;
  }[]) => apiClient.post('/statements/confirm', { transactions }),
};

export const paymentsApi = {
  list: () => apiClient.get('/payments/'),
  listPending: () => apiClient.get('/payments/pending'),
  get: (id: string) => apiClient.get(`/payments/${id}`),
  listBySubscription: (subscriptionId: string) =>
    apiClient.get(`/payments/subscription/${subscriptionId}`),
  create: (data: PaymentPayload) => apiClient.post('/payments/', data),
  update: (id: string, data: Partial<PaymentPayload>) => apiClient.put(`/payments/${id}`, data),
  confirm: (id: string) => apiClient.post(`/payments/${id}/confirm`),
  delete: (id: string) => apiClient.delete(`/payments/${id}`),
  getMonthlyStats: (year: number, month: number) =>
    apiClient.get('/payments/stats/monthly', {
      params: { year, month },
    }),
  statsByPeriod: (start: string, end: string) =>
    apiClient.get('/payments/stats/by-period', {
      params: { start_date: start, end_date: end },
    }),
  statsByCategory: (start: string, end: string) =>
    apiClient.get('/payments/stats/by-category', {
      params: { start_date: start, end_date: end },
    }),
};
