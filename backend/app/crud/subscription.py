"""
CRUD операции для подписок
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.subscription import Subscription


def get_subscriptions(
    db: Session,
    user_id: str,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    category: Optional[str] = None,
) -> list[Subscription]:
    """
    Получить список подписок пользователя
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        skip: Пропустить N записей
        limit: Максимум записей
        is_active: Фильтр по статусу активности
        category: Фильтр по категории
    
    Returns:
        Список подписок
    """
    query = db.query(Subscription).filter(Subscription.user_id == user_id)
    
    if is_active is not None:
        query = query.filter(Subscription.is_active == is_active)
    
    if category:
        query = query.filter(Subscription.category == category)
    
    return query.offset(skip).limit(limit).all()


def get_subscription(db: Session, subscription_id: str, user_id: str) -> Optional[Subscription]:
    """
    Получить одну подписку по ID
    
    Args:
        db: Сессия базы данных
        subscription_id: ID подписки
        user_id: ID владельца
    
    Returns:
        Подписка или None
    """
    return db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == user_id
    ).first()


def create_subscription(
    db: Session,
    user_id: str,
    name: str,
    category: str,
    price: Decimal,
    currency: str = "RUB",
    billing_cycle: str = "monthly",
    description: Optional[str] = None,
    next_billing_date: Optional[datetime] = None,
    is_active: bool = True,
) -> Subscription:
    """
    Создать новую подписку
    
    Args:
        db: Сессия базы данных
        user_id: ID владельца
        name: Название подписки
        category: Категория
        price: Стоимость
        currency: Валюта
        billing_cycle: Период оплаты
        description: Описание
        next_billing_date: Дата следующего списания
        is_active: Статус активности
    
    Returns:
        Созданная подписка
    """
    subscription = Subscription(
        user_id=user_id,
        name=name,
        description=description,
        category=category,
        price=price,
        currency=currency,
        billing_cycle=billing_cycle,
        next_billing_date=next_billing_date,
        is_active=is_active,
    )
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    return subscription


def update_subscription(
    db: Session,
    subscription_id: str,
    user_id: str,
    **kwargs
) -> Optional[Subscription]:
    """
    Обновить подписку
    
    Args:
        db: Сессия базы данных
        subscription_id: ID подписки
        user_id: ID владельца
        **kwargs: Поля для обновления
    
    Returns:
        Обновлённая подписка или None
    """
    subscription = get_subscription(db, subscription_id, user_id)
    
    if not subscription:
        return None
    
    # Обновляем только переданные поля
    for field, value in kwargs.items():
        if value is not None and hasattr(subscription, field):
            setattr(subscription, field, value)
    
    db.commit()
    db.refresh(subscription)
    
    return subscription


def delete_subscription(db: Session, subscription_id: str, user_id: str) -> bool:
    """
    Удалить подписку
    
    Args:
        db: Сессия базы данных
        subscription_id: ID подписки
        user_id: ID владельца
    
    Returns:
        True если удалено, False если не найдено
    """
    subscription = get_subscription(db, subscription_id, user_id)
    
    if not subscription:
        return False
    
    db.delete(subscription)
    db.commit()
    
    return True


def get_total_monthly_cost(
    db: Session,
    user_id: str,
    currency: str = "RUB",
) -> Decimal:
    """
    Рассчитать общую месячную стоимость активных подписок
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        currency: Валюта для расчёта
    
    Returns:
        Общая стоимость в месяц
    """
    subscriptions = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.is_active == True,
        Subscription.currency == currency,
    ).all()
    
    total = Decimal(0)
    
    for sub in subscriptions:
        # Конвертируем к месячной стоимости
        if sub.billing_cycle == "weekly":
            total += sub.price * 4  # ~4 недели в месяце
        elif sub.billing_cycle == "monthly":
            total += sub.price
        elif sub.billing_cycle == "yearly":
            total += sub.price / 12
    
    return total
