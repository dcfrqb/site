"""
Payments router.
GET  /payments           — история платежей
POST /payments/create    — создать платёж (YooKassa)
GET  /payments/{id}      — детали платежа
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.db.models import Payment, TelegramUser
from app.core.plans import PLAN_NAMES
from web_api.auth.jwt import get_current_user, TokenPayload
from web_api.database import get_db

router = APIRouter(prefix="/payments", tags=["payments"])

# Тарифы с ценами (должны совпадать с ботом)
PLAN_PRICES = {
    "basic_1":   {"amount": 199, "plan_code": "basic",   "period_months": 1,  "label": "Базовый • 1 месяц"},
    "basic_3":   {"amount": 499, "plan_code": "basic",   "period_months": 3,  "label": "Базовый • 3 месяца"},
    "basic_6":   {"amount": 899, "plan_code": "basic",   "period_months": 6,  "label": "Базовый • 6 месяцев"},
    "basic_12":  {"amount": 1599, "plan_code": "basic",  "period_months": 12, "label": "Базовый • 12 месяцев"},
    "premium_1": {"amount": 299, "plan_code": "premium", "period_months": 1,  "label": "Премиум • 1 месяц"},
    "premium_3": {"amount": 799, "plan_code": "premium", "period_months": 3,  "label": "Премиум • 3 месяца"},
    "premium_6": {"amount": 1499, "plan_code": "premium","period_months": 6,  "label": "Премиум • 6 месяцев"},
    "premium_12":{"amount": 2699, "plan_code": "premium","period_months": 12, "label": "Премиум • 12 месяцев"},
}


class CreatePaymentRequest(BaseModel):
    tariff: str  # Ключ из PLAN_PRICES: "basic_1", "premium_3", etc.


class CreatePaymentResponse(BaseModel):
    payment_url: str
    payment_id: str
    amount: int
    currency: str = "RUB"


class PaymentResponse(BaseModel):
    id: int
    provider: str
    external_id: str
    amount: float
    currency: str
    status: str
    description: Optional[str]
    paid_at: Optional[datetime]
    created_at: datetime


@router.get("", response_model=List[PaymentResponse])
async def list_payments(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 20,
    offset: int = 0,
):
    """История платежей текущего пользователя."""
    result = await db.execute(
        select(Payment)
        .where(Payment.telegram_user_id == current_user.sub)
        .order_by(Payment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    payments = result.scalars().all()

    return [
        PaymentResponse(
            id=p.id,
            provider=p.provider,
            external_id=p.external_id,
            amount=float(p.amount),
            currency=p.currency,
            status=p.status,
            description=p.description,
            paid_at=p.paid_at,
            created_at=p.created_at,
        )
        for p in payments
    ]


@router.post("/create", response_model=CreatePaymentResponse)
async def create_payment(
    request: CreatePaymentRequest,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Создаёт платёж YooKassa.
    Использует ту же функцию create_payment() что и бот.
    """
    tariff_info = PLAN_PRICES.get(request.tariff)
    if not tariff_info:
        raise HTTPException(status_code=400, detail=f"Unknown tariff: {request.tariff}")

    # Получаем данные пользователя
    result = await db.execute(
        select(TelegramUser).where(TelegramUser.telegram_id == current_user.sub)
    )
    tg_user = result.scalar_one_or_none()
    if not tg_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Используем create_payment из бота
    from app.services.payments.yookassa import create_payment as bot_create_payment

    try:
        payment_url, external_id = await bot_create_payment(
            amount_rub=tariff_info["amount"],
            description=tariff_info["label"],
            user_id=current_user.sub,
            plan_code=tariff_info["plan_code"],
            period_months=tariff_info["period_months"],
            username=tg_user.username,
            first_name=tg_user.first_name,
            last_name=tg_user.last_name,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment creation failed: {str(e)[:200]}")

    return CreatePaymentResponse(
        payment_url=payment_url,
        payment_id=external_id,
        amount=tariff_info["amount"],
    )


@router.get("/plans")
async def get_plans():
    """Возвращает список тарифов с ценами для отображения на сайте."""
    return {
        tariff_key: {
            **info,
            "plan_name": PLAN_NAMES.get(info["plan_code"], info["plan_code"]),
        }
        for tariff_key, info in PLAN_PRICES.items()
    }
