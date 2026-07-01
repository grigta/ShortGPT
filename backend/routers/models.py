"""Роуты каталога моделей OpenRouter: список с фильтрами (GET), выбор (PUT)."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.schemas import ModelSelect
from shortGPT.config.api_db import ApiKeyManager
from shortGPT.gpt import openrouter

router = APIRouter(prefix="/models")


@router.get("")
def list_models(
    q: Optional[str] = None,
    free_only: bool = False,
    image_only: bool = False,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    force: bool = False,
):
    try:
        items = openrouter.list_model_summaries(force=force)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Не удалось получить каталог моделей: {e}")

    if q:
        needle = q.lower()
        items = [m for m in items
                 if needle in (m.get("id") or "").lower()
                 or needle in (m.get("name") or "").lower()]
    if free_only:
        items = [m for m in items if m.get("is_free")]
    if image_only:
        items = [m for m in items if m.get("is_image_gen")]

    total = len(items)
    page = items[offset:offset + limit]
    return {
        "total": total,
        "items": page,
        "selected": openrouter.get_selected_model(),
        "selected_image": openrouter.get_selected_image_model(),
    }


@router.put("/selected")
def select_model(body: ModelSelect):
    key = "OPENROUTER_IMAGE_MODEL" if body.target == "image" else "OPENROUTER_MODEL"
    ApiKeyManager.set_api_key(key, body.model_id or "")
    return {"target": body.target, "model_id": body.model_id}
