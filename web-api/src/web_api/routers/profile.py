"""
Profile router.
GET  /profile      — профиль пользователя
PATCH /profile     — обновление профиля (language_code)
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.db.models import TelegramUser, Subscription, Payment
from web_api.auth.jwt import get_current_user, TokenPayload
from web_api.database import get_db

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileResponse(BaseModel):
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    is_admin: bool
    created_at: datetime
    last_activity_at: Optional[datetime]
    has_active_subscription: bool
    payments_count: int


@router.get("", response_model=ProfileResponse)
async def get_profile(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Полный профиль пользователя."""
    result = await db.execute(
        select(TelegramUser).where(TelegramUser.telegram_id == current_user.sub)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Считаем активные подписки
    sub_result = await db.execute(
        select(Subscription).where(
            Subscription.telegram_user_id == current_user.sub,
            Subscription.active == True,
        ).limit(1)
    )
    has_sub = sub_result.scalar_one_or_none() is not None

    # Считаем платежи
    pay_result = await db.execute(
        select(Payment).where(Payment.telegram_user_id == current_user.sub)
    )
    payments = pay_result.scalars().all()

    return ProfileResponse(
        telegram_id=user.telegram_id,
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        is_admin=user.is_admin,
        created_at=user.created_at,
        last_activity_at=user.last_activity_at,
        has_active_subscription=has_sub,
        payments_count=len(payments),
    )
