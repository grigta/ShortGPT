"""Точка сборки FastAPI-приложения ShortGPT.

Один процесс: /api/* — REST + SSE, остальное — собранный фронт web/dist (SPA).
"""
from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.jobs.manager import JobManager
from backend.routers import (assets, health, jobs, models, script, settings,
                            videos, voices)

ROOT = os.path.dirname(os.path.dirname(__file__))
WEB_DIST = os.path.join(ROOT, "web", "dist")
PUBLIC_DIR = os.path.join(ROOT, "public")


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager: JobManager = app.state.job_manager
    manager.attach_loop(asyncio.get_running_loop())
    yield


def _install_exception_handlers(app: FastAPI) -> None:
    """Единый формат ошибок: {"detail": str}."""

    @app.exception_handler(StarletteHTTPException)
    async def _http_exc(request: Request, exc: StarletteHTTPException):
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return JSONResponse(status_code=exc.status_code, content={"detail": detail})

    @app.exception_handler(RequestValidationError)
    async def _validation_exc(request: Request, exc: RequestValidationError):
        parts = []
        for err in exc.errors():
            loc = ".".join(str(x) for x in err.get("loc", []) if x != "body")
            msg = err.get("msg", "invalid")
            parts.append(f"{loc}: {msg}" if loc else msg)
        return JSONResponse(status_code=422, content={"detail": "; ".join(parts) or "Ошибка валидации"})

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        return JSONResponse(status_code=500, content={"detail": str(exc) or exc.__class__.__name__})


class SPAStaticFiles(StaticFiles):
    """StaticFiles с SPA-fallback: неизвестные не-/api пути отдают index.html."""

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code == 404 and not path.startswith("api"):
                index = os.path.join(self.directory, "index.html")
                if os.path.isfile(index):
                    return FileResponse(index)
            raise


def create_app() -> FastAPI:
    app = FastAPI(title="ShortGPT API", lifespan=lifespan)
    app.state.job_manager = JobManager(max_workers=1)

    _install_exception_handlers(app)

    for r in (health.router, voices.router, settings.router, models.router,
              assets.router, videos.router, script.router, jobs.router):
        app.include_router(r, prefix="/api")

    # Раздача локальных ассетов из public/ (превью на фронте; StaticFiles поддерживает Range).
    if os.path.isdir(PUBLIC_DIR):
        app.mount("/api/files/public", StaticFiles(directory=PUBLIC_DIR), name="public-files")

    # Фронт монтируется, только если собран (web/dist ещё может не существовать).
    if os.path.isdir(WEB_DIST):
        app.mount("/", SPAStaticFiles(directory=WEB_DIST, html=True), name="spa")

    return app


app = create_app()
