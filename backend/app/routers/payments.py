# API роутер для управления платежами

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.crud.payment import (
    get_payment,
    get_payments_by_subscription,
    get_payments_by_user,
    create_payment,
    update_payment_status,
    delete_payment,
    get_total_paid_by_period,
    get_payments_by_category,
)
from app.crud.subscription import get_subscription
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentListResponse,
    PaymentStatsByPeriod,
    PaymentStatsByCategoryResponse,
)


router = APIRouter(
    prefix="/payments",
    tags=["Платежи"],
)


@router.get("/", response_model=PaymentListResponse)
def list_payments(
    skip: int = Query(0, ge=0, description="Пропустить N записей"),
    limit: int = Query(100, ge=1, le=1000, description="Максимум записей"),
    status_filter: Optional[str] = Query(None, alias="status", description="Фильтр по статусу"),
    start_date: Optional[datetime] = Query(None, description="Начало периода"),
    end_date: Optional[datetime] = Query(None, description="Конец периода"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить историю платежей пользователя
    
    - skip: Пропустить N записей (пагинация)
    - limit: Максимум записей (1-1000)
    - status: Фильтр по статусу (pending, completed, failed, cancelled)
    - start_date: Начало периода
    - end_date: Конец периода
    
    Требуется аутентификация!
    """
    payments = get_payments_by_user(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        status=status_filter,
        start_date=start_date,
        end_date=end_date,
    )
    
    return {
        "items": payments,
        "total": len(payments),
    }


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment_details(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить подробную информацию о платеже
    
    - payment_id: ID платежа
    
    Требуется аутентификация!
    """
    payment = get_payment(db, payment_id=payment_id)
    
    if not payment or payment.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    
    return payment


@router.post("/", response_model=PaymentResponse, status_code=201)
def create_new_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Создать запись о платеже
    
    - subscription_id: ID подписки
    - amount: Сумма платежа
    - currency: Валюта (по умолчанию RUB)
    - payment_date: Дата списания
    - period_start: Начало оплаченного периода
    - period_end: Конец оплаченного периода
    - status: Статус (по умолчанию completed)
    
    Требуется аутентификация!
    """

    subscription = get_subscription(db, subscription_id=payment_data.subscription_id, user_id=current_user.id)
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Подписка не найдена")
    
    payment = create_payment(
        db=db,
        subscription_id=payment_data.subscription_id,
        user_id=current_user.id,
        amount=payment_data.amount,
        currency=payment_data.currency,
        payment_date=payment_data.payment_date,
        period_start=payment_data.period_start,
        period_end=payment_data.period_end,
        status=payment_data.status,
    )
    
    return payment


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: str,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Обновить статус платежа
    
    - payment_id: ID платежа
    - status: Новый статус (pending, completed, failed, cancelled)
    
    Требуется аутентификация!
    """
    payment = update_payment_status(
        db=db,
        payment_id=payment_id,
        user_id=current_user.id,
        status=status,
    )
    
    if not payment:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    
    return payment


@router.delete("/{payment_id}", status_code=204)
def delete_existing_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Удалить запись о платеже
    
    - payment_id: ID платежа
    
    Требуется аутентификация!
    """
    success = delete_payment(db, payment_id=payment_id, user_id=current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    
    return None


@router.get("/subscription/{subscription_id}", response_model=PaymentListResponse)
def list_subscription_payments(
    subscription_id: str,
    skip: int = Query(0, ge=0, description="Пропустить N записей"),
    limit: int = Query(100, ge=1, le=1000, description="Максимум записей"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить историю платежей по конкретной подписке
    
    - subscription_id: ID подписки
    - skip: Пропустить N записей
    - limit: Максимум записей
    
    Требуется аутентификация!
    """

    subscription = get_subscription(db, subscription_id=subscription_id, user_id=current_user.id)
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Подписка не найдена")
    
    payments = get_payments_by_subscription(
        db=db,
        subscription_id=subscription_id,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )
    
    return {
        "items": payments,
        "total": len(payments),
    }


@router.get("/stats/by-period", response_model=PaymentStatsByPeriod)
def get_payment_stats_by_period(
    start_date: datetime = Query(..., description="Начало периода"),
    end_date: datetime = Query(..., description="Конец периода"),
    currency: str = Query("RUB", description="Валюта для расчёта"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить общую сумму оплаченных платежей за период
    
    - start_date: Начало периода
    - end_date: Конец периода
    - currency: Валюта (по умолчанию RUB)
    
    Требуется аутентификация!
    """
    total = get_total_paid_by_period(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        currency=currency,
    )
    
    payments_count = len(get_payments_by_user(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    ))
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total": total,
        "currency": currency,
        "count": payments_count,
    }


@router.get("/pending", response_model=PaymentListResponse)
def list_pending_payments(
    skip: int = Query(0, ge=0, description="Пропустить N записей"),
    limit: int = Query(100, ge=1, le=1000, description="Максимум записей"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить ожидающие платежи пользователя (pending)
    
    Требуется аутентификация!
    """
    from app.crud.payment import get_payments_by_user
    
    payments = get_payments_by_user(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        status="pending",
    )
    
    return {
        "items": payments,
        "total": len(payments),
    }


@router.get("/stats/by-category", response_model=PaymentStatsByCategoryResponse)
def get_payment_stats_by_category(
    start_date: datetime = Query(..., description="Начало периода"),
    end_date: datetime = Query(..., description="Конец периода"),
    currency: str = Query("RUB", description="Валюта для расчёта"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Получить сумму платежей по категориям за период
    
    - start_date: Начало периода
    - end_date: Конец периода
    - currency: Валюта (по умолчанию RUB)
    
    Требуется аутентификация!
    """
    categories = get_payments_by_category(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        currency=currency,
    )
    
    total = sum(cat["total"] for cat in categories)
    
    return {
        "categories": categories,
        "total": total,
    }
