.PHONY: help dev build up down logs restart web-api frontend

help:
	@echo "CRS VPN Site"
	@echo ""
	@echo "Команды:"
	@echo "  make setup     — первичная настройка (.env)"
	@echo "  make up        — запустить все сервисы"
	@echo "  make dev       — режим разработки"
	@echo "  make down      — остановить"
	@echo "  make logs      — логи всех сервисов"
	@echo "  make build     — пересобрать образы"

setup:
	@if [ ! -f .env ]; then cp .env.example .env; echo "✓ .env создан — заполните переменные"; else echo ".env уже существует"; fi

up:
	docker compose up -d

build:
	docker compose build --no-cache

down:
	docker compose down

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f web-api

logs-frontend:
	docker compose logs -f frontend

restart:
	docker compose restart

restart-api:
	docker compose restart web-api

# Разработка — web-api с hot reload
dev-api:
	cd web-api && PYTHONPATH=src:/Users/will/Documents/CRS-Projects/VPN/vpn-bot/src \
		uvicorn web_api.main:app --reload --port 8002

# Разработка — frontend с hot reload
dev-frontend:
	cd frontend && npm run dev
