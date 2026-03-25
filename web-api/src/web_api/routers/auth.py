"""
Auth router — Telegram Login Widget + JWT.
POST /auth/telegram — вход через Telegram
POST /auth/refresh  — обновление access token
POST /auth/logout   — выход
GET  /auth/me       — текущий пользователь
"""
import time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Response, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# Импортируем модели из бота
from app.db.models import TelegramUser
from web_api.auth.telegram import TelegramAuthData, verify_telegram_auth
from web_api.auth.jwt import (
    create_access_token, create_refresh_token,
    decode_token, get_current_user, TokenPayload
)
from web_api.config import settings
from web_api.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

# Max age for auth_date check (1 day)
AUTH_DATE_MAX_AGE = 86400


class AuthResponse(BaseModel):
    telegram_id: int
    username: Optional[str]
    first_name: str
    is_admin: bool


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/telegram", response_model=AuthResponse)
async def login_telegram(
    auth_data: TelegramAuthData,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Верифицирует данные Telegram Login Widget и выдаёт JWT.
    Создаёт или обновляет TelegramUser в БД.
    """
    bot_token = settings.telegram_bot_token
    if not bot_token:
        raise HTTPException(status_code=500, detail="Bot token not configured")

    # Проверяем подпись
    if not verify_telegram_auth(auth_data, bot_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram auth data")

    # Проверяем свежесть (не старше 1 дня)
    if time.time() - auth_data.auth_date > AUTH_DATE_MAX_AGE:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Auth data expired")

    # Получаем или создаём пользователя
    result = await db.execute(
        select(TelegramUser).where(TelegramUser.telegram_id == auth_data.id)
    )
    user = result.scalar_one_or_none()

    is_admin = auth_data.id in settings.get_admin_ids()

    if user is None:
        user = TelegramUser(
            telegram_id=auth_data.id,
            username=auth_data.username,
            first_name=auth_data.first_name,
            last_name=auth_data.last_name,
            is_admin=is_admin,
            last_activity_at=datetime.utcnow(),
        )
        db.add(user)
    else:
        user.username = auth_data.username
        user.first_name = auth_data.first_name
        user.last_name = auth_data.last_name
        user.last_activity_at = datetime.utcnow()
        if is_admin and not user.is_admin:
            user.is_admin = True

    await db.commit()
    await db.refresh(user)

    # Создаём токены
    access_token = create_access_token(user.telegram_id, user.is_admin)
    refresh_token = create_refresh_token(user.telegram_id)

    # Устанавливаем cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/auth/refresh",
    )

    return AuthResponse(
        telegram_id=user.telegram_id,
        username=user.username,
        first_name=user.first_name or "",
        is_admin=user.is_admin,
    )


@router.post("/refresh")
async def refresh_token(
    response: Response,
    refresh_token_cookie: Optional[str] = None,
    body: Optional[RefreshRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """Обновляет access token по refresh token."""
    token = refresh_token_cookie or (body.refresh_token if body else None)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")

    payload = decode_token(token, "refresh")

    # Проверяем что пользователь существует
    result = await db.execute(
        select(TelegramUser).where(TelegramUser.telegram_id == payload.sub)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access_token = create_access_token(user.telegram_id, user.is_admin)

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return {"ok": True}


@router.post("/logout")
async def logout(response: Response):
    """Выход — удаляем cookies."""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token", path="/auth/refresh")
    return {"ok": True}


@router.get("/me", response_model=AuthResponse)
async def get_me(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает данные текущего пользователя."""
    result = await db.execute(
        select(TelegramUser).where(TelegramUser.telegram_id == current_user.sub)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return AuthResponse(
        telegram_id=user.telegram_id,
        username=user.username,
        first_name=user.first_name or "",
        is_admin=user.is_admin,
    )
