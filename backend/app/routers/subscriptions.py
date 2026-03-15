# API роутер для управления подписками

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.subscription import (
    get_subscriptions,
    get_subscription,
    create_subscription,
    update_subscription,
    delete_subscription,
    get_total_monthly_cost,
    get_total_cost_by_period,
    get_cost_by_category,
)
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    SubscriptionListResponse,
    SubscriptionStatsByCategory,
    SubscriptionCostByPeriod,
)


router = APIRouter(
    prefix="/subscriptions",
    tags=["Подписки"],
    responses={404: {"description": "Подписка не найдена"}},
)


@router.get("/", response_model=SubscriptionListResponse)
def list_subscriptions(
    skip: int = Query(0, ge=0, description="Пропустить N записей"),
    limit: int = Query(100, ge=1, le=1000, description="Максимум записей"),
    is_active: Optional[bool] = Query(None, description="Фильтр по статусу"),
    category: Optional[str] = Query(None, description="Фильтр по категории"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить список всех подписок пользователя

    - skip: Пропустить N записей (пагинация)
    - limit: Максимум записей (1-1000)
    - is_active: Фильтр по статусу активности
    - category: Фильтр по категории
    
    Требуется аутентификация!
    """
    subscriptions = get_subscriptions(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        is_active=is_active,
        category=category,
    )
    
    return {
        "items": subscriptions,
        "total": len(subscriptions),
    }


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription_details(
    subscription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить подробную информацию о подписке

    - subscription_id: ID подписки
    
    Требуется аутентификация!
    """
    subscription = get_subscription(db, subscription_id=subscription_id, user_id=current_user.id)

    if not subscription:
        raise HTTPException(status_code=404, detail="Подписка не найдена")

    return subscription


@router.post("/", response_model=SubscriptionResponse, status_code=201)
def create_new_subscription(
    subscription_data: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Создать новую подписку

    - name: Название подписки (обязательно)
    - category: Категория (обязательно)
    - price: Стоимость (обязательно, > 0)
    - currency: Валюта (по умолчанию RUB)
    - billing_cycle: Период оплаты (weekly, monthly, yearly)
    - description: Описание (опционально)
    - next_billing_date: Дата следующего списания (опционально)
    - is_active: Статус активности (по умолчанию True)
    
    Требуется аутентификация!
    """
    subscription = create_subscription(
        db=db,
        user_id=current_user.id,
        name=subscription_data.name,
        category=subscription_data.category,
        price=subscription_data.price,
        currency=subscription_data.currency,
        billing_cycle=subscription_data.billing_cycle,
        description=subscription_data.description,
        next_billing_date=subscription_data.next_billing_date,
        is_active=subscription_data.is_active,
    )
    
    return subscription


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
def update_existing_subscription(
    subscription_id: str,
    subscription_data: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Обновить существующую подписку

    Обновляются только переданные поля (все опциональны):
    - name: Название
    - category: Категория
    - price: Стоимость
    - currency: Валюта
    - billing_cycle: Период оплаты
    - description: Описание
    - next_billing_date: Дата следующего списания
    - is_active: Статус активности
    
    Требуется аутентификация!
    """
    subscription = update_subscription(
        db=db,
        subscription_id=subscription_id,
        user_id=current_user.id,
        **subscription_data.model_dump(exclude_unset=True),
    )

    if not subscription:
        raise HTTPException(status_code=404, detail="Подписка не найдена")

    return subscription


@router.delete("/{subscription_id}", status_code=204)
def delete_existing_subscription(
    subscription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Удалить подписку

    - subscription_id: ID подписки для удаления
    
    Требуется аутентификация!
    """
    success = delete_subscription(db, subscription_id=subscription_id, user_id=current_user.id)

    if not success:
        raise HTTPException(status_code=404, detail="Подписка не найдена")

    return None  # 204 No Content


@router.get("/stats/monthly-cost", response_model=dict)
def get_monthly_cost_stats(
    currency: str = Query("RUB", description="Валюта для расчёта"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Рассчитать общую месячную стоимость активных подписок

    Конвертирует все подписки к месячной стоимости

    - currency: Валюта для расчёта (по умолчанию RUB)

    Требуется аутентификация!
    """
    total = get_total_monthly_cost(db=db, user_id=current_user.id, currency=currency)

    return {
        "total_monthly_cost": total,
        "currency": currency,
    }


@router.get("/stats/by-period", response_model=SubscriptionCostByPeriod)
def get_cost_stats_by_period(
    start_date: datetime = Query(..., description="Начало периода (например: 2026-01-01)"),
    end_date: datetime = Query(..., description="Конец периода (например: 2026-02-01)"),
    currency: str = Query("RUB", description="Валюта для расчёта"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Рассчитать общую стоимость подписок за произвольный период

    Конвертирует стоимость подписки к дневной, затем умножает на количество дней:

    - start_date: Начало периода
    - end_date: Конец периода
    - currency: Валюта (по умолчанию RUB)

    Требуется аутентификация!
    """
    total = get_total_cost_by_period(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        currency=currency,
    )

    days = (end_date - start_date).days

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total": total,
        "currency": currency,
        "days": days,
    }


@router.get("/stats/by-category", response_model=SubscriptionStatsByCategory)
def get_cost_stats_by_category(
    currency: str = Query("RUB", description="Валюта для расчёта"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить расходы по категориям (группировка)

    Возвращает список категорий с общей месячной стоимостью и количеством подписок:
    - category: Название категории
    - total: Общая сумма в месяц
    - count: Количество подписок

    - currency: Валюта (по умолчанию RUB)

    Требуется аутентификация!
    """
    categories = get_cost_by_category(
        db=db,
        user_id=current_user.id,
        currency=currency,
    )

    total = sum(cat["total"] for cat in categories)

    return {
        "categories": categories,
        "total": total,
    }
