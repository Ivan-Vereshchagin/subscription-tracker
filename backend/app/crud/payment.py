# CRUD операции для платежей

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.payment import Payment


def get_payment(db: Session, payment_id: str) -> Optional[Payment]:
    """
    Получить платёж по ID
    
    Args:
        db: Сессия базы данных
        payment_id: ID платежа
    
    Returns: Платёж или None
    """
    return db.query(Payment).filter(Payment.id == payment_id).first()


def get_payments_by_subscription(
    db: Session,
    subscription_id: str,
    user_id: str,
    skip: int = 0,
    limit: int = 100,
) -> List[Payment]:
    """
    Получить историю платежей по подписке
    
    Args:
        db: Сессия базы данных
        subscription_id: ID подписки
        user_id: ID владельца
        skip: Пропустить N записей
        limit: Максимум записей
    
    Returns: Список платежей
    """
    return db.query(Payment).filter(
        Payment.subscription_id == subscription_id,
        Payment.user_id == user_id
    ).order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()


def get_payments_by_user(
    db: Session,
    user_id: str,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> List[Payment]:
    """
    Получить платежи пользователя с фильтрами
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        skip: Пропустить N записей
        limit: Максимум записей
        status: Фильтр по статусу
        start_date: Начало периода
        end_date: Конец периода
    
    Returns: Список платежей
    """
    query = db.query(Payment).filter(Payment.user_id == user_id)
    
    if status:
        query = query.filter(Payment.status == status)
    
    if start_date:
        query = query.filter(Payment.payment_date >= start_date)
    
    if end_date:
        query = query.filter(Payment.payment_date <= end_date)
    
    return query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()


def create_payment(
    db: Session,
    subscription_id: str,
    user_id: str,
    amount: Decimal,
    currency: str,
    payment_date: datetime,
    period_start: datetime,
    period_end: datetime,
    status: str = "completed",
) -> Payment:
    """
    Создать запись о платеже
    
    Args:
        db: Сессия базы данных
        subscription_id: ID подписки
        user_id: ID пользователя
        amount: Сумма платежа
        currency: Валюта
        payment_date: Дата списания
        period_start: Начало оплаченного периода
        period_end: Конец оплаченного периода
        status: Статус платежа
    
    Returns: Созданный платёж
    """
    payment = Payment(
        subscription_id=subscription_id,
        user_id=user_id,
        amount=amount,
        currency=currency,
        payment_date=payment_date,
        period_start=period_start,
        period_end=period_end,
        status=status,
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    return payment


def update_payment_status(
    db: Session,
    payment_id: str,
    user_id: str,
    status: str,
) -> Optional[Payment]:
    """
    Обновить статус платежа
    
    Args:
        db: Сессия базы данных
        payment_id: ID платежа
        user_id: ID владельца
        status: Новый статус
    
    Returns: Обновлённый платёж или None
    """
    payment = get_payment(db, payment_id)
    
    if not payment or payment.user_id != user_id:
        return None
    
    payment.status = status
    db.commit()
    db.refresh(payment)
    
    return payment


def delete_payment(db: Session, payment_id: str, user_id: str) -> bool:
    """
    Удалить запись о платеже
    
    Args:
        db: Сессия базы данных
        payment_id: ID платежа
        user_id: ID владельца
    
    Returns: True если удалено, False если не найдено
    """
    payment = get_payment(db, payment_id)
    
    if not payment or payment.user_id != user_id:
        return False
    
    db.delete(payment)
    db.commit()
    
    return True


def get_total_paid_by_period(
    db: Session,
    user_id: str,
    start_date: datetime,
    end_date: datetime,
    currency: str = "RUB",
) -> Decimal:
    """
    Получить общую сумму оплаченных платежей за период
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        start_date: Начало периода
        end_date: Конец периода
        currency: Валюта
    
    Returns: Общая сумма
    """
    from sqlalchemy import func
    
    result = db.query(func.sum(Payment.amount)).filter(
        Payment.user_id == user_id,
        Payment.currency == currency,
        Payment.status == "completed",
        Payment.payment_date >= start_date,
        Payment.payment_date <= end_date,
    ).scalar()
    
    return result or Decimal(0)


def get_payments_by_category(
    db: Session,
    user_id: str,
    start_date: datetime,
    end_date: datetime,
    currency: str = "RUB",
) -> list[dict]:
    """
    Получить сумму платежей по категориям за период
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        start_date: Начало периода
        end_date: Конец периода
        currency: Валюта
    
    Returns: Список: [{category, total, count}]
    """
    from sqlalchemy import func
    
    from app.models.subscription import Subscription
    
    results = db.query(
        Subscription.category,
        func.sum(Payment.amount).label("total"),
        func.count(Payment.id).label("count")
    ).join(
        Subscription,
        Payment.subscription_id == Subscription.id
    ).filter(
        Payment.user_id == user_id,
        Payment.currency == currency,
        Payment.status == "completed",
        Payment.payment_date >= start_date,
        Payment.payment_date <= end_date,
    ).group_by(
        Subscription.category
    ).all()
    
    return [
        {"category": row.category, "total": row.total, "count": row.count}
        for row in results
    ]
