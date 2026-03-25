# CRS VPN Site — SOURCE OF TRUTH

> Последнее обновление: 2026-03-26 (Шаг 0-2: Аудит + Архитектура)

---

## 1. ОПИСАНИЕ ЗАДАЧИ

Создать production-ready веб-сайт для продажи и управления VPN-подписками.

**Главная идея**: `vpn-bot` = backend + логика | `site` = web-интерфейс.
Одна система, а не два проекта.

**Требования:**
- Работает без VPN (доступен по прямому URL)
- Использует ту же PostgreSQL БД что и бот
- Переиспользует ту же бизнес-логику (сервисы, репозитории)
- Синхронизирован с ботом в реальном времени
- Поддерживает оплату через YooKassa
- Работает с подписками через Remnawave API
- Визуальный стиль — Remnawave-like (тёмная тема, минимализм)

---

## 2. ТЕКУЩИЙ СТЕК БОТА (vpn-bot)

| Компонент | Технология |
|-----------|-----------|
| Язык | Python 3.11 |
| Telegram | aiogram 3.x |
| API Framework | FastAPI 0.115+ |
| ORM | SQLAlchemy 2.x + asyncpg |
| БД | PostgreSQL 14 |
| Кэш | Redis 7 |
| Платежи | YooKassa SDK 3.x |
| Config | Pydantic 2.x Settings |
| Миграции | Alembic 1.x |
| Logging | loguru 0.7 |
| HTTP Client | httpx 0.27 |

**Путь к коду:** `~/Documents/CRS-Projects/VPN/vpn-bot/src/app/`

---

## 3. СХЕМА БАЗЫ ДАННЫХ

### Таблицы (SQLAlchemy models в `db/models.py`)

#### `remna_users`
| Поле | Тип | Описание |
|------|-----|---------|
| remna_id | String(64) PK | UUID пользователя из Remnawave |
| username | String(128) | Username в Remnawave |
| email | String(255) | Email |
| raw_data | JSON | Полный ответ от Remnawave API |
| created_at, updated_at | DateTime | Timestamps |
| last_synced_at | DateTime | Последняя синхронизация |

#### `telegram_users`
| Поле | Тип | Описание |
|------|-----|---------|
| telegram_id | BigInteger PK | Telegram User ID |
| username | String(64) | @username в Telegram |
| first_name, last_name | String | Имя пользователя |
| language_code | String(10) | Язык |
| remna_user_id | String(64) FK → remna_users | Связь с Remnawave |
| is_admin | Boolean | Флаг администратора |
| created_at, updated_at, last_activity_at | DateTime | Timestamps |

#### `subscriptions`
| Поле | Тип | Описание |
|------|-----|---------|
| id | Integer PK | |
| telegram_user_id | BigInteger FK | |
| remna_user_id | String FK | |
| plan_code | String(32) | "basic", "premium", "pro", "trial" |
| plan_name | String(128) | Человекочитаемое название |
| active | Boolean | Активна ли подписка |
| valid_until | DateTime | Дата окончания |
| is_lifetime | Boolean | Бессрочная (admin grant) |
| last_expiry_notice_at | DateTime | Для rate-limit уведомлений |
| config_data | JSON | Данные конфигурации VPN |
| remna_subscription_id | String(64) | ID в Remnawave |
| created_at, updated_at | DateTime | |

#### `payments`
| Поле | Тип | Описание |
|------|-----|---------|
| id | Integer PK | |
| telegram_user_id | BigInteger FK | |
| provider | String(32) | "yookassa", "crypto" |
| external_id | String(128) unique | ID платежа во внешней системе |
| amount | Numeric(10,2) | Сумма |
| currency | String(3) | "RUB" |
| status | String(24) | "pending"→"succeeded"/"canceled"/"failed" |
| subscription_id | Integer FK | |
| payment_metadata | JSON | Доп. данные (tariff, plan_code, etc.) |
| paid_at | DateTime | Время успешной оплаты |
| created_at, updated_at | DateTime | |

#### `squads` — Группы Remnawave (basic/premium)
#### `nodes` — VPN ноды Remnawave
#### `access_requests` — Запросы на ручную выдачу доступа

---

