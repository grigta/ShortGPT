"""Job-менеджер: FIFO-очередь рендеров (1 воркер), мягкая отмена, SSE-нотификации.

Фабрика (не готовый engine) исполняется в воркере: конструктор движка может
создать записи в ContentDatabase и бросить исключение (напр. ElevenLabs без
кредитов) — это станет failed-job, а не 500 на POST.
"""
from __future__ import annotations

import asyncio
import threading
import time
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional

# Статусы job'а
QUEUED = "queued"
RUNNING = "running"
DONE = "done"
FAILED = "failed"
CANCELLED = "cancelled"

# Тип события SSE по статусу
_EVENT_BY_STATUS = {
    QUEUED: "progress",
    RUNNING: "progress",
    DONE: "done",
    FAILED: "error",
    CANCELLED: "cancelled",
}

LOG_TAIL = 20         # сколько последних строк лога слать в событии
MAX_LOG_LINES = 2000  # ограничение хранимого лога на job


# Фабрика движка: zero-arg callable, возвращающий объект с интерфейсом
# get_total_steps()/set_logger(cb)/makeContent()/get_video_output_path().
EngineFactory = Callable[[], object]


@dataclass
class Job:
    id: str
    kind: str
    group_id: str
    request: dict
    status: str = QUEUED
    step: int = 0
    total_steps: int = 0
    step_label: str = ""
    log: List[str] = field(default_factory=list)
    result_path: Optional[str] = None
    error: Optional[str] = None
    cancel_requested: bool = False
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    finished_at: Optional[float] = None
    cancel_event: threading.Event = field(default_factory=threading.Event)


class JobManager:
    def __init__(self, max_workers: int = 1):
        self.jobs: Dict[str, Job] = {}
        self._factories: Dict[str, EngineFactory] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._subscribers: set[asyncio.Queue] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._event_id = 0

    # --- инфраструктура событий -------------------------------------------

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    def _next_event_id(self) -> int:
        self._event_id += 1
        return self._event_id

    def serialize_event(self, job: Job) -> dict:
        from backend.routers.videos import video_url
        return {
            "job_id": job.id,
            "group_id": job.group_id,
            "kind": job.kind,
            "status": job.status,
            "step": job.step,
            "total_steps": job.total_steps,
            "step_label": job.step_label,
            "log_tail": job.log[-LOG_TAIL:],
            "log_len": len(job.log),
            "result_path": job.result_path,
            "video_url": video_url(job.result_path) if job.result_path else None,
            "error": job.error,
        }

    def _notify(self, job: Job) -> None:
        """Разослать событие всем подписчикам SSE (потокобезопасно)."""
        event = _EVENT_BY_STATUS.get(job.status, "progress")
        payload = self.serialize_event(job)
        envelope = {"event": event, "id": self._next_event_id(), "data": payload}
        loop = self._loop
        if loop is None:
            return
        for q in list(self._subscribers):
            try:
                loop.call_soon_threadsafe(q.put_nowait, envelope)
            except RuntimeError:
                pass

    def snapshot_events(self) -> List[dict]:
        """События-снапшоты незавершённых job'ов (для только что подключившегося клиента)."""
        out = []
        with self._lock:
            unfinished = [j for j in self.jobs.values()
                          if j.status in (QUEUED, RUNNING)]
        for job in unfinished:
            payload = self.serialize_event(job)
            out.append({"event": "progress", "id": self._next_event_id(), "data": payload})
        return out

    # --- чтение ------------------------------------------------------------

    def get(self, job_id: str) -> Optional[Job]:
        return self.jobs.get(job_id)

    def list(self, status=None, kind=None, group_id=None, limit=None) -> List[Job]:
        with self._lock:
            jobs = list(self.jobs.values())
        if status:
            jobs = [j for j in jobs if j.status == status]
        if kind:
            jobs = [j for j in jobs if j.kind == kind]
        if group_id:
            jobs = [j for j in jobs if j.group_id == group_id]
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        if limit:
            jobs = jobs[:limit]
        return jobs

    def count_running(self) -> int:
        with self._lock:
            return sum(1 for j in self.jobs.values() if j.status == RUNNING)

    # --- постановка --------------------------------------------------------

    def submit(self, kind: str, factory: EngineFactory, request: dict,
               group_id: Optional[str] = None) -> Job:
        job = Job(id=uuid.uuid4().hex, kind=kind,
                  group_id=group_id or uuid.uuid4().hex, request=request)
        with self._lock:
            self.jobs[job.id] = job
            self._factories[job.id] = factory
        self._notify(job)  # queued
        self._executor.submit(self._run, job.id)
        return job

    def submit_group(self, kind: str, items: List[tuple]) -> tuple[str, List[Job]]:
        """items: список (factory, request). Возвращает (group_id, [Job])."""
        group_id = uuid.uuid4().hex
        jobs = [self.submit(kind, factory, request, group_id=group_id)
                for factory, request in items]
        return group_id, jobs

    # --- отмена ------------------------------------------------------------

    def cancel(self, job_id: str) -> Optional[Job]:
        job = self.jobs.get(job_id)
        if not job:
            return None
        with self._lock:
            if job.status == QUEUED:
                job.cancel_event.set()
                job.status = CANCELLED
                job.finished_at = time.time()
                changed = True
            elif job.status == RUNNING:
                job.cancel_event.set()
                job.cancel_requested = True
                changed = True
            else:
                changed = False
        if changed:
            self._notify(job)
        return job

    # --- воркер ------------------------------------------------------------

    def _log(self, job: Job, message: str) -> None:
        if message is None:
            return
        job.log.append(str(message))
        if len(job.log) > MAX_LOG_LINES:
            del job.log[:len(job.log) - MAX_LOG_LINES]

    def _run(self, job_id: str) -> None:
        job = self.jobs[job_id]
        factory = self._factories.get(job_id)

        # Мог быть отменён, пока стоял в очереди.
        if job.cancel_event.is_set():
            with self._lock:
                if job.status != CANCELLED:
                    job.status = CANCELLED
                    job.finished_at = time.time()
            self._notify(job)
            return

        job.status = RUNNING
        job.started_at = time.time()
        self._log(job, "Инициализация движка…")
        self._notify(job)

        try:
            engine = factory()  # конструктор может бросить -> failed
            job.total_steps = engine.get_total_steps()
            engine.set_logger(lambda msg: (self._log(job, msg), self._notify(job)))

            for step, info in engine.makeContent():
                if job.cancel_event.is_set():
                    job.status = CANCELLED
                    job.finished_at = time.time()
                    self._log(job, "Отменено пользователем.")
                    self._notify(job)
                    return
                job.step = step
                job.step_label = info
                self._log(job, info)
                self._notify(job)

            job.result_path = engine.get_video_output_path()
            job.status = DONE
            job.finished_at = time.time()
            self._log(job, f"Готово: {job.result_path}")
            self._notify(job)

        except BaseException as e:  # noqa: BLE001 — Fail Loud: полный трейс в лог
            tb = traceback.format_exc()
            self._log(job, tb)
            job.error = f"{type(e).__name__}: {e}"
            job.status = FAILED
            job.finished_at = time.time()
            self._notify(job)
        finally:
            with self._lock:
                self._factories.pop(job_id, None)
