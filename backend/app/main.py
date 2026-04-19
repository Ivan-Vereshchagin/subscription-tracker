from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer

from app.config import settings
from app.routers.subscriptions import router as subscriptions_router
from app.routers.auth import router as auth_router
from app.routers.payments import router as payments_router
from app.routers.statements import router as statements_router
from app.scheduler import start_scheduler, stop_scheduler


# Настройка OAuth2 для Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Управление жизненным циклом приложения
    
    Запускается при старте и остановке сервера
    """
    # При запуске
    start_scheduler()
    yield
    # При остановке
    stop_scheduler()


app = FastAPI(
    title="Subscription Tracker",
    description="Сервис управления подписками и регулярными платежами",
    version="0.1.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    lifespan=lifespan,
)

app.openapi_schema = None

# Настройка CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(subscriptions_router)
app.include_router(payments_router)
app.include_router(statements_router)


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