## 4. БИЗНЕС-ЛОГИКА БОТА

### User Lifecycle
1. `/start` → создание/обновление `TelegramUser` в БД
2. Sync с Remnawave → `SyncService` → обновление `RemnaUser`
3. Кэш (Redis) → 450s TTL для sync результатов

### Payment Flow (YooKassa)
1. Пользователь выбирает тариф → `create_payment()` → URL платежа
2. Редирект на YooKassa → оплата
3. Webhook `payment.succeeded` → `process_payment_webhook()`
   - Верификация через YooKassa API (не доверяем payload)
   - IP whitelist (185.71.76.0/27, 185.71.77.0/27, 77.75.153.0/25, 77.75.154.128/25, 2a02:5180::/32)
   - Идемпотентность через DB FSM
4. `provision_tariff()` → Remnawave
5. Уведомление пользователя в Telegram

### Subscription Flow (Remnawave)
1. `ensure_user_in_remnawave()` → get or create
2. Вычисление `valid_until`:
   - Продление от текущего expireAt если активна
   - Календарные месяцы (`relativedelta`)
   - Lifetime = "2099-12-31T23:59:59Z"
3. `update_user()` → expireAt + hwidDeviceLimit
4. Squad assignment: premium→"premium", basic/trial→"basic"
5. Инвалидация Redis кэша

### Тарифы
```
TARIFF_TO_PLAN:
  PRO_1M/3M/6M/12M → (premium, N месяцев)
  BASIC_1M/3M/6M/12M → (basic, N месяцев)
  premium_forever → (premium, -1) → lifetime

TARIFF_TO_DAYS:
  solokhin_15d → (premium, 15 дней)
  trial_10d → (basic, 10 дней)

Device limits:
  premium → 15 устройств
  basic → 5 устройств
```

### Текущие тарифы (plan_codes)
- `basic` → Базовый тариф
- `premium` → Премиум тариф
- `trial` → Пробный период
- `pro` → Про тариф

---

## 5. REMNAWAVE ИНТЕГРАЦИЯ

**Client:** `src/app/remnawave/client.py`
**Service:** `src/app/services/remna_service.py`

Ключевые методы RemnaClient:
- `get_or_create_user(telegram_id, ...)` → get/create по tg_id
- `get_user_by_id(uuid)` → данные пользователя
- `get_user_with_subscription_by_telegram_id(tg_id)` → полные данные
- `update_user(uuid, expire_at, hwid_device_limit, activeInternalSquads)` → обновление
- `get_squad_by_name(name)` → поиск сквада

**Connection:** httpx с pooling (20 keepalive, 100 total), retry 3x, timeout 30s
**Auth:** Bearer token (`REMNA_API_KEY`)

**ВАЖНО:**
- Remnawave = единственный источник правды по подпискам
- Lifetime = "2099-12-31T23:59:59Z" (Remna не поддерживает null)
- `SUBSCRIPTION_BASE_URL` — внешний домен для subscription URL (скрывает внутренний)

---

## 6. AUTH В БОТЕ

- Middleware `auth.py` создаёт/обновляет `TelegramUser` из Telegram данных
- `is_admin(user_id)` проверяет список `ADMINS` из settings
- Blocklist middleware блокирует `BLOCKED_TELEGRAM_IDS`

---

## 7. КОНФИГУРАЦИЯ (env vars)

```
# Telegram
BOT_TOKEN, ADMINS, BLOCKED_TELEGRAM_IDS, ADMIN_SUPPORT_USERNAME

# Database
DATABASE_URL (postgresql+asyncpg://...)

# Redis
REDIS_URL (redis://...)

# YooKassa
YOOKASSA_SHOP_ID, YOOKASSA_API_KEY, YOOKASSA_RETURN_URL, YOOKASSA_WEBHOOK_SECRET
YOOKASSA_WEBHOOK_URL=https://pay.crs-projects.com/webhook/yookassa

# Remnawave
REMNA_API_BASE (alias: REMNAWAVE_API_URL)
REMNA_API_KEY (alias: REMNAWAVE_API_TOKEN, REMNA_API_KEY)
SUBSCRIPTION_BASE_URL

# Other
PAYREQ_HMAC_SECRET (HMAC для ручных платежей)
CRYPTO_USDT_TRC20_ADDRESS
WEBHOOK_API_PORT=8001
```

