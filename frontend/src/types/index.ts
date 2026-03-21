export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  billing_cycle: 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'yearly';
  next_billing_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  subscription_id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  period_start: string;
  period_end: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
}

export interface SubscriptionStatsByCategory {
  categories: Array<{
    category: string;
    total: number;
    count: number;
  }>;
  total: number;
}
