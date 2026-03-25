"""
Верификация Telegram Login Widget.
https://core.telegram.org/widgets/login#checking-authorization
"""
import hashlib
import hmac
from typing import Optional
from pydantic import BaseModel


class TelegramAuthData(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str


def verify_telegram_auth(data: TelegramAuthData, bot_token: str) -> bool:
    """
    Верифицирует данные от Telegram Login Widget.

    Алгоритм:
    1. Собрать строку из всех полей кроме hash: key=value\n... (отсортировать)
    2. secret_key = SHA256(bot_token)
    3. HMAC-SHA256(secret_key, data_check_string) == hash
    """
    # Собираем данные для проверки (все поля кроме hash)
    data_dict = data.model_dump(exclude={"hash"})
    data_check_arr = [
        f"{k}={v}"
        for k, v in sorted(data_dict.items())
        if v is not None
    ]
    data_check_string = "\n".join(data_check_arr)

    # secret_key = SHA256(bot_token)
    secret_key = hashlib.sha256(bot_token.encode()).digest()

    # HMAC-SHA256
    computed_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed_hash, data.hash)


def verify_telegram_webapp_init_data(init_data: str, bot_token: str) -> Optional[dict]:
    """
    Верифицирует Telegram WebApp initData.
    Возвращает распарсенные данные или None если невалидно.
    """
    from urllib.parse import parse_qs, unquote
    import json
    import time

    parsed = parse_qs(init_data)
    received_hash = parsed.get("hash", [None])[0]
    if not received_hash:
        return None

    # Строим data_check_string без hash
    data_check_arr = []
    for key, values in sorted(parsed.items()):
        if key == "hash":
            continue
        data_check_arr.append(f"{key}={values[0]}")
    data_check_string = "\n".join(data_check_arr)

    # secret_key = HMAC-SHA256("WebAppData", bot_token)
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        return None

    # Парсим user из initData
    user_raw = parsed.get("user", [None])[0]
    if user_raw:
        try:
            return json.loads(unquote(user_raw))
        except Exception:
            pass
    return {}