---

## 8. ПРИНЯТЫЕ АРХИТЕКТУРНЫЕ РЕШЕНИЯ

### Что используем из бота
- Все SQLAlchemy модели (`db/models.py`) — БЕЗ изменений
- `RemnaClient` (`remnawave/client.py`) — переиспользуем напрямую
- `provision_tariff()` и `ensure_user_in_remnawave()` из `remna_service.py`
- Логику создания платежей YooKassa из `services/payments/yookassa.py`
- Redis кэш — та же база, новые префиксы для web

### Что создаём в site
- Next.js frontend (TypeScript + Mantine)
- Python FastAPI web-backend (отдельный сервис, shared БД)
- Web Auth: Telegram Login Widget → JWT
- Новые API endpoints (не трогаем bot API на порту 8001)

### Архитектурный паттерн
```
[Browser] → [Next.js Frontend :3000]
                    ↓ API calls
[Web API :8002] ←→ [PostgreSQL] ←→ [vpn-bot :8001]
     ↓                  ↑
[Redis Cache]    [Remnawave API]
```

---

## 9. АРХИТЕКТУРА САЙТА

### Структура проекта `site/`

```
site/
├── claude.md                    # ← ЭТОТ ФАЙЛ
├── docker-compose.yml           # Все сервисы
├── .env.example                 # Шаблон переменных
├── nginx/
│   └── nginx.conf               # Reverse proxy
│
├── web-api/                     # Python FastAPI web backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini              # (не нужны новые миграции)
│   └── src/
│       └── web_api/
│           ├── main.py          # FastAPI app
│           ├── config.py        # Settings (shared с ботом)
│           ├── auth/
│           │   ├── telegram.py  # Telegram Login Widget verification
│           │   └── jwt.py       # JWT токены
│           ├── routers/
│           │   ├── auth.py      # /auth/telegram, /auth/refresh
│           │   ├── profile.py   # /profile
│           │   ├── subscriptions.py # /subscriptions
│           │   ├── payments.py  # /payments, /payments/create
│           │   ├── webhook.py   # /webhook/yookassa (SHARED с ботом)
│           │   └── admin.py     # /admin/*
│           ├── services/        # Переиспользуем из vpn-bot
│           │   └── (symlink или copy)
│           └── middleware/
│               ├── cors.py
│               └── security.py
│
└── frontend/                    # Next.js
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── src/
    │   ├── app/                 # App Router
    │   │   ├── layout.tsx
    │   │   ├── page.tsx         # Landing
    │   │   ├── (public)/
    │   │   │   ├── plans/page.tsx
    │   │   │   └── faq/page.tsx
    │   │   ├── (auth)/
    │   │   │   └── login/page.tsx
    │   │   ├── dashboard/       # Личный кабинет
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx     # Профиль / Главная ЛК
    │   │   │   ├── subscription/page.tsx
    │   │   │   └── payments/page.tsx
    │   │   └── admin/           # Админка
    │   │       ├── layout.tsx
    │   │       ├── page.tsx
    │   │       ├── users/page.tsx
    │   │       └── subscriptions/page.tsx
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Header.tsx
    │   │   │   ├── Footer.tsx
    │   │   │   └── Sidebar.tsx
    │   │   ├── subscription/
    │   │   │   ├── SubscriptionCard.tsx
    │   │   │   ├── PlanCard.tsx
    │   │   │   └── ConnectionInstructions.tsx
    │   │   ├── payment/
    │   │   │   ├── PaymentForm.tsx
    │   │   │   └── PaymentHistory.tsx
    │   │   └── ui/             # Design system components
    │   ├── lib/
    │   │   ├── api.ts           # API client
    │   │   ├── auth.ts          # Auth helpers
    │   │   └── types.ts         # TypeScript types
    │   └── styles/
    │       └── globals.css
    └── public/
```

---

## 10. AUTH СХЕМА (WEB)

