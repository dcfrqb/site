"""
Database session для web-api.
Подключается к той же PostgreSQL БД что и бот.
"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator
from web_api.config import settings

_db_url = settings.DATABASE_URL or ""
if _db_url.startswith("postgresql://") and "+asyncpg" not in _db_url:
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    _db_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_timeout=30,
    connect_args={
        "server_settings": {"application_name": "crs_vpn_web"},
        "command_timeout": 60,
        "prepared_statement_cache_size": 0,
    },
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency для получения сессии БД."""
    async with SessionLocal() as session:
        yield session
