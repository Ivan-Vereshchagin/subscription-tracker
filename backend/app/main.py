from fastapi import FastAPI

from app.config import settings
from app.routers.subscriptions import router as subscriptions_router

app = FastAPI(
    title="Subscription Tracker",
    description="Сервис управления подписками и регулярными платежами",
    version="0.1.0"
)

# Подключение роутера
app.include_router(subscriptions_router)


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
