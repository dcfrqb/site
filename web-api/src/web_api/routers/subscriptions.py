"""
Subscriptions router.
GET  /subscriptions/current  — текущая подписка
GET  /subscriptions/status   — статус (active/expired/none) + expires_at
GET  /subscriptions/connect  — subscription URL для подключения VPN
"""
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.models import TelegramUser, Subscription
from app.remnawave.client import RemnaClient
from web_api.auth.jwt import get_current_user, TokenPayload
from web_api.database import get_db
from web_api.config import settings

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


class SubscriptionResponse(BaseModel):
    active: bool
    plan_code: Optional[str]
    plan_name: Optional[str]
    valid_until: Optional[datetime]
    is_lifetime: bool
    status: str  # "active" | "expired" | "none"
    days_left: Optional[int]


class ConnectResponse(BaseModel):
    subscription_url: Optional[str]
    remna_user_id: Optional[str]


@router.get("/current", response_model=SubscriptionResponse)
async def get_current_subscription(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает активную подписку пользователя из БД."""
    result = await db.execute(
        select(Subscription)
        .where(
            Subscription.telegram_user_id == current_user.sub,
            Subscription.active == True,
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()

    if not sub:
        return SubscriptionResponse(
            active=False,
            plan_code=None,
            plan_name=None,
            valid_until=None,
            is_lifetime=False,
            status="none",
            days_left=None,
        )

    now = datetime.now(timezone.utc)
    if sub.is_lifetime:
        status = "active"
        days_left = None
    elif sub.valid_until:
        vu = sub.valid_until
        if vu.tzinfo is None:
            vu = vu.replace(tzinfo=timezone.utc)
        if vu > now:
            status = "active"
            days_left = (vu - now).days
        else:
            status = "expired"
            days_left = 0
    else:
        status = "none"
        days_left = None

    return SubscriptionResponse(
        active=sub.active,
        plan_code=sub.plan_code,
        plan_name=sub.plan_name,
        valid_until=sub.valid_until,
        is_lifetime=sub.is_lifetime,
        status=status,
        days_left=days_left,
    )


@router.get("/status")
async def get_subscription_status(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Быстрый статус подписки из Remnawave API (актуальные данные).
    """
    # Получаем remna_user_id из БД
    result = await db.execute(
        select(TelegramUser).where(TelegramUser.telegram_id == current_user.sub)
    )
    tg_user = result.scalar_one_or_none()
    if not tg_user:
        return {"status": "none", "expires_at": None}

    client = RemnaClient()
    try:
        data = await client.get_user_with_subscription_by_telegram_id(current_user.sub)
        if not data:
            return {"status": "none", "expires_at": None}

        # Извлекаем expireAt из ответа Remna
        user_data = data if isinstance(data, dict) else {}
        expire_raw = (
            user_data.get("expireAt")
            or user_data.get("expire_at")
            or user_data.get("expires_at")
        )

        if not expire_raw:
            return {"status": "none", "expires_at": None}

        # Парсим дату
        try:
            expire_str = str(expire_raw).replace("Z", "+00:00")
            expires_at = datetime.fromisoformat(expire_str)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
        except Exception:
            return {"status": "unknown", "expires_at": None}

        now = datetime.now(timezone.utc)

        # Lifetime check
        if expires_at.year >= 2099:
            return {"status": "active", "expires_at": None, "is_lifetime": True}

        if expires_at > now:
            days_left = (expires_at - now).days
            return {
                "status": "active",
                "expires_at": expires_at.isoformat(),
                "days_left": days_left,
            }
        else:
            return {"status": "expired", "expires_at": expires_at.isoformat(), "days_left": 0}

    except Exception as e:
        return {"status": "error", "detail": str(e)[:100]}
    finally:
        await client.close()


@router.get("/connect", response_model=ConnectResponse)
async def get_connect_info(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает subscription URL для подключения VPN.
    URL берётся из Remnawave API и опционально переопределяется через SUBSCRIPTION_BASE_URL.
    """
    result = await db.execute(
        select(TelegramUser).where(TelegramUser.telegram_id == current_user.sub)
    )
    tg_user = result.scalar_one_or_none()
    if not tg_user or not tg_user.remna_user_id:
        raise HTTPException(status_code=404, detail="No VPN account found")

    client = RemnaClient()
    try:
        user_data = await client.get_user_by_id(tg_user.remna_user_id)
        if not user_data:
            raise HTTPException(status_code=404, detail="VPN user not found")

        raw = user_data.get("response", user_data) if isinstance(user_data, dict) else user_data

        # Ищем subscription URL в ответе
        sub_url = (
            raw.get("subscriptionUrl")
            or raw.get("subscription_url")
            or raw.get("subUrl")
        )

        # Переопределяем домен если задан SUBSCRIPTION_BASE_URL
        if sub_url and settings.SUBSCRIPTION_BASE_URL:
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(sub_url)
            base_parsed = urlparse(settings.SUBSCRIPTION_BASE_URL)
            sub_url = urlunparse(parsed._replace(
                scheme=base_parsed.scheme,
                netloc=base_parsed.netloc
            ))

        return ConnectResponse(
            subscription_url=sub_url,
            remna_user_id=tg_user.remna_user_id,
        )
    finally:
        await client.close()
