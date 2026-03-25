"""
CRS VPN Web API — главное FastAPI приложение.
Порт: 8002 (бот использует 8001)

Импортирует shared код из vpn-bot через PYTHONPATH.
"""
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from web_api.config import settings
from web_api.routers import auth, subscriptions, payments, profile, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CRS VPN Web API starting up")
    logger.info(f"Database: {settings.DATABASE_URL[:40] if settings.DATABASE_URL else 'NOT SET'}...")
    logger.info(f"Remnawave: {settings.remna_base or 'NOT SET'}")
    yield
    logger.info("CRS VPN Web API shutting down")


app = FastAPI(
    title="CRS VPN Web API",
    description="REST API для веб-сайта CRS VPN",
    version="1.0.0",
    lifespan=lifespan,
    # Скрываем docs в production (опционально)
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,  # Нужен для httpOnly cookie
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/")
async def root():
    return {"service": "CRS VPN Web API", "version": "1.0.0", "status": "ok"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
