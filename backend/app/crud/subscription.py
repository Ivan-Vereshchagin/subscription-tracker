# CRUD операции для подписок

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
    
    Returns: Список подписок
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
    
    Returns: Подписка или None
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
    
    Returns: Созданная подписка
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
    
    Returns: Обновлённая подписка или None
    """
    subscription = get_subscription(db, subscription_id, user_id)
    
    if not subscription:
        return None
    
    for field, value in kwargs.items():
        if value is not None and hasattr(subscription, field):
            setattr(subscription, field, value)
    
    db.commit()
    db.refresh(subscription)
    
    return subscription



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

    Returns: Общая стоимость в месяц
    """
    subscriptions = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.is_active == True,
        Subscription.currency == currency,
    ).all()

    total = Decimal(0)

    for sub in subscriptions:
        if sub.billing_cycle == "weekly":
            total += sub.price * 4
        elif sub.billing_cycle == "monthly":
            total += sub.price
        elif sub.billing_cycle == "quarterly":
            total += sub.price / 3
        elif sub.billing_cycle == "semi-annual":
            total += sub.price / 6
        elif sub.billing_cycle == "yearly":
            total += sub.price / 12
    
    return total


def get_total_cost_by_period(
    db: Session,
    user_id: str,
    start_date: datetime,
    end_date: datetime,
    currency: str = "RUB",
) -> Decimal:
    """
    Рассчитать общую стоимость подписок за период

    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        start_date: Начало периода
        end_date: Конец периода
        currency: Валюта для расчёта

    Returns: Общая стоимость за период
    """
    subscriptions = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.is_active == True,
        Subscription.currency == currency,
    ).all()
    
    days_in_period = (end_date - start_date).days
    
    if days_in_period <= 0:
        return Decimal(0)
    
    total = Decimal(0)
    
    for sub in subscriptions:
        if sub.billing_cycle == "weekly":
            daily_cost = sub.price / 7
        elif sub.billing_cycle == "monthly":
            daily_cost = sub.price / 30
        elif sub.billing_cycle == "quarterly":
            daily_cost = sub.price / 90
        elif sub.billing_cycle == "semi-annual":
            daily_cost = sub.price / 180
        elif sub.billing_cycle == "yearly":
            daily_cost = sub.price / 365
        else:
            daily_cost = sub.price / 30
        
        total += daily_cost * days_in_period
    
    return total


def get_cost_by_category(
    db: Session,
    user_id: str,
    currency: str = "RUB",
) -> list[dict]:
    """
    Получить расходы по категориям (группировка)

    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        currency: Валюта для расчёта

    Returns: Список словарей: [{category, total, count}]
    """
    subscriptions = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.is_active == True,
        Subscription.currency == currency,
    ).all()
    
    categories: dict[str, dict] = {}
    
    for sub in subscriptions:
        category = sub.category
        
        if category not in categories:
            categories[category] = {"total": Decimal(0), "count": 0}

        if sub.billing_cycle == "weekly":
            monthly_cost = sub.price * 4
        elif sub.billing_cycle == "monthly":
            monthly_cost = sub.price
        elif sub.billing_cycle == "quarterly":
            monthly_cost = sub.price / 3
        elif sub.billing_cycle == "semi-annual":
            monthly_cost = sub.price / 6
        elif sub.billing_cycle == "yearly":
            monthly_cost = sub.price / 12
        else:
            monthly_cost = sub.price
        
        categories[category]["total"] += monthly_cost
        categories[category]["count"] += 1
    
    result = [
        {"category": cat, "total": data["total"], "count": data["count"]}
        for cat, data in categories.items()
    ]
    
    result.sort(key=lambda x: x["total"], reverse=True)
    
    return result


def get_subscriptions_active_at_date(
    db: Session,
    user_id: str,
    date: datetime,
) -> list[Subscription]:
    """
    Получить подписки, активные на определённую дату

    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        date: Дата для проверки

    Returns: Список активных подписок
    """
    return db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.is_active == True,
        Subscription.created_at <= date,
    ).all()
