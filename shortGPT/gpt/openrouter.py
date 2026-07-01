"""Ультимативный модуль работы с OpenRouter.

Единая точка для:
- получения полного каталога моделей OpenRouter (со всеми метаданными);
- создания OpenAI-совместимого клиента под выбранную модель;
- чтения выбранной моделью/ключа из хранилища ключей.
"""
import base64
import os
import time

import requests
from openai import OpenAI

from shortGPT.config.api_db import ApiKeyManager

_IMAGE_COUNTER = [0]

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "openai/gpt-4o-mini"

# Кэш каталога моделей, чтобы не дёргать API на каждый запрос.
_MODELS_CACHE = {"ts": 0.0, "data": []}
_CACHE_TTL = 600  # секунд


def get_api_key():
    return ApiKeyManager.get_api_key("OPENROUTER_API_KEY")


def get_selected_model():
    return ApiKeyManager.get_api_key("OPENROUTER_MODEL") or DEFAULT_MODEL


def get_selected_image_model():
    """Модель генерации картинок. Пусто — значит используется поиск Bing."""
    return ApiKeyManager.get_api_key("OPENROUTER_IMAGE_MODEL") or ""


def get_client(api_key=None):
    """OpenAI-совместимый клиент, направленный на OpenRouter."""
    api_key = api_key or get_api_key()
    if not api_key:
        raise Exception("Не найден ключ OpenRouter API. Добавьте его во вкладке «Настройки».")
    return OpenAI(
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
        default_headers={
            "HTTP-Referer": "http://localhost:31415",
            "X-Title": "ShortGPT",
        },
    )


def fetch_models(api_key=None, force=False):
    """Полный каталог моделей OpenRouter (сырые словари со всеми полями)."""
    now = time.time()
    if not force and _MODELS_CACHE["data"] and now - _MODELS_CACHE["ts"] < _CACHE_TTL:
        return _MODELS_CACHE["data"]
    key = api_key if api_key is not None else get_api_key()
    headers = {"Authorization": f"Bearer {key}"} if key else {}
    resp = requests.get(f"{OPENROUTER_BASE_URL}/models", headers=headers, timeout=20)
    resp.raise_for_status()
    data = resp.json().get("data", [])
    _MODELS_CACHE.update(ts=now, data=data)
    return data


def _price_per_million(value):
    """Цена за 1M токенов ($). OpenRouter отдаёт цену за токен строкой."""
    try:
        return round(float(value) * 1_000_000, 4)
    except (TypeError, ValueError):
        return None


def _output_modalities(arch):
    """Выходные модальности модели ([] если неизвестно)."""
    out = arch.get("output_modalities")
    if out:
        return [str(x).strip() for x in out]
    modality = arch.get("modality") or ""
    if "->" in modality:
        return [x.strip() for x in modality.split("->")[-1].split("+")]
    return []


def model_summary(m):
    """Компактное представление модели для UI и выбора."""
    pricing = m.get("pricing", {}) or {}
    arch = m.get("architecture", {}) or {}
    top = m.get("top_provider", {}) or {}
    ctx = m.get("context_length") or top.get("context_length")
    modality = arch.get("modality")
    if not modality:
        inputs = arch.get("input_modalities") or []
        modality = "+".join(inputs) if inputs else ""
    prompt_price = _price_per_million(pricing.get("prompt"))
    completion_price = _price_per_million(pricing.get("completion"))
    is_free = (prompt_price in (0, 0.0)) and (completion_price in (0, 0.0))
    out_mods = _output_modalities(arch)
    return {
        "id": m.get("id", ""),
        "name": m.get("name", m.get("id", "")),
        "context": ctx,
        "prompt_price": prompt_price,
        "completion_price": completion_price,
        "modality": modality,
        "max_completion": top.get("max_completion_tokens"),
        "is_free": is_free,
        "is_image_gen": "image" in out_mods,
        "description": (m.get("description", "") or "").strip(),
    }


def list_model_summaries(api_key=None, force=False):
    """Список компактных описаний всех моделей."""
    return [model_summary(m) for m in fetch_models(api_key, force)]


def list_image_model_summaries(api_key=None, force=False):
    """Только модели, умеющие генерировать изображения (сортировка по id)."""
    models = [s for s in list_model_summaries(api_key, force) if s["is_image_gen"]]
    return sorted(models, key=lambda s: s["id"])


def generate_image(prompt, out_path=None, model=None, api_key=None):
    """Сгенерировать изображение выбранной моделью OpenRouter, вернуть путь к файлу."""
    model = model or get_selected_image_model()
    if not model:
        raise Exception("Не выбрана модель генерации картинок (вкладка «Настройки»).")
    key = api_key or get_api_key()
    if not key:
        raise Exception("Не найден ключ OpenRouter API.")
    resp = requests.post(
        f"{OPENROUTER_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:31415",
            "X-Title": "ShortGPT",
        },
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "modalities": ["image", "text"],
        },
        timeout=180,
    )
    resp.raise_for_status()
    data = resp.json()
    images = (data.get("choices") or [{}])[0].get("message", {}).get("images") or []
    if not images:
        raise Exception("Модель не вернула изображение")
    url = images[0].get("image_url", {}).get("url", "")
    b64 = url.split(",", 1)[1] if "," in url else url
    raw = base64.b64decode(b64)
    if not out_path:
        os.makedirs(".generated_images", exist_ok=True)
        _IMAGE_COUNTER[0] += 1
        out_path = f".generated_images/img_{int(time.time() * 1000)}_{_IMAGE_COUNTER[0]}.png"
    with open(out_path, "wb") as f:
        f.write(raw)
    return out_path


def get_model_info(model_id, api_key=None):
    """Метаданные конкретной модели. Безопасно возвращает None при сбое сети."""
    try:
        for m in fetch_models(api_key):
            if m.get("id") == model_id:
                return model_summary(m)
    except Exception as e:
        print("openrouter.get_model_info error:", e)
    return None
