# Инструкция по запуску Subscription Tracker

## Предварительные требования

- Python 3.11+
- Docker Desktop


## Запуск с Docker Compose

### 1. Запуск всех сервисов

```bash
docker-compose up -d --build
```

### 2. Проверка

- **Swagger UI**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/health

### 3. Остановка

```bash
docker-compose down
```

## Полезные команды

```bash
# Просмотр логов контейнеров
docker-compose logs -f postgres

# Остановить все контейнеры
docker-compose down

# Пересоздать контейнеры
docker-compose down && docker-compose up -d

```
