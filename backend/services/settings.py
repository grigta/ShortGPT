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
