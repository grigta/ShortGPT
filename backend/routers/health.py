"""Health-роут: статус, наличие ключей, число активных рендеров."""
from __future__ import annotations

from fastapi import APIRouter, Request

from shortGPT.config.api_db import ApiKeyManager

router = APIRouter()

_HEALTH_KEYS = ["OPENROUTER_API_KEY", "ELEVENLABS_API_KEY", "PEXELS_API_KEY"]


@router.get("/health")
def health(request: Request):
    keys = {k: bool(ApiKeyManager.get_api_key(k)) for k in _HEALTH_KEYS}
    manager = getattr(request.app.state, "job_manager", None)
    jobs_running = manager.count_running() if manager else 0
    return {"status": "ok", "keys": keys, "jobs_running": jobs_running}
