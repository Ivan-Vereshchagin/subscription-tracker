# Pydantic-схемы для аутентификации

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr

class UserCreate(BaseModel):
    """Схема для регистрации пользователя"""

    email: EmailStr = Field(..., description="Email адрес")
    password: str = Field(..., min_length=8, max_length=100, description="Пароль (минимум 8 символов)")


class UserLogin(BaseModel):
    """Схема для входа пользователя"""

    email: EmailStr = Field(..., description="Email адрес")
    password: str = Field(..., description="Пароль")

class Token(BaseModel):
    """Ответ с токеном доступа"""

    access_token: str = Field(..., description="JWT access токен")
    refresh_token: str = Field(..., description="JWT refresh токен")
    token_type: str = Field(default="bearer", description="Тип токена")

class TokenRefresh(BaseModel):
    """Схема для обновления токена"""

    refresh_token: str = Field(..., description="JWT refresh токен")

class UserBase(BaseModel):
    """Базовая схема пользователя"""

    id: str = Field(..., description="ID пользователя")
    email: str = Field(..., description="Email адрес")
    is_active: bool = Field(default=True, description="Активен ли пользователь")
    is_superuser: bool = Field(default=False, description="Права суперпользователя")
    created_at: datetime = Field(..., description="Дата регистрации")
    updated_at: datetime = Field(..., description="Дата обновления")

    model_config = {"from_attributes": True}


class UserResponse(UserBase):
    """Полный ответ с данными пользователя"""

    pass
