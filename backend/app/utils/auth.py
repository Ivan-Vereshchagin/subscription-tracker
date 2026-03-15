# Утилиты для аутентификации

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings


# Алгоритм шифрования JWT
ALGORITHM = "HS256"

# Время жизни токена доступа (в минутах)
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Время жизни refresh-токена (в днях)
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_secret_key() -> str:
    """
    Получить секретный ключ для JWT
    """
    return getattr(settings, 'SECRET_KEY', 'subscription-tracker-secret-key-change-in-production')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверить пароль против хеша

    Args:
        plain_password: Пароль в открытом виде
        hashed_password: Хеш из базы данных

    Returns: True если пароль верный
    """
    import bcrypt
    
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """
    Создать хеш пароля

    Args: password: Пароль в открытом виде

    Returns: Хешированный пароль
    """
    import bcrypt
    
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Создать access-токен
    
    Args:
        data: Данные для кодирования
        expires_delta: Время жизни токена (по умолчанию 30 минут)
    
    Returns: JWT токен в виде строки
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        get_secret_key(),
        algorithm=ALGORITHM
    )
    
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    Создать refresh-токен
    
    Args: data: Данные для кодирования
    
    Returns: JWT refresh токен
    """
    expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return create_access_token(data, expires_delta)


def decode_token(token: str) -> Optional[dict]:
    """
    Расшифровать и проверить токен
    
    Args: token: JWT токен
    
    Returns: Данные из токена или None если токен невалидный
    """
    try:
        payload = jwt.decode(
            token,
            get_secret_key(),
            algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        return None
