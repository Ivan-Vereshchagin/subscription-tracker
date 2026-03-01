"""
API роутер для управления подписками
"""
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
)
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    SubscriptionListResponse,
)


# Создаём роутер с префиксом и тегами для Swagger
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

    - **skip**: Пропустить N записей (пагинация)
    - **limit**: Максимум записей (1-1000)
    - **is_active**: Фильтр по статусу активности
    - **category**: Фильтр по категории
    
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

    - **subscription_id**: ID подписки
    
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

    - **name**: Название подписки (обязательно)
    - **category**: Категория (обязательно)
    - **price**: Стоимость (обязательно, > 0)
    - **currency**: Валюта (по умолчанию RUB)
    - **billing_cycle**: Период оплаты (weekly, monthly, yearly)
    - **description**: Описание (опционально)
    - **next_billing_date**: Дата следующего списания (опционально)
    - **is_active**: Статус активности (по умолчанию True)
    
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
    - **name**: Название
    - **category**: Категория
    - **price**: Стоимость
    - **currency**: Валюта
    - **billing_cycle**: Период оплаты
    - **description**: Описание
    - **next_billing_date**: Дата следующего списания
    - **is_active**: Статус активности
    
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

    - **subscription_id**: ID подписки для удаления
    
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
    
    Конвертирует все подписки к месячной стоимости:
    - weekly × 4
    - monthly × 1
    - yearly ÷ 12
    
    - **currency**: Валюта для расчёта (по умолчанию RUB)
    
    Требуется аутентификация!
    """
    total = get_total_monthly_cost(db=db, user_id=current_user.id, currency=currency)
    
    return {
        "total_monthly_cost": total,
        "currency": currency,
    }
