"""Pydantic-схемы запросов и ответов бэкенда ShortGPT."""
from __future__ import annotations

import re
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

NAME_RE = re.compile(r"^[A-Za-z0-9 _-]+$")
# Синхронизировано с фронтом: латиница, кириллица, цифры, пробел, - и _.
WATERMARK_RE = re.compile(r"^[A-Za-z0-9а-яА-ЯёЁ _-]+$")


# --- Голос -----------------------------------------------------------------

class VoiceSpec(BaseModel):
    engine: Literal["edge", "elevenlabs"]
    language: str
    gender: Optional[Literal["male", "female"]] = None
    voice_name: Optional[str] = None

    @model_validator(mode="after")
    def _check_eleven(self):
        if self.engine == "elevenlabs" and not self.voice_name:
            raise ValueError("Для ElevenLabs нужно указать voice_name")
        return self


# --- Jobs ------------------------------------------------------------------

class ShortsRequest(BaseModel):
    short_type: Literal["reddit", "facts"]
    facts_subject: Optional[str] = None
    num_shorts: int = Field(1, ge=1, le=10)
    # Для facts фон опционален: без него ролик = канвас + картинки + субтитры.
    background_video: str = ""
    background_music: str = ""
    num_images: Optional[int] = None
    image_source: Literal["generate", "search"] = "generate"
    watermark: Optional[str] = None
    language: Optional[str] = None  # берётся из voice.language, оставлено для совместимости
    voice: VoiceSpec

    @model_validator(mode="after")
    def _check_facts(self):
        if self.short_type == "facts" and not (self.facts_subject and self.facts_subject.strip()):
            raise ValueError("Для роликов с фактами укажите facts_subject")
        if self.short_type == "reddit":
            if not self.background_video or not self.background_music:
                raise ValueError("Для Reddit-роликов нужны фоновое видео и музыка")
        elif not self.background_video and not self.num_images:
            raise ValueError("Без фонового видео нужны AI-изображения (num_images)")
        return self

    @field_validator("watermark")
    @classmethod
    def _check_watermark(cls, v):
        if v is None or v == "":
            return v
        if not WATERMARK_RE.match(v):
            raise ValueError("Водяной знак: только буквы, цифры и пробелы")
        if not (3 <= len(v) <= 25):
            raise ValueError("Водяной знак: от 3 до 25 символов")
        return v


class VideoRequest(BaseModel):
    script: str = Field(..., min_length=1)
    vertical: bool = False
    language: Optional[str] = None
    voice: VoiceSpec


class TranslationRequest(BaseModel):
    src_url: str = Field(..., min_length=1)
    target_languages: List[str] = Field(..., min_length=1)
    use_captions: bool = False
    voice: VoiceSpec


class JobOut(BaseModel):
    id: str
    kind: str
    status: str
    step: int
    total_steps: int
    step_label: str
    result_path: Optional[str] = None
    video_url: Optional[str] = None
    error: Optional[str] = None
    group_id: str
    cancel_requested: bool = False
    created_at: Optional[float] = None
    started_at: Optional[float] = None
    finished_at: Optional[float] = None
    request: Optional[dict] = None


class JobDetail(JobOut):
    log: List[str] = []


class JobGroupOut(BaseModel):
    group_id: str
    jobs: List[JobOut]


# --- Script ----------------------------------------------------------------

class ScriptRequest(BaseModel):
    description: str = Field(..., min_length=1)
    language: str = "English"


class ScriptCorrectRequest(BaseModel):
    script: str = Field(..., min_length=1)
    correction: str = Field(..., min_length=1)


class ScriptOut(BaseModel):
    script: str


# --- Settings / models -----------------------------------------------------

class KeyOut(BaseModel):
    key: str
    label: str
    is_secret: bool
    is_set: bool
    masked_value: str


class KeyUpdate(BaseModel):
    value: str = ""


class ModelSelect(BaseModel):
    model_id: str
    target: Literal["text", "image"] = "text"


# --- Assets ----------------------------------------------------------------

class RemoteAssetRequest(BaseModel):
    name: str
    asset_type: str
    url: str = Field(..., min_length=1)

    @field_validator("name")
    @classmethod
    def _check_name(cls, v):
        if not NAME_RE.match(v or ""):
            raise ValueError("Имя ассета: только латиница, цифры, пробел, _ и -")
        return v
