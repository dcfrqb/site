"""
Web API config.
Читает тот же .env что и бот + web-specific переменные.
"""
from pathlib import Path
from typing import Union, List
from pydantic_settings import BaseSettings, SettingsConfigDict


class WebSettings(BaseSettings):
    # === Shared с ботом ===
    DATABASE_URL: Union[str, None] = None
    REDIS_URL: Union[str, None] = None

    YOOKASSA_SHOP_ID: Union[str, None] = None
    YOOKASSA_API_KEY: Union[str, None] = None
    YOOKASSA_RETURN_URL: Union[str, None] = None
    YOOKASSA_WEBHOOK_SECRET: Union[str, None] = None

    REMNA_API_BASE: Union[str, None] = None
    REMNA_API_KEY: Union[str, None] = None
    REMNAWAVE_API_URL: Union[str, None] = None
    REMNAWAVE_API_TOKEN: Union[str, None] = None
    SUBSCRIPTION_BASE_URL: Union[str, None] = None

    BOT_TOKEN: Union[str, None] = None
    ADMINS: Union[str, None] = None

    # === Web-specific ===
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    WEB_API_PORT: int = 8002
    WEB_API_HOST: str = "0.0.0.0"

    CORS_ORIGINS: Union[str, None] = "https://site.crs-projects.com"

    TELEGRAM_LOGIN_BOT_TOKEN: Union[str, None] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def get_cors_origins(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["https://site.crs-projects.com"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def get_admin_ids(self) -> List[int]:
        if not self.ADMINS:
            return []
        s = str(self.ADMINS).strip()
        if not s:
            return []
        for sep in [",", ";", " "]:
            if sep in s:
                parts = [p.strip() for p in s.split(sep)]
                return [int(p) for p in parts if p.isdigit()]
        return [int(s)] if s.isdigit() else []

    @property
    def remna_base(self) -> str | None:
        return self.REMNA_API_BASE or self.REMNAWAVE_API_URL

    @property
    def remna_key(self) -> str | None:
        return self.REMNA_API_KEY or self.REMNAWAVE_API_TOKEN

    @property
    def telegram_bot_token(self) -> str | None:
        return self.TELEGRAM_LOGIN_BOT_TOKEN or self.BOT_TOKEN


settings = WebSettings()