### Telegram Login Widget
```
1. Пользователь нажимает "Войти через Telegram"
2. Telegram Login Widget → callback с auth data
3. POST /auth/telegram {id, first_name, username, hash, auth_date}
4. Верификация HMAC-SHA256 с BOT_TOKEN
5. Создание/обновление TelegramUser в БД
6. Возврат JWT (access_token + refresh_token)
7. Хранение в httpOnly cookie
```

### JWT
- Access token: 15 минут
- Refresh token: 30 дней (в httpOnly cookie)
- Payload: `{sub: telegram_id, is_admin: bool}`

### Защита маршрутов
- `/dashboard/*` → требует JWT
- `/admin/*` → требует JWT + `is_admin=true`
- `/api/admin/*` → требует JWT + `is_admin=true`

---

## 11. PAYMENT СХЕМА (WEB)

```
[Web] POST /payments/create {plan_code, period_months}
  → create_payment() [shared из бота]
  → return {payment_url, payment_id}

[Browser] → redirect to payment_url (YooKassa)

[YooKassa] → webhook POST /webhook/yookassa
  → IP whitelist
  → process_payment_webhook() [shared из бота]
  → provision_tariff() → Remnawave
  → Notify via Telegram Bot (optional)

[Browser] return_url → /dashboard?payment=success
  → показать обновлённую подписку
```

**ВАЖНО:** webhook YooKassa должен обрабатываться ЕДИНСТВЕННЫМ сервисом
(либо оставляем на боте :8001, либо переносим в web-api :8002)
**Решение:** Оставляем webhook на порту бота (:8001), web-api только создаёт платежи.

---

## 12. SITEMAP / UX

### Публичные страницы
- `/` — Landing: hero, тарифы, FAQ, CTA
- `/plans` — Подробные тарифы с ценами
- `/faq` — Часто задаваемые вопросы
- `/login` — Вход через Telegram

### Личный кабинет (требует auth)
- `/dashboard` — Профиль + текущая подписка
- `/dashboard/subscription` — Детали подписки, VPN config URL, инструкции
- `/dashboard/payments` — История платежей
- `/dashboard/renew` — Продление/смена тарифа

### Админка (требует admin)
- `/admin` — Статистика
- `/admin/users` — Пользователи
- `/admin/subscriptions` — Подписки
- `/admin/payments` — Платежи

---

## 13. ДИЗАЙН-СИСТЕМА

**Тема:** Тёмная, минималистичная (Remnawave-like)
- Background: #0A0A0F (almost black)
- Surface: #111118
- Border: #1E1E2E
- Primary: #7C3AED (violet, как в Remnawave)
- Text: #E2E8F0
- Muted: #64748B

**Компоненты:** Mantine 7.x
- `ColorSchemeProvider` → dark by default
- Custom theme override
- Responsive: mobile-first

---

## 14. ТЕХНОЛОГИЧЕСКИЙ СТЕК САЙТА

### Frontend
- **Next.js 15** (App Router, TypeScript)
- **Mantine 7** (UI компоненты, тёмная тема)
- **Zustand** (state management)
- **SWR** (data fetching)
- **@telegram-auth/react** (Telegram Login Widget)

### Web API
- **FastAPI** (Python 3.11, asyncio)
- **SQLAlchemy 2.x + asyncpg** (та же БД, те же модели)
- **python-jose** (JWT)
- **Shared код** из `vpn-bot/src/app/`:
  - `db/models.py` — модели
  - `db/session.py` — сессия
  - `remnawave/client.py` — Remna клиент
  - `services/remna_service.py` — provision
  - `services/payments/yookassa.py` — платежи
  - `core/plans.py` — тарифы
  - `config.py` — конфигурация

### Infrastructure
- **Docker Compose** (site-specific)
- **Nginx** (reverse proxy: :80/:443 → frontend + web-api)
- Shared network с `vpn-bot` docker-compose

---

## 15. БЕЗОПАСНОСТЬ

- CORS: только доверенные origins
- CSRF: SameSite=Strict cookies
- XSS: CSP headers в nginx
- Auth: JWT в httpOnly cookie
- Webhook: IP whitelist (оставляем на боте)
- Admin: двойная проверка (JWT + is_admin в БД)
- Remnawave: внутренний URL скрыт, SUBSCRIPTION_BASE_URL для публичных ссылок
- Rate limiting: slowapi на /auth и /payments

