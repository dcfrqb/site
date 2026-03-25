"""
JWT токены для web-api.
Access token (15 мин) + Refresh token (30 дней) в httpOnly cookie.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from pydantic import BaseModel
from fastapi import HTTPException, Cookie, status
from web_api.config import settings


class TokenPayload(BaseModel):
    sub: int  # telegram_id
    is_admin: bool = False
    exp: Optional[datetime] = None


def create_access_token(telegram_id: int, is_admin: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(telegram_id),
        "is_admin": is_admin,
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(telegram_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(telegram_id),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, token_type: str = "access") -> TokenPayload:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != token_type:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        return TokenPayload(
            sub=int(payload["sub"]),
            is_admin=payload.get("is_admin", False),
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(
    access_token: Optional[str] = Cookie(default=None),
) -> TokenPayload:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return decode_token(access_token, "access")


async def get_current_admin(
    current_user: TokenPayload = None,
    access_token: Optional[str] = Cookie(default=None),
) -> TokenPayload:
    user = await get_current_user(access_token)
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return user
