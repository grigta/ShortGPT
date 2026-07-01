"""Реестр ключей API и моделей с масками для GET, запись для PUT."""
from __future__ import annotations

from typing import List

from shortGPT.config.api_db import ApiKeyManager

# key -> (label, is_secret). Секретные маскируются в ответе GET.
KEY_REGISTRY = [
    ("OPENROUTER_API_KEY", "Ключ OpenRouter API", True),
    ("ELEVENLABS_API_KEY", "Ключ ElevenLabs API", True),
    ("PEXELS_API_KEY", "Ключ Pexels API", True),
    ("OPENROUTER_MODEL", "Модель OpenRouter (текст)", False),
    ("OPENROUTER_IMAGE_MODEL", "Модель OpenRouter (картинки)", False),
]

_REGISTRY_KEYS = {k for k, _, _ in KEY_REGISTRY}


def is_registered(key: str) -> bool:
    return key in _REGISTRY_KEYS


def mask_secret(value: str) -> str:
    """Маска секрета вида `abc…wxyz`. Короткие значения полностью скрыты."""
    if not value:
        return ""
    if len(value) <= 8:
        return "…"
    return f"{value[:3]}…{value[-4:]}"


def list_keys() -> List[dict]:
    out = []
    for key, label, is_secret in KEY_REGISTRY:
        value = ApiKeyManager.get_api_key(key) or ""
        is_set = bool(value)
        if is_secret:
            masked = mask_secret(value)
        else:
            masked = value  # имена моделей — открыто
        out.append({
            "key": key,
            "label": label,
            "is_secret": is_secret,
            "is_set": is_set,
            "masked_value": masked,
        })
    return out


def set_key(key: str, value: str) -> None:
    """Записать ключ. Пустая строка = очистить."""
    ApiKeyManager.set_api_key(key, value or "")


def verify_key(key: str, value: str):
    """Живая проверка сохранённого ключа у провайдера.

    Возвращает (valid, detail): valid=None — проверка неприменима/недоступна,
    True/False — результат. Сохранение НЕ блокирует: ключ уже записан,
    это диагностика для UI (типовая ошибка — ключ не того провайдера).
    """
    import requests

    if not value:
        return None, None
    try:
        if key == "OPENROUTER_API_KEY":
            r = requests.get("https://openrouter.ai/api/v1/key",
                             headers={"Authorization": f"Bearer {value}"}, timeout=10)
            if r.status_code == 200:
                return True, None
            msg = r.json().get("error", {}).get("message", r.text[:120])
            hint = " Ключ OpenRouter выглядит как sk-or-v1-…" if not value.startswith("sk-or-") else ""
            return False, f"OpenRouter не принял ключ ({r.status_code}: {msg}).{hint}"
        if key == "ELEVENLABS_API_KEY":
            r = requests.get("https://api.elevenlabs.io/v1/user",
                             headers={"xi-api-key": value}, timeout=10)
            if r.status_code == 200:
                return True, None
            detail = r.json().get("detail")
            msg = detail.get("message") if isinstance(detail, dict) else str(detail)[:120]
            return False, f"ElevenLabs не принял ключ ({r.status_code}: {msg})"
        if key == "PEXELS_API_KEY":
            r = requests.get("https://api.pexels.com/v1/search?query=test&per_page=1",
                             headers={"Authorization": value}, timeout=10)
            if r.status_code == 200:
                return True, None
            return False, f"Pexels не принял ключ ({r.status_code})"
    except Exception as e:
        return None, f"Проверка не удалась: {type(e).__name__}"
    return None, None
