"""Роуты сценария для video-wizard: генерация и правка через OpenRouter."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.schemas import ScriptCorrectRequest, ScriptOut, ScriptRequest
from shortGPT.config.api_db import ApiKeyManager

router = APIRouter(prefix="/script")


def _require_openrouter():
    if not ApiKeyManager.get_api_key("OPENROUTER_API_KEY"):
        raise HTTPException(status_code=422, detail="Отсутствует ключ OpenRouter API")


@router.post("", response_model=ScriptOut)
def generate_script(body: ScriptRequest):
    _require_openrouter()
    from shortGPT.gpt.gpt_chat_video import generateScript
    try:
        script = generateScript(body.description, body.language)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка генерации сценария: {e}")
    return {"script": script}


@router.post("/correct", response_model=ScriptOut)
def correct_script(body: ScriptCorrectRequest):
    _require_openrouter()
    from shortGPT.gpt.gpt_chat_video import correctScript
    try:
        script = correctScript(body.script, body.correction)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка правки сценария: {e}")
    return {"script": script}
