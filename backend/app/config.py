from pathlib import Path

from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Настройки приложения"""

    # Приложение
    APP_NAME: str = "Subscription Tracker"
    DEBUG: bool = True

    # База данных
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "subscription_tracker"
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    
    # Уведомления
    NOTIFICATION_DAYS_BEFORE: int = 3

    @property
    def database_url(self) -> str:
        """URL подключения к базе данных"""
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = BASE_DIR / ".env"


settings = Settings()
