"""
Admin router.
GET  /admin/users          — список пользователей
GET  /admin/users/{id}     — пользователь
GET  /admin/subscriptions  — все подписки
GET  /admin/payments       — все платежи
GET  /admin/stats          — статистика
POST /admin/grant/{tg_id}  — выдать подписку вручную
"""
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.db.models import TelegramUser, Subscription, Payment
from web_api.auth.jwt import get_current_admin, TokenPayload
from web_api.database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


class UserAdminResponse(BaseModel):
    telegram_id: int
    username: Optional[str]
    first_name: Optional[str]
    is_admin: bool
    created_at: datetime
    last_activity_at: Optional[datetime]
    has_active_subscription: bool


class StatsResponse(BaseModel):
    total_users: int
    active_subscriptions: int
    total_payments: int
    succeeded_payments: int
    revenue_rub: float


class GrantRequest(BaseModel):
    tariff: str  # e.g. "premium_forever", "PRO_1M"
    reason: Optional[str] = None


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    _: TokenPayload = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users_r = await db.execute(select(func.count(TelegramUser.telegram_id)))
    total_users = total_users_r.scalar() or 0

    active_subs_r = await db.execute(
        select(func.count(Subscription.id)).where(Subscription.active == True)
    )
    active_subs = active_subs_r.scalar() or 0

    total_pay_r = await db.execute(select(func.count(Payment.id)))
    total_payments = total_pay_r.scalar() or 0

    succeeded_r = await db.execute(
        select(func.count(Payment.id)).where(Payment.status == "succeeded")
    )
    succeeded = succeeded_r.scalar() or 0

    revenue_r = await db.execute(
        select(func.sum(Payment.amount)).where(Payment.status == "succeeded")
    )
    revenue = float(revenue_r.scalar() or 0)

    return StatsResponse(
        total_users=total_users,
        active_subscriptions=active_subs,
        total_payments=total_payments,
        succeeded_payments=succeeded,
        revenue_rub=revenue,
    )


@router.get("/users", response_model=List[UserAdminResponse])
async def list_users(
    _: TokenPayload = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=200),
    offset: int = 0,
    search: Optional[str] = None,
):
    query = select(TelegramUser)
    if search:
        query = query.where(
            TelegramUser.username.ilike(f"%{search}%")
            | TelegramUser.first_name.ilike(f"%{search}%")
        )
    query = query.order_by(TelegramUser.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    users = result.scalars().all()

    # Получаем активные подписки для всех пользователей одним запросом
    user_ids = [u.telegram_id for u in users]
    if user_ids:
        subs_result = await db.execute(
            select(Subscription.telegram_user_id).where(
                and_(
                    Subscription.telegram_user_id.in_(user_ids),
                    Subscription.active == True,
                )
            )
        )
        active_sub_ids = {row[0] for row in subs_result}
    else:
        active_sub_ids = set()

    return [
        UserAdminResponse(
            telegram_id=u.telegram_id,
            username=u.username,
            first_name=u.first_name,
            is_admin=u.is_admin,
            created_at=u.created_at,
            last_activity_at=u.last_activity_at,
            has_active_subscription=u.telegram_id in active_sub_ids,
        )
        for u in users
    ]


@router.get("/payments")
async def list_all_payments(
    _: TokenPayload = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=200),
    offset: int = 0,
    status_filter: Optional[str] = None,
):
    query = select(Payment)
    if status_filter:
        query = query.where(Payment.status == status_filter)
    query = query.order_by(Payment.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    payments = result.scalars().all()

    return [
        {
            "id": p.id,
            "telegram_user_id": p.telegram_user_id,
            "provider": p.provider,
            "external_id": p.external_id,
            "amount": float(p.amount),
            "currency": p.currency,
            "status": p.status,
            "description": p.description,
            "paid_at": p.paid_at,
            "created_at": p.created_at,
        }
        for p in payments
    ]


@router.get("/subscriptions")
async def list_all_subscriptions(
    _: TokenPayload = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, le=200),
    offset: int = 0,
    active_only: bool = False,
):
    query = select(Subscription)
    if active_only:
        query = query.where(Subscription.active == True)
    query = query.order_by(Subscription.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    subs = result.scalars().all()

    return [
        {
            "id": s.id,
            "telegram_user_id": s.telegram_user_id,
            "plan_code": s.plan_code,
            "plan_name": s.plan_name,
            "active": s.active,
            "valid_until": s.valid_until,
            "is_lifetime": s.is_lifetime,
            "created_at": s.created_at,
        }
        for s in subs
    ]


@router.post("/grant/{telegram_id}")
async def admin_grant_subscription(
    telegram_id: int,
    request: GrantRequest,
    admin: TokenPayload = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Выдаёт подписку пользователю вручную (admin-only).
    Использует provision_tariff() из бота.
    """
    # Проверяем существование пользователя
    result = await db.execute(
        select(TelegramUser).where(TelegramUser.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.services.remna_service import provision_tariff
    success = await provision_tariff(
        telegram_id=telegram_id,
        tariff=request.tariff,
        req_id=f"admin_web_{admin.sub}",
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to provision subscription")

    return {"ok": True, "telegram_id": telegram_id, "tariff": request.tariff}
