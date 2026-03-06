from fastapi import FastAPI
from fastapi.security import OAuth2PasswordBearer

from app.config import settings
from app.routers.subscriptions import router as subscriptions_router
from app.routers.auth import router as auth_router
from app.routers.payments import router as payments_router

# Настройка OAuth2 для Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

app = FastAPI(
    title="Subscription Tracker",
    description="Сервис управления подписками и регулярными платежами",
    version="0.1.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
)

# Настройка security для Swagger
app.openapi_schema = None  # Будет сгенерирована автоматически

# Подключение роутеров
app.include_router(auth_router)
app.include_router(subscriptions_router)
app.include_router(payments_router)


@app.get("/health")
def health_check():
    """Проверка работоспособности API"""
    return {"status": "ok"}


@app.get("/health/db")
def health_check_db():
    """Проверка подключения к базе данных"""
    return {
        "status": "ok",
        "database": settings.DB_HOST,
        "database_url": settings.database_url
    }


@app.get("/")
def root():
    """Корневой endpoint"""
    return {
        "message": "Welcome to Subscription Tracker API",
        "docs": "/docs"
    }
