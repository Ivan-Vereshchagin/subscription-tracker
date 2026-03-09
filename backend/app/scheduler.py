import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import SessionLocal
from app.services.notifications import check_and_notify_upcoming_subscriptions


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


def start_scheduler():
    """
    Запустить планировщик

    Добавляет задачи:
    - Проверка уведомлений: каждый день в 9:00
    """
    # Ежедневная проверка в 9:00 утра
    scheduler.add_job(
        check_notifications_job,
        CronTrigger(hour=9, minute=0),
        id="daily_notifications",
        name="Daily subscription notifications",
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
    
    Returns:
        BackgroundScheduler
    """
    return scheduler
