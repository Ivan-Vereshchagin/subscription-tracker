import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { statementsApi } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface TransactionMatch {
  transaction_date: string;
  transaction_amount: number;
  transaction_currency: string;
  transaction_description: string;
  subscription_id: string | null;
  subscription_name: string | null;
  subscription_category: string | null;
  match_score: number;
  already_confirmed: boolean;
  match_reason: string;
}

interface TransactionRaw {
  date: string;
  amount: number;
  currency: string;
  description: string;
}

interface PreviewResponse {
  matched: TransactionMatch[];
  unmatched: TransactionRaw[];
  bank_detected: string;
  total_transactions: number;
}

export default function ImportStatement() {
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setPreview(null);
    try {
      const res = await statementsApi.upload(file);
      const data: PreviewResponse = res.data;
      setPreview(data);
      const initialSelected = new Set(
        data.matched
          .map((_, i) => i)
          .filter(i => !data.matched[i].already_confirmed && data.matched[i].subscription_id)
      );
      setSelected(initialSelected);
    } catch (err: any) {
      notifyError(err?.response?.data?.detail || 'Ошибка при загрузке файла');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleRow = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!preview) return;
    const transactions = [...selected].map(i => {
      const t = preview.matched[i];
      return {
        transaction_date: t.transaction_date,
        transaction_amount: t.transaction_amount,
        transaction_currency: t.transaction_currency,
        subscription_id: t.subscription_id!,
      };
    });

    setConfirming(true);
    try {
      const res = await statementsApi.confirm(transactions);
      const { created, skipped } = res.data;
      notifySuccess(`Создано платежей: ${created}, пропущено: ${skipped}`);
      navigate('/payments');
    } catch (err: any) {
      notifyError(err?.response?.data?.detail || 'Ошибка при подтверждении');
    } finally {
      setConfirming(false);
    }
  };

  const scoreColor = (score: number): 'success' | 'info' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 50) return 'info';
    return 'error';
  };

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
              sx={{ color: 'white', '&:hover': { background: 'rgba(255,255,255,0.2)' } }}
            >
              Назад
            </Button>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                Импорт выписки
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                Загрузите PDF-выписку Сбера или Т-Банка, чтобы автоматически подтвердить платежи
              </Typography>
            </Box>
            <Box sx={{ width: 90 }} />
          </Box>
        </Paper>

        {/* Зона загрузки */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: 4,
            borderRadius: 3,
            border: '2px dashed',
            borderColor: uploading ? '#6366f1' : 'divider',
            textAlign: 'center',
            transition: 'border-color 0.2s',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {uploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress sx={{ color: '#6366f1' }} />
              <Typography color="text.secondary">Анализируем выписку...</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CloudUploadIcon sx={{ fontSize: 48, color: '#6366f1', opacity: 0.7 }} />
              <Typography variant="h6" color="text.secondary">
                {preview ? 'Загрузить другой файл' : 'Выберите PDF-выписку'}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  borderColor: '#6366f1',
                  color: '#6366f1',
                  '&:hover': { borderColor: '#4f46e5', background: 'rgba(99,102,241,0.05)' },
                }}
              >
                Выбрать файл
              </Button>
            </Box>
          )}
        </Paper>

        {/* Результат */}
        {preview && (
          <>
            {/* Сводка */}
            <Paper elevation={0} sx={{ mb: 3, p: 2.5, borderRadius: 3, background: '#f8fafc' }}>
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Всего транзакций: <strong>{preview.total_transactions}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Совпадений: <strong>{preview.matched.length}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Без совпадений: <strong>{preview.unmatched.length}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Выбрано для подтверждения: <strong>{selected.size}</strong>
                </Typography>
              </Box>
            </Paper>

            {/* Таблица совпадений */}
            {preview.matched.length > 0 && (
              <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Найденные совпадения
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Отметьте транзакции, которые нужно подтвердить как платежи
                  </Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ background: '#f8fafc' }}>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell>Дата</TableCell>
                        <TableCell>Описание из выписки</TableCell>
                        <TableCell>Сумма</TableCell>
                        <TableCell>Подписка</TableCell>
                        <TableCell>Совпадение</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.matched.map((t, i) => {
                        const isDisabled = t.already_confirmed || !t.subscription_id;
                        const isChecked = selected.has(i);
                        return (
                          <TableRow
                            key={i}
                            sx={{
                              opacity: isDisabled ? 0.5 : 1,
                              '&:hover': { background: 'rgba(99,102,241,0.04)' },
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={() => toggleRow(i)}
                                sx={{ color: '#6366f1', '&.Mui-checked': { color: '#6366f1' } }}
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(t.transaction_date).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ maxWidth: 260, wordBreak: 'break-word' }}>
                                {t.transaction_description}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700} color="primary">
                                {t.transaction_amount} {t.transaction_currency}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {t.subscription_name ? (
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {t.subscription_name}
                                  </Typography>
                                  {t.subscription_category && (
                                    <Typography variant="caption" color="text.secondary">
                                      {t.subscription_category}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.disabled">
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {t.already_confirmed ? (
                                <Chip
                                  icon={<CheckCircleIcon />}
                                  label="Уже подтверждён"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              ) : (
                                <Box sx={{ minWidth: 72 }}>
                                  <Typography
                                    variant="caption"
                                    fontWeight={600}
                                    color={`${scoreColor(t.match_score)}.main`}
                                  >
                                    {t.match_score}%
                                  </Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={t.match_score}
                                    color={scoreColor(t.match_score)}
                                    sx={{ borderRadius: 1, height: 6, mt: 0.5 }}
                                  />
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Нераспознанные транзакции */}
            {preview.unmatched.length > 0 && (
              <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 1 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Без совпадений ({preview.unmatched.length})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Транзакции, которым не нашлась подходящая подписка
                    </Typography>
                  </Box>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ background: '#f8fafc' }}>
                      <TableRow>
                        <TableCell>Дата</TableCell>
                        <TableCell>Описание</TableCell>
                        <TableCell>Сумма</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.unmatched.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {new Date(t.date).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {t.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {t.amount} {t.currency}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            <Divider sx={{ mb: 3 }} />

            {/* Кнопка подтверждения */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
                sx={{ borderColor: 'divider', color: 'text.secondary' }}
              >
                Отмена
              </Button>
              <Button
                variant="contained"
                disabled={selected.size === 0 || confirming}
                onClick={handleConfirm}
                startIcon={confirming ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #4f46e5 0%, #db2777 100%)' },
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                Подтвердить {selected.size > 0 ? `(${selected.size})` : ''}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}
