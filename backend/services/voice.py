"""Голоса и языки: enum Language, EdgeTTS-каталог, ElevenLabs (graceful)."""
from __future__ import annotations

from typing import List

from shortGPT.config.languages import (EDGE_TTS_VOICENAME_MAPPING,
                                       ELEVEN_SUPPORTED_LANGUAGES, Language)


def list_languages() -> List[dict]:
    """Все языки enum. value — каноничный идентификатор (значение enum)."""
    return [{"name": lang.value, "value": lang.value} for lang in Language]


def list_edge_voices() -> List[dict]:
    """EdgeTTS: язык + мужской/женский голос."""
    out = []
    for lang, voices in EDGE_TTS_VOICENAME_MAPPING.items():
        out.append({
            "language": lang.value,
            "male": voices.get("male"),
            "female": voices.get("female"),
        })
    return out


def elevenlabs_voices() -> dict:
    """Голоса ElevenLabs. Без ключа/при ошибке — available=false (не 500),
    но с человекочитаемой причиной в detail — Fail Loud для UI."""
    import requests

    from shortGPT.config.api_db import ApiKeyManager

    languages = [{"name": lang.value, "value": lang.value}
                 for lang in ELEVEN_SUPPORTED_LANGUAGES]
    key = ApiKeyManager.get_api_key("ELEVENLABS_API_KEY")
    if not key:
        return {"available": False, "voices": [], "languages": languages,
                "detail": "Ключ не задан"}
    try:
        r = requests.get("https://api.elevenlabs.io/v1/voices",
                         headers={"accept": "application/json", "xi-api-key": key},
                         timeout=15)
        if r.status_code != 200:
            body = r.json()
            detail = body.get("detail")
            msg = detail.get("message") if isinstance(detail, dict) else str(detail)
            return {"available": False, "voices": [], "languages": languages,
                    "detail": f"ElevenLabs ответил {r.status_code}: {msg}"}
        voices = [v["name"] for v in r.json()["voices"]]
        return {"available": True, "voices": voices, "languages": languages}
    except Exception as e:
        return {"available": False, "voices": [], "languages": languages,
                "detail": f"{type(e).__name__}: {e}"}
