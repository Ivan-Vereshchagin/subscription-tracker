"""
CRUD операции для пользователей
"""
from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.auth import get_password_hash


def get_user(db: Session, user_id: str) -> Optional[User]:
    """
    Получить пользователя по ID
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
    
    Returns:
        Пользователь или None
    """
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """
    Получить пользователя по email
    
    Args:
        db: Сессия базы данных
        email: Email адрес
    
    Returns:
        Пользователь или None
    """
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, email: str, password: str, is_superuser: bool = False) -> User:
    """
    Создать нового пользователя
    
    Args:
        db: Сессия базы данных
        email: Email адрес
        password: Пароль (в открытом виде, будет захеширован)
        is_superuser: Права суперпользователя
    
    Returns:
        Созданный пользователь
    """
    # Хешируем пароль перед сохранением
    hashed_password = get_password_hash(password)
    
    user = User(
        email=email,
        hashed_password=hashed_password,
        is_superuser=is_superuser,
        is_active=True,
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


def update_user(
    db: Session,
    user_id: str,
    **kwargs
) -> Optional[User]:
    """
    Обновить данные пользователя
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        **kwargs: Поля для обновления
    
    Returns:
        Обновлённый пользователь или None
    """
    user = get_user(db, user_id)
    
    if not user:
        return None
    
    # Если передан пароль — хешируем его
    if "password" in kwargs:
        kwargs["hashed_password"] = get_password_hash(kwargs.pop("password"))
    
    # Обновляем только переданные поля
    for field, value in kwargs.items():
        if value is not None and hasattr(user, field):
            setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    return user


def delete_user(db: Session, user_id: str) -> bool:
    """
    Удалить пользователя
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
    
    Returns:
        True если удалён, False если не найден
    """
    user = get_user(db, user_id)
    
    if not user:
        return False
    
    db.delete(user)
    db.commit()
    
    return True
