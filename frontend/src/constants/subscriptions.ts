export const CATEGORIES = [
  { value: 'Видео', label: 'Видео', icon: '🎬', color: '#6366f1' },
  { value: 'Музыка', label: 'Музыка', icon: '🎵', color: '#ec4899' },
  { value: 'Софт', label: 'Софт', icon: '💻', color: '#8b5cf6' },
  { value: 'Игры', label: 'Игры', icon: '🎮', color: '#f43f5e' },
  { value: 'Спорт', label: 'Спорт', icon: '🏋️', color: '#10b981' },
  { value: 'Обучение', label: 'Обучение', icon: '📚', color: '#3b82f6' },
  { value: 'Покупки', label: 'Покупки', icon: '🛒', color: '#f59e0b' },
  { value: 'Еда', label: 'Еда', icon: '🍔', color: '#ef4444' },
  { value: 'Транспорт', label: 'Транспорт', icon: '🚗', color: '#64748b' },
  { value: 'Другое', label: 'Другое', icon: '📦', color: '#94a3b8' },
];

export const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(cat => [cat.value, cat.color])
);

export const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(cat => [cat.value, cat.icon])
);

export const BILLING_CYCLES = [
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'quarterly', label: 'Раз в 3 месяца' },
  { value: 'semi-annual', label: 'Раз в 6 месяцев' },
  { value: 'yearly', label: 'Ежегодно' },
];

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  weekly: 'в неделю',
  monthly: 'в месяц',
  quarterly: 'в квартал',
  'semi-annual': 'в полгода',
  yearly: 'в год',
};
