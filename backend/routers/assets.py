"""Роуты библиотеки ассетов: листинг, загрузка файла, remote-регистрация, удаление."""
from __future__ import annotations

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.schemas import RemoteAssetRequest
from backend.services import assets as assets_svc
from backend.services.assets import AssetError

router = APIRouter(prefix="/assets")


def _handle(err: AssetError):
    raise HTTPException(status_code=err.status_code, detail=err.detail)


@router.get("")
def list_assets():
    return assets_svc.list_assets()


@router.post("/local", status_code=201)
async def add_local_asset(
    file: UploadFile = File(...),
    name: str = Form(...),
    asset_type: str = Form(...),
):
    data = await file.read()
    try:
        return assets_svc.add_local_asset(name, asset_type, file.filename or "", data)
    except AssetError as e:
        _handle(e)


@router.post("/remote", status_code=201)
def add_remote_asset(body: RemoteAssetRequest):
    try:
        return assets_svc.add_remote_asset(body.name, body.asset_type, body.url)
    except AssetError as e:
        _handle(e)


@router.delete("/{name}", status_code=204)
def delete_asset(name: str):
    try:
        assets_svc.delete_asset(name)
    except AssetError as e:
        _handle(e)
    return None
