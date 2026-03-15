# Сервис уведомлений о предстоящих списаниях

import logging
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List

from sqlalchemy import sa
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.models.user import User
from app.config import settings


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)


def get_upcoming_subscriptions(
    db: Session,
    days_ahead: int = None,
) -> List[Subscription]:
    """
    Получить подписки с предстоящим списанием

    Проверяем подписки у которых next_billing_date:
    - Через 3 дня
    - Через 1 день

    Args:
        db: Сессия базы данных
        days_ahead (оставлено для совместимости)

    Returns: Список подписок
    """
    from datetime import date
    
    now = datetime.utcnow().date()
    
    target_dates = [
        now + timedelta(days=3),
        now + timedelta(days=1),
    ]
    
    subscriptions = db.query(Subscription).filter(
        Subscription.is_active == True,
        Subscription.next_billing_date != None,
        sa.func.date(Subscription.next_billing_date).in_(target_dates),
    ).all()
    
    return subscriptions


def format_notification_message(
    subscription: Subscription,
    days_until: int,
) -> str:
    """
    Сформировать текст уведомления
    
    Args:
        subscription: Подписка
        days_until: Через сколько дней списание
    
    Returns: Текст сообщения
    """
    if days_until <= 0:
        time_str = "⏰ Менее суток"
    elif days_until == 1:
        time_str = "⏰ Через 1 день"
    else:
        time_str = f"⏰ Через {days_until} дней"
    
    message = (
        f"🔔 Напоминание о подписке\n\n"
        f"📌 {subscription.name}\n"
        f"💰 {subscription.price} {subscription.currency}\n"
        f"📅 Следующее списание: {subscription.next_billing_date.strftime('%d.%m.%Y')}\n"
        f"{time_str}\n\n"
        f"Категория: {subscription.category}\n"
        f"Период: {get_billing_cycle_name(subscription.billing_cycle)}"
    )
    
    return message


def get_days_word(days: int) -> str:
    """
    Склонение слова "день"
    """
    if days == 1: return "день"
    elif 2 <= days <= 4: return "дня"
    else: return "дней"

def get_billing_cycle_name(cycle: str) -> str:
    """
    Название периода оплаты
    """
    names = {
        "weekly": "Еженедельно",
        "monthly": "Ежемесячно",
        "quarterly": "Раз в 3 месяца",
        "semi-annual": "Раз в 6 месяцев",
        "yearly": "Ежегодно",
    }
    return names.get(cycle, cycle)


async def send_email_notification(
    user_email: str,
    subject: str,
    message: str,
) -> bool:
    """
    Отправить email уведомление
    
    Args:
        user_email: Email получателя
        subject: Тема письма
        message: Текст сообщения
    
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP не настроен, уведомление не отправлено")
        return False
    
    try:
        import aiosmtplib
        from email.message import EmailMessage
        
        msg = EmailMessage()
        msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
        msg["To"] = user_email
        msg["Subject"] = subject
        msg.set_content(message)
        
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        
        logger.info(f"Уведомление отправлено на {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"Ошибка отправки email: {e}")
        return False


def check_and_notify_upcoming_subscriptions(db: Session) -> dict:
    """
    Проверить подписки и отправить уведомления

    Args:
        db: Сессия базы данных

    Returns:
        Статистика: {checked, notified, failed}
    """
    stats = {"checked": 0, "notified": 0, "failed": 0}

    subscriptions = get_upcoming_subscriptions(db)
    stats["checked"] = len(subscriptions)

    for sub in subscriptions:
        delta = sub.next_billing_date - datetime.utcnow()
        days_until = delta.days
        
        message = format_notification_message(sub, days_until)

        user = db.query(User).filter(User.id == sub.user_id).first()

        if not user:
            logger.warning(f"Пользователь {sub.user_id} не найден")
            stats["failed"] += 1
            continue

        import asyncio

        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        sent = loop.run_until_complete(send_email_notification(user.email, f"🔔 Напоминание: {sub.name}", message))

        if sent:
            logger.info(f"Email отправлен на {user.email}")
            stats["notified"] += 1
        else:
            logger.warning(f"Email не отправлен на {user.email}")
            stats["failed"] += 1

    return stats
