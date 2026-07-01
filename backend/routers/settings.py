"""Роуты настроек: реестр ключей (GET) и запись значения (PUT)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.schemas import KeyUpdate
from backend.services import settings as settings_svc

router = APIRouter(prefix="/settings")


@router.get("/keys")
def get_keys():
    return settings_svc.list_keys()


@router.put("/keys/{key}")
def put_key(key: str, body: KeyUpdate):
    if not settings_svc.is_registered(key):
        raise HTTPException(status_code=404, detail=f"Неизвестный ключ: {key}")
    settings_svc.set_key(key, body.value)
    return {"key": key, "is_set": bool(body.value)}
