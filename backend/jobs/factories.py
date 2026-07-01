"""Фабрики движков: собирают VoiceModule и Content-движок из запроса.

Импорты движков ленивые — тяжёлые зависимости (torch/whisper/moviepy)
грузятся только при старте рендера в воркере, а не при импорте приложения.
Каждая фабрика возвращает zero-arg callable для JobManager.submit.
"""
from __future__ import annotations

from typing import Callable, List, Tuple

from backend.schemas import (ShortsRequest, TranslationRequest, VideoRequest,
                             VoiceSpec)


def _build_voice_module(voice: VoiceSpec, language):
    """VoiceModule под указанный язык (для перевода — язык целевой)."""
    from shortGPT.config.api_db import ApiKeyManager
    from shortGPT.config.languages import EDGE_TTS_VOICENAME_MAPPING

    if voice.engine == "elevenlabs":
        key = ApiKeyManager.get_api_key("ELEVENLABS_API_KEY")
        if not key:
            raise ValueError("Отсутствует ключ ElevenLabs API")
        if not voice.voice_name:
            raise ValueError("Не указан голос ElevenLabs (voice_name)")
        from shortGPT.audio.eleven_voice_module import ElevenLabsVoiceModule
        return ElevenLabsVoiceModule(key, voice.voice_name, checkElevenCredits=False)

    # edge
    from shortGPT.audio.edge_voice_module import EdgeTTSVoiceModule
    gender = voice.gender or "male"
    mapping = EDGE_TTS_VOICENAME_MAPPING.get(language)
    if not mapping:
        raise ValueError(f"Для языка {language.value} нет голоса EdgeTTS")
    voice_name = voice.voice_name or mapping.get(gender) or mapping.get("male")
    return EdgeTTSVoiceModule(voice_name)


def _language(value: str):
    from shortGPT.config.languages import Language
    return Language(value)


# --- Shorts ----------------------------------------------------------------

def build_short_factory(req: ShortsRequest) -> Callable[[], object]:
    def factory():
        lang = _language(req.voice.language)
        voice_module = _build_voice_module(req.voice, lang)
        watermark = req.watermark or None
        if req.short_type == "reddit":
            from shortGPT.engine.reddit_short_engine import RedditShortEngine
            return RedditShortEngine(
                voice_module,
                background_video_name=req.background_video,
                background_music_name=req.background_music,
                num_images=req.num_images,
                watermark=watermark,
                language=lang,
            )
        from shortGPT.engine.facts_short_engine import FactsShortEngine
        return FactsShortEngine(
            voice_module,
            facts_type=req.facts_subject,
            background_video_name=req.background_video,
            background_music_name=req.background_music,
            num_images=req.num_images,
            watermark=watermark,
            language=lang,
        )
    return factory


# --- Video (из стоков) -----------------------------------------------------

def build_video_factory(req: VideoRequest) -> Callable[[], object]:
    def factory():
        lang = _language(req.voice.language)
        voice_module = _build_voice_module(req.voice, lang)
        from shortGPT.engine.content_video_engine import ContentVideoEngine
        return ContentVideoEngine(
            voiceModule=voice_module,
            script=req.script,
            isVerticalFormat=req.vertical,
            language=lang,
        )
    return factory


# --- Translation -----------------------------------------------------------

def build_translation_factory(req: TranslationRequest, target_language: str) -> Callable[[], object]:
    def factory():
        target_lang = _language(target_language)
        # Голос собирается под целевой язык (EdgeTTS-голос соответствует переводу).
        voice_module = _build_voice_module(req.voice, target_lang)
        from shortGPT.engine.multi_language_translation_engine import MultiLanguageTranslationEngine
        return MultiLanguageTranslationEngine(
            voiceModule=voice_module,
            src_url=req.src_url,
            target_language=target_lang,
            use_captions=req.use_captions,
        )
    return factory


def translation_items(req: TranslationRequest) -> List[Tuple[Callable[[], object], dict]]:
    """По job'у на целевой язык (общий group_id формирует submit_group)."""
    items = []
    for lang in req.target_languages:
        request_dump = req.model_dump()
        request_dump["target_language"] = lang
        items.append((build_translation_factory(req, lang), request_dump))
    return items
