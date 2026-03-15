# API роутер для аутентификации

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.crud.user import create_user, get_user, get_user_by_email
from app.database import get_db
from app.schemas.auth import Token, TokenRefresh, UserCreate, UserResponse
from app.utils.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["Аутентификация"],
)


@router.post("/register", response_model=UserResponse, status_code=201)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Зарегистрировать нового пользователя
    
    - email: Email адрес (должен быть уникальным)
    - password: Пароль (минимум 8 символов)
    """

    existing_user = get_user_by_email(db, email=user_data.email)
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )
    
    user = create_user(
        db=db,
        email=user_data.email,
        password=user_data.password,
    )
    
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Войти в систему и получить токены
    
    - username: Email адрес
    - password: Пароль
    
    Возвращает:
    - access_token: JWT токен для доступа к API (30 минут)
    - refresh_token: JWT токен для обновления access_token (7 дней)
    - token_type: "bearer"
    """

    user = get_user_by_email(db, email=form_data.username)
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь не активен",
        )
    
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/refresh", response_model=Token)
def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    """Обновить access токен используя refresh токен"""

    payload = decode_token(token_data.refresh_token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный refresh токен",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невалидный refresh токен",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user(db, user_id=user_id)
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    new_access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})
    
    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }
