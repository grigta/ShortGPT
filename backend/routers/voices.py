"""Роуты голосов: языки, EdgeTTS-каталог, ElevenLabs (graceful degradation)."""
from __future__ import annotations

from fastapi import APIRouter

from backend.services import voice as voice_svc

router = APIRouter(prefix="/voices")


@router.get("/languages")
def languages():
    return voice_svc.list_languages()


@router.get("/edge")
def edge_voices():
    return voice_svc.list_edge_voices()


@router.get("/elevenlabs")
def elevenlabs_voices():
    return voice_svc.elevenlabs_voices()
