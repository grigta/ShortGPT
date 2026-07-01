"""Роуты job'ов: постановка рендеров (shorts/videos/translations), листинг,
детали, отмена и глобальный SSE-стрим прогресса."""
from __future__ import annotations

import asyncio
import json
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from sse_starlette.sse import EventSourceResponse

from backend.jobs import factories
from backend.jobs.manager import JobManager
from backend.routers.videos import video_url
from backend.schemas import (JobDetail, JobGroupOut, JobOut, ShortsRequest,
                             TranslationRequest, VideoRequest, VoiceSpec)
from shortGPT.config.api_db import ApiKeyManager

router = APIRouter(prefix="/jobs")


def _manager(request: Request) -> JobManager:
    return request.app.state.job_manager


def _job_out(job) -> dict:
    return {
        "id": job.id,
        "kind": job.kind,
        "status": job.status,
        "step": job.step,
        "total_steps": job.total_steps,
        "step_label": job.step_label,
        "result_path": job.result_path,
        "video_url": video_url(job.result_path) if job.result_path else None,
        "error": job.error,
        "group_id": job.group_id,
        "cancel_requested": job.cancel_requested,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "request": job.request,
    }


def _validate_keys(voice: VoiceSpec) -> None:
    """Синхронная предвалидация обязательных ключей -> 422 на POST."""
    if not ApiKeyManager.get_api_key("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=422, detail="Отсутствует ключ OpenRouter API")
    if voice.engine == "elevenlabs" and not ApiKeyManager.get_api_key("ELEVENLABS_API_KEY"):
        raise HTTPException(status_code=422, detail="Отсутствует ключ ElevenLabs API")


# --- постановка --------------------------------------------------------------

@router.post("/shorts", status_code=202, response_model=JobGroupOut)
def create_shorts(body: ShortsRequest, request: Request):
    _validate_keys(body.voice)
    if body.num_images and body.image_source == "generate":
        from shortGPT.gpt import openrouter
        if not openrouter.get_selected_image_model():
            raise HTTPException(
                status_code=422,
                detail="Для генерации картинок выберите модель изображений в Настройках "
                       "или переключите источник на «Поиск в интернете»")
    manager = _manager(request)
    items = []
    for _ in range(body.num_shorts):
        items.append((factories.build_short_factory(body), body.model_dump()))
    group_id, jobs = manager.submit_group("short", items)
    return {"group_id": group_id, "jobs": [_job_out(j) for j in jobs]}


@router.post("/videos", status_code=202, response_model=JobGroupOut)
def create_video(body: VideoRequest, request: Request):
    _validate_keys(body.voice)
    manager = _manager(request)
    group_id, jobs = manager.submit_group(
        "video", [(factories.build_video_factory(body), body.model_dump())])
    return {"group_id": group_id, "jobs": [_job_out(j) for j in jobs]}


@router.post("/translations", status_code=202, response_model=JobGroupOut)
def create_translations(body: TranslationRequest, request: Request):
    _validate_keys(body.voice)
    manager = _manager(request)
    group_id, jobs = manager.submit_group("translation", factories.translation_items(body))
    return {"group_id": group_id, "jobs": [_job_out(j) for j in jobs]}


@router.post("/_stub", status_code=202, response_model=JobGroupOut, include_in_schema=False)
def create_stub(request: Request, count: int = Query(1, ge=1, le=5),
                steps: int = Query(12, ge=1, le=30), sleep: float = Query(1.0, ge=0, le=10)):
    """Dev-only: фейковый рендер для проверки сцены прогресса без трат на API.
    Активен только при SHORTGPT_DEV_STUB=1."""
    if os.environ.get("SHORTGPT_DEV_STUB") != "1":
        raise HTTPException(status_code=404, detail="Not Found")
    from backend.jobs._stub_engine import build_stub_factory
    manager = _manager(request)
    items = [(build_stub_factory(total_steps=steps, sleep=sleep), {"stub": True})
             for _ in range(count)]
    group_id, jobs = manager.submit_group("video", items)
    return {"group_id": group_id, "jobs": [_job_out(j) for j in jobs]}


# --- чтение / отмена ---------------------------------------------------------

@router.get("", response_model=list[JobOut])
def list_jobs(request: Request,
              status: Optional[str] = None,
              kind: Optional[str] = None,
              group_id: Optional[str] = None,
              limit: Optional[int] = Query(None, ge=1)):
    jobs = _manager(request).list(status=status, kind=kind, group_id=group_id, limit=limit)
    return [_job_out(j) for j in jobs]


@router.get("/events")
async def jobs_events(request: Request):
    """Глобальный SSE-стрим. При подключении — снапшоты незавершённых job'ов."""
    manager = _manager(request)

    async def generator():
        q = manager.subscribe()
        try:
            for env in manager.snapshot_events():
                yield {"event": env["event"], "id": str(env["id"]),
                       "data": json.dumps(env["data"], ensure_ascii=False)}
            while True:
                if await request.is_disconnected():
                    break
                try:
                    env = await asyncio.wait_for(q.get(), timeout=15)
                except asyncio.TimeoutError:
                    continue  # позволяем sse-starlette слать ping
                yield {"event": env["event"], "id": str(env["id"]),
                       "data": json.dumps(env["data"], ensure_ascii=False)}
        finally:
            manager.unsubscribe(q)

    return EventSourceResponse(generator())


@router.get("/{job_id}", response_model=JobDetail)
def get_job(job_id: str, request: Request):
    job = _manager(request).get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job не найден")
    out = _job_out(job)
    out["log"] = job.log
    return out


@router.post("/{job_id}/cancel", response_model=JobOut)
def cancel_job(job_id: str, request: Request):
    job = _manager(request).cancel(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job не найден")
    return _job_out(job)
