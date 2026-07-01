"""Роуты видео: листинг videos/, стриминг с Range, удаление. Path traversal заблокирован."""
from __future__ import annotations

import os
from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/videos")

VIDEOS_DIR = "videos"


def _safe_path(filename: str) -> str:
    """Вернуть абсолютный путь внутри videos/ или бросить 400/404. Блокирует path traversal."""
    if not filename or filename != os.path.basename(filename) or filename in (".", ".."):
        raise HTTPException(status_code=400, detail="Некорректное имя файла")
    base = os.path.abspath(VIDEOS_DIR)
    full = os.path.abspath(os.path.join(base, filename))
    if os.path.commonpath([base, full]) != base:
        raise HTTPException(status_code=400, detail="Некорректное имя файла")
    return full


def video_url(path_or_name: str) -> str:
    """Публичный URL для файла из videos/ по пути или имени."""
    name = os.path.basename(path_or_name)
    return f"/api/videos/{quote(name)}"


@router.get("")
def list_videos():
    out = []
    if os.path.isdir(VIDEOS_DIR):
        for name in os.listdir(VIDEOS_DIR):
            if not name.lower().endswith(".mp4"):
                continue
            full = os.path.join(VIDEOS_DIR, name)
            if not os.path.isfile(full):
                continue
            st = os.stat(full)
            out.append({
                "filename": name,
                "url": video_url(name),
                "size": st.st_size,
                "mtime": st.st_mtime,
            })
    out.sort(key=lambda v: v["mtime"], reverse=True)
    return out


@router.get("/{filename}")
def get_video(filename: str):
    full = _safe_path(filename)
    if not os.path.isfile(full):
        raise HTTPException(status_code=404, detail="Видео не найдено")
    # FileResponse (starlette) поддерживает HTTP Range — перемотка в <video>.
    return FileResponse(full, media_type="video/mp4", filename=filename)


@router.delete("/{filename}", status_code=204)
def delete_video(filename: str):
    full = _safe_path(filename)
    if not os.path.isfile(full):
        raise HTTPException(status_code=404, detail="Видео не найдено")
    os.remove(full)
    sidecar = os.path.splitext(full)[0] + ".txt"
    if os.path.isfile(sidecar):
        os.remove(sidecar)
    return None
