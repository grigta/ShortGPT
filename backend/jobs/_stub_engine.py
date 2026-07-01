"""Заглушка движка для верификации job-менеджера БЕЗ реального рендера.

Повторяет интерфейс Content-движка: get_total_steps / set_logger / makeContent /
get_video_output_path. Не импортируется приложением — используется только из
тестовых скриптов (фабрика подменяется вручную).
"""
from __future__ import annotations

import os
import tempfile
import time


class StubEngine:
    def __init__(self, total_steps: int = 5, sleep: float = 0.3, video_path: str | None = None):
        self._total = total_steps
        self._sleep = sleep
        self._logger = lambda _: None
        self._video_path = video_path

    def get_total_steps(self) -> int:
        return self._total

    def set_logger(self, logger) -> None:
        self._logger = logger

    def makeContent(self):
        # Семантика как у AbstractContentEngine: сначала yield метки шага,
        # затем «работа» шага выполняется при следующем next() (тут — sleep).
        for i in range(1, self._total + 1):
            yield i, f"Current step ({i} / {self._total}) : stub_step_{i}"
            self._logger(f"stub log line {i}")
            time.sleep(self._sleep)

    def get_video_output_path(self) -> str:
        if self._video_path and os.path.isfile(self._video_path):
            return self._video_path
        # Существующий mp4 из videos/ либо временный файл-заглушка.
        if os.path.isdir("videos"):
            for name in os.listdir("videos"):
                if name.lower().endswith(".mp4"):
                    return os.path.join("videos", name)
        fd, path = tempfile.mkstemp(suffix=".mp4", prefix="stub_")
        os.close(fd)
        return path


def build_stub_factory(total_steps: int = 5, sleep: float = 0.3, video_path: str | None = None):
    return lambda: StubEngine(total_steps=total_steps, sleep=sleep, video_path=video_path)
