# Инструкция по запуску Subscription Tracker

## Предварительные требования

- Python 3.11+
- Docker Desktop (запущен)

---

## Первый запуск

### 1. Запуск базы данных

```bash
docker-compose up -d
```

Контейнеры:
- **PostgreSQL**: `localhost:5432`
- **PgAdmin**: http://localhost:5050 (логин: `admin@admin.com`, пароль: `admin`)

Остановить:
```bash
docker-compose down
```

### 2. Настройка бэкенда

**Создать виртуальное окружение:**
```bash
cd backend
python -m venv venv
```

**Активировать:**
```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows cmd
.\venv\Scripts\activate.bat

# Linux/macOS
source venv/bin/activate
```

**Установить зависимости:**
```bash
pip install -r requirements.txt
```

**Создать файл окружения:**
```bash
copy .env.example .env          # Windows
cp .env.example .env            # Linux/macOS
```

### 3. Запуск сервера

```bash
uvicorn app.main:app --reload
```

Сервер запустится на http://127.0.0.1:8000

- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

---

## Повторный запуск (после перезагрузки)

1. Убедитесь, что Docker запущен
2. Проверьте, что контейнеры работают:
   ```bash
   docker-compose ps
   ```
   Если нет — запустите: `docker-compose up -d`

3. Активируйте виртуальное окружение:
   ```bash
   cd backend
   .\venv\Scripts\Activate.ps1    # PowerShell
   ```

4. Запустите сервер (если остановлен):
   ```bash
   uvicorn app.main:app --reload
   ```

---

## Полезные команды

```bash
# Просмотр логов контейнеров
docker-compose logs -f postgres

# Остановить все контейнеры
docker-compose down

# Пересоздать контейнеры
docker-compose down && docker-compose up -d

```