---

## 16. DEVOPS

### Docker services (site/docker-compose.yml)
```yaml
services:
  frontend:    # Next.js :3000
  web-api:     # FastAPI :8002
  nginx:       # :80/:443 → frontend/web-api

# Shared (из vpn-bot docker-compose):
# db: PostgreSQL :5432
# redis: Redis :6379
```

### Деплой
- `site/` и `vpn-bot/` — отдельные docker-compose
- Shared network `vpn_network` для доступа к БД и Redis
- Nginx на сайте проксирует /api/* → web-api, /* → frontend

---

## 17. ОГРАНИЧЕНИЯ И ЗАПРЕТЫ

- НЕ создавать новую БД
- НЕ дублировать бизнес-логику
- НЕ переписывать бота
- НЕ ломать текущую систему
- НЕ выдумывать Remnawave API (использовать docs.rw)
- Webhook YooKassa остаётся на боте (порт 8001)

---

## 18. ПРОГРЕСС РЕАЛИЗАЦИИ

- [x] Шаг 0: claude.md создан
- [x] Шаг 1: Анализ кодовой базы бота (114 py файлов, 7 таблиц БД)
- [x] Шаг 2: Архитектура определена
- [x] Шаг 3: UX/UI — Sitemap и дизайн-система
- [x] Шаг 4: Реализация
  - [x] 4.1: Web API (FastAPI) — 8 файлов
    - web_api/config.py, database.py, main.py
    - auth/telegram.py, auth/jwt.py
    - routers/auth.py, profile.py, subscriptions.py, payments.py, admin.py
    - Dockerfile, requirements.txt
  - [x] 4.2: Frontend (Next.js 15 + Mantine 7)
    - app/layout.tsx, page.tsx (landing)
    - app/login/page.tsx (Telegram Login Widget)
    - app/dashboard/layout.tsx, page.tsx
    - app/dashboard/subscription/page.tsx
    - app/dashboard/payments/page.tsx
    - app/admin/layout.tsx, page.tsx
    - app/admin/users/page.tsx, subscriptions/page.tsx, payments/page.tsx
    - components/layout/Header.tsx, AuthProvider.tsx
    - lib/api.ts, auth-store.ts, theme.ts, utils.ts
    - styles/globals.css
    - Dockerfile, package.json, tsconfig.json, next.config.ts, postcss.config.js
  - [x] 4.3: Docker + Nginx
    - docker-compose.yml (frontend + web-api + nginx)
    - nginx/nginx.conf
    - .env.example, Makefile
- [ ] Шаг 5: Тесты и документация (следующая итерация)

### Ключевые технические решения (Шаг 4)

1. **Shared код через volume mount** — web-api Docker контейнер монтирует `vpn-bot/src` как `/opt/vpn-bot/src` и добавляет в PYTHONPATH. Импорты как `from app.db.models import TelegramUser` работают без копирования кода.

2. **JWT в httpOnly cookies** — access token (15 мин) + refresh token (30 дней, path=/auth/refresh). Защита от XSS.

3. **Telegram Login Widget** — HMAC-SHA256 верификация через bot token. `onTelegramAuth` callback через window global.

4. **Webhook YooKassa остаётся на боте (порт 8001)** — web-api только создаёт платежи через `create_payment()`, не обрабатывает webhook.

5. **Next.js rewrites** — `/api/*` на frontend проксируется в `web-api:8002`, так что CORS не нужен для browser → API запросов через Nginx.

---

## 19. СВЯЗИ БОТ ↔ САЙТ

```
vpn-bot                          site
  ├── db/models.py   ←──shared──→  web-api/models (import from bot path)
  ├── remnawave/     ←──shared──→  web-api/services/remna
  ├── services/pay   ←──shared──→  web-api/services/payments
  ├── core/plans.py  ←──shared──→  web-api/core/plans
  ├── config.py      ←──shared──→  web-api/config (same .env)
  │
  ├── Port :8001 (webhook YooKassa) ←── НЕ МЕНЯЕМ
  └── Port :8000 (Telegram bot)     ←── НЕ ТРОГАЕМ

web-api (новый сервис):
  └── Port :8002 (web REST API)     ←── НОВЫЙ
```
