"""
Pydantic-схемы для подписок
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


# === Схемы для создания ===

class SubscriptionCreate(BaseModel):
    """Схема для создания подписки"""

    name: str = Field(..., min_length=1, max_length=255, description="Название подписки")
    description: Optional[str] = Field(None, max_length=1000, description="Описание")
    category: str = Field(..., min_length=1, max_length=100, description="Категория (например, Streaming, Music)")
    price: Decimal = Field(..., gt=0, description="Стоимость подписки")
    currency: str = Field(default="RUB", min_length=3, max_length=3, description="Валюта (RUB, USD, EUR)")
    billing_cycle: str = Field(default="monthly", description="Период оплаты: weekly, monthly, yearly")
    next_billing_date: Optional[datetime] = Field(None, description="Дата следующего списания")
    is_active: bool = Field(default=True, description="Активна ли подписка")


# === Схемы для обновления ===

class SubscriptionUpdate(BaseModel):
    """Схема для обновления подписки
    
    Все поля необязательны — обновляются только переданные
    """

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Название подписки")
    description: Optional[str] = Field(None, max_length=1000, description="Описание")
    category: Optional[str] = Field(None, min_length=1, max_length=100, description="Категория")
    price: Optional[Decimal] = Field(None, gt=0, description="Стоимость")
    currency: Optional[str] = Field(None, min_length=3, max_length=3, description="Валюта")
    billing_cycle: Optional[str] = Field(None, description="Период оплаты")
    next_billing_date: Optional[datetime] = Field(None, description="Дата следующего списания")
    is_active: Optional[bool] = Field(None, description="Статус активности")


# === Схемы для ответов (Response) ===

class SubscriptionBase(BaseModel):
    """Базовая схема подписки (общие поля)"""

    id: str = Field(..., description="ID подписки")
    user_id: str = Field(..., description="ID владельца")
    name: str = Field(..., description="Название")
    description: Optional[str] = Field(None, description="Описание")
    category: str = Field(..., description="Категория")
    price: Decimal = Field(..., description="Стоимость")
    currency: str = Field(..., description="Валюта")
    billing_cycle: str = Field(..., description="Период оплаты")
    next_billing_date: Optional[datetime] = Field(None, description="Дата следующего списания")
    is_active: bool = Field(..., description="Активна ли")
    created_at: datetime = Field(..., description="Дата создания")
    updated_at: datetime = Field(..., description="Дата обновления")

    model_config = ConfigDict(from_attributes=True)


class SubscriptionResponse(SubscriptionBase):
    """Полный ответ с данными подписки"""

    pass


class SubscriptionListResponse(BaseModel):
    """Ответ со списком подписок"""

    items: list[SubscriptionResponse]
    total: int = Field(..., description="Общее количество")
