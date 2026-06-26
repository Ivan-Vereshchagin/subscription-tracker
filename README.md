# Subscription Tracker

Сервис для управления подписками и регулярными платежами. Позволяет отслеживать расходы, получать уведомления о предстоящих списаниях и импортировать платежи из банковских выписок.

**Деплой:** в данный момент поддерживается только локальный запуск через Docker Compose.

## Требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

---

## Старт

### 1. Клонировать репозиторий

```bash
git clone <url-репозитория>
cd subscription-tracker
```

### 2. Создать файл окружения

Создайте файл `backend/.env` на основе примера ниже:

```env
# База данных
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=subscription_tracker
DB_HOST=postgres
DB_PORT=5432

# Email-уведомления
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=
```

### 3. Запустить сервисы

```bash
docker-compose up -d --build
```


## Настройка email-уведомлений

Приложение отправляет письма за 1–3 дня до списания по подписке.

### Gmail

1. Включите двухэтапную аутентификацию в аккаунте Google.
2. Перейдите: **Google Account → Безопасность → Двухэтапная аутентификация → Пароли приложений**.
3. Создайте пароль для приложения "Почта".
4. Заполните `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ваш@gmail.com
SMTP_PASSWORD=пароль_приложения_из_шага_3
EMAIL_FROM=ваш@gmail.com
```

После изменения `.env` перезапустите бэкенд:

```bash
docker-compose restart backend
```

---

## Полезные команды

```bash
# Запустить все сервисы
docker-compose up -d

# Остановить все сервисы
docker-compose down

# Пересобрать и запустить
docker-compose up -d --build

# Посмотреть логи бэкенда
docker-compose logs -f backend

# Посмотреть логи всех сервисов
docker-compose logs -f

# Перезапустить только бэкенд
docker-compose restart backend
```

---

