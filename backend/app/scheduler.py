import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import func

from app.database import SessionLocal
from app.services.notifications import check_and_notify_upcoming_subscriptions
from app.models.subscription import Subscription
from app.models.payment import Payment


logger = logging.getLogger(__name__)


scheduler = BackgroundScheduler()


def check_notifications_job():
    """
    Задача проверки уведомлений

    Запускается планировщиком, создаёт сессию БД
    и проверяет предстоящие списания
    """
    logger.info("Запуск задачи проверки уведомлений...")

    db = SessionLocal()
    try:
        stats = check_and_notify_upcoming_subscriptions(db)
        logger.info(f"Проверка завершена: {stats}")
    except Exception as e:
        logger.error(f"Ошибка при проверке уведомлений: {e}")
    finally:
        db.close()


def create_pending_payments_job():
    """
    Задача создания ожидающих платежей

    Создаёт платежи со статусом 'pending' за 1-3 дня до next_billing_date
    """
    logger.info("Запуск задачи создания pending платежей...")

    db = SessionLocal()
    try:
        # Диапазон дат: от завтра до 3 дней спустя
        min_date = (datetime.utcnow() + timedelta(days=1)).date()
        max_date = (datetime.utcnow() + timedelta(days=3)).date()

        subscriptions = db.query(Subscription).filter(
            Subscription.is_active == True,
            Subscription.next_billing_date != None,
            func.date(Subscription.next_billing_date) >= min_date,
            func.date(Subscription.next_billing_date) <= max_date,
        ).all()

        created_count = 0

        for sub in subscriptions:
            payment_date = sub.next_billing_date.date() if hasattr(sub.next_billing_date, 'date') else sub.next_billing_date
            
            existing = db.query(Payment).filter(
                Payment.subscription_id == sub.id,
                func.date(Payment.payment_date) == payment_date,
            ).first()

            if not existing:
                if sub.billing_cycle == 'weekly':
                    days_delta = 7
                elif sub.billing_cycle == 'monthly':
                    days_delta = 30
                elif sub.billing_cycle == 'quarterly':
                    days_delta = 90
                elif sub.billing_cycle == 'semi-annual':
                    days_delta = 180
                elif sub.billing_cycle == 'yearly':
                    days_delta = 365
                else:
                    days_delta = 30

                period_end = datetime.utcnow() + timedelta(days=days_delta)

                payment = Payment(
                    subscription_id=sub.id,
                    user_id=sub.user_id,
                    amount=sub.price,
                    currency=sub.currency,
                    payment_date=datetime.combine(payment_date, datetime.min.time()),
                    period_start=datetime.utcnow(),
                    period_end=period_end,
                    status='pending'
                )
                db.add(payment)
                created_count += 1

        db.commit()
        logger.info(f"Создано {created_count} pending платежей")

    except Exception as e:
        logger.error(f"Ошибка при создании pending платежей: {e}")
        db.rollback()
    finally:
        db.close()


def cancel_expired_pending_payments_job():
    """
    Задача отмены просроченных pending платежей
    
    Отменяет платежи со статусом 'pending', которые были созданы более 7 дней назад
    и дата платежа уже прошла
    """
    logger.info("Запуск задачи отмены просроченных pending платежей...")
    
    db = SessionLocal()
    try:
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        pending_payments = db.query(Payment).filter(
            Payment.status == 'pending',
            Payment.created_at < week_ago,
            Payment.payment_date < datetime.utcnow(),
        ).all()
        
        cancelled_count = 0
        
        for payment in pending_payments:
            payment.status = 'cancelled'
            cancelled_count += 1
        
        db.commit()
        logger.info(f"Отменено {cancelled_count} просроченных pending платежей")
        
    except Exception as e:
        logger.error(f"Ошибка при отмене pending платежей: {e}")
        db.rollback()
    finally:
        db.close()


def start_scheduler():
    """
    Запустить планировщик

    Добавляет задачи:
    - Проверка уведомлений: каждый день в 9:00
    - Создание pending платежей: каждый день в 00:00
    - Отмена просроченных pending: каждый день в 01:00
    """
    
    scheduler.add_job(
        check_notifications_job,
        CronTrigger(hour=9, minute=0),
        id="daily_notifications",
        name="Daily subscription notifications",
        replace_existing=True,
    )
    
    # Ежедневное создание pending платежей в 00:00
    scheduler.add_job(
        create_pending_payments_job,
        CronTrigger(hour=0, minute=0),
        id="create_pending_payments",
        name="Create pending payments",
        replace_existing=True,
    )
    
    # Ежедневная отмена просроченных pending платежей в 01:00
    scheduler.add_job(
        cancel_expired_pending_payments_job,
        CronTrigger(hour=1, minute=0),
        id="cancel_expired_pending_payments",
        name="Cancel expired pending payments",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Планировщик запущен. Задачи добавлены.")

    return scheduler


def stop_scheduler():
    """
    Остановить планировщик
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Планировщик остановлен")


def get_scheduler():
    """
    Получить экземпляр планировщика
    
    Returns: BackgroundScheduler
    """
    return scheduler
