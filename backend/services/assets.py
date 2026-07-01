"""Библиотека ассетов: листинг, загрузка файла, remote-регистрация, удаление."""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import List

import pandas as pd

from shortGPT.config.asset_db import (AUDIO_EXTENSIONS, IMAGE_EXTENSIONS,
                                      VIDEO_EXTENSIONS, AssetDatabase, AssetType)

PUBLIC_DIR = "public"
NAME_RE = re.compile(r"^[A-Za-z0-9 _-]+$")

# Значение asset_type (строка) -> (AssetType, допустимые расширения)
_TYPE_MAP = {
    AssetType.VIDEO.value: (AssetType.VIDEO, VIDEO_EXTENSIONS),
    AssetType.AUDIO.value: (AssetType.AUDIO, AUDIO_EXTENSIONS),
    AssetType.IMAGE.value: (AssetType.IMAGE, IMAGE_EXTENSIONS),
    AssetType.BACKGROUND_MUSIC.value: (AssetType.BACKGROUND_MUSIC, AUDIO_EXTENSIONS),
    AssetType.BACKGROUND_VIDEO.value: (AssetType.BACKGROUND_VIDEO, VIDEO_EXTENSIONS),
    AssetType.OTHER.value: (AssetType.OTHER, None),
}


class AssetError(Exception):
    """Ошибка бизнес-логики ассетов (маппится в HTTP на уровне роутера)."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def valid_asset_types() -> List[str]:
    return list(_TYPE_MAP.keys())


def list_assets() -> List[dict]:
    """get_df() -> records, чистка pandas-NaN в None."""
    df = AssetDatabase.get_df()
    if df is None or df.empty:
        return []
    df = df.where(pd.notna(df), None)
    records = df.to_dict("records")
    for r in records:
        r.setdefault("duration", None)  # duration ленив, в листинге не считаем
    return records


def _resolve_type(asset_type: str):
    if asset_type not in _TYPE_MAP:
        raise AssetError(422, f"Неизвестный тип ассета: {asset_type}")
    return _TYPE_MAP[asset_type]


def add_local_asset(name: str, asset_type: str, filename: str, data: bytes) -> dict:
    name = (name or "").strip()
    if not NAME_RE.match(name):
        raise AssetError(422, "Имя ассета: только латиница, цифры, пробел, _ и -")
    kind, allowed_ext = _resolve_type(asset_type)
    ext = os.path.splitext(filename or "")[1].lower()
    if not ext:
        raise AssetError(422, "У файла нет расширения")
    if allowed_ext is not None and ext not in allowed_ext:
        raise AssetError(422, f"Расширение {ext} не подходит для типа «{asset_type}»")
    if AssetDatabase.asset_exists(name):
        raise AssetError(409, f"Ассет «{name}» уже существует")

    os.makedirs(PUBLIC_DIR, exist_ok=True)
    # basename защищает от path traversal в filename
    dest = os.path.join(PUBLIC_DIR, f"{name}{ext}")
    with open(dest, "wb") as f:
        f.write(data)
    AssetDatabase.add_local_asset(name, kind, dest)
    return {"name": name, "type": kind.value, "source": "local", "link": dest, "duration": None}


def add_remote_asset(name: str, asset_type: str, url: str) -> dict:
    name = (name or "").strip()
    if not NAME_RE.match(name):
        raise AssetError(422, "Имя ассета: только латиница, цифры, пробел, _ и -")
    kind, _ = _resolve_type(asset_type)
    if AssetDatabase.asset_exists(name):
        raise AssetError(409, f"Ассет «{name}» уже существует")
    AssetDatabase.add_remote_asset(name, kind, url)
    source = "youtube" if "youtube" in url else "internet"
    return {"name": name, "type": kind.value, "source": source, "link": url, "duration": None}


def delete_asset(name: str) -> None:
    if not AssetDatabase.asset_exists(name):
        raise AssetError(404, f"Ассет «{name}» не найден")
    AssetDatabase.remove_asset(name)
