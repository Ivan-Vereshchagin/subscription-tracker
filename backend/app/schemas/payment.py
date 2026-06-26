# Pydantic-схемы для платежей

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict

class PaymentCreate(BaseModel):
    """Схема для создания записи о платеже"""

    subscription_id: str = Field(..., description="ID подписки")
    amount: Decimal = Field(..., gt=0, description="Сумма платежа")
    currency: str = Field(default="RUB", min_length=3, max_length=3, description="Валюта")
    payment_date: datetime = Field(..., description="Дата списания")
    period_start: datetime = Field(..., description="Начало оплаченного периода")
    period_end: datetime = Field(..., description="Конец оплаченного периода")
    status: str = Field(default="completed", description="Статус: pending, completed, failed, cancelled")

class PaymentUpdate(BaseModel):
    """Схема для обновления платежа"""

    status: Optional[str] = Field(None, description="Статус платежа")

class PaymentBase(BaseModel):
    """Базовая схема платежа"""

    id: str = Field(..., description="ID платежа")
    subscription_id: str = Field(..., description="ID подписки")
    user_id: str = Field(..., description="ID пользователя")
    amount: Decimal = Field(..., description="Сумма")
    currency: str = Field(..., description="Валюта")
    payment_date: datetime = Field(..., description="Дата списания")
    period_start: datetime = Field(..., description="Начало периода")
    period_end: datetime = Field(..., description="Конец периода")
    status: str = Field(..., description="Статус")
    created_at: datetime = Field(..., description="Дата создания записи")

    model_config = ConfigDict(from_attributes=True)

class PaymentResponse(PaymentBase):
    """Полный ответ с данными платежа"""

    pass

class PaymentListResponse(BaseModel):
    """Ответ со списком платежей"""

    items: list[PaymentResponse]
    total: int = Field(..., description="Общее количество")

class PaymentStatsByPeriod(BaseModel):
    """Статистика платежей за период"""

    start_date: datetime = Field(..., description="Начало периода")
    end_date: datetime = Field(..., description="Конец периода")
    total: Decimal = Field(..., description="Общая сумма")
    currency: str = Field(..., description="Валюта")
    count: int = Field(..., description="Количество платежей")


class PaymentStatsByCategory(BaseModel):
    """Статистика по категориям"""

    category: str = Field(..., description="Категория")
    total: Decimal = Field(..., description="Сумма")
    count: int = Field(..., description="Количество платежей")


class PaymentStatsByCategoryResponse(BaseModel):
    """Ответ со статистикой по категориям"""

    categories: list[PaymentStatsByCategory]
    total: Decimal = Field(..., description="Общая сумма")
