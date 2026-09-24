"""Client for the Sarvam HTTP streaming text-to-speech endpoint.

Wire protocol (verified against the live API, Sep 2026):
  POST https://api.sarvam.ai/text-to-speech/stream
  Header:   api-subscription-key: <key>
  Body:     {"text": ..., "model": "bulbul:v3", "speaker": "simran",
             "target_language_code": "hi-IN", "speech_sample_rate": 8000,
             "enable_preprocessing": true, "output_audio_codec": "mulaw"}
  Response: 200 with Content-Type: audio/mulaw, body is raw 8 kHz mu-law bytes.

The raw mu-law bytes can be base64-encoded and sent straight to Twilio with zero
conversion (Twilio expects 8 kHz mu-law).
"""
from collections.abc import AsyncIterator
import logging

import httpx

from .config import settings

logger = logging.getLogger(__name__)

# Sarvam bulbul:v3 caps text at 2500 characters per request.
MAX_TEXT_LENGTH = 2500


class SarvamTTSError(Exception):
    pass


class SarvamStreamingTTS:
    def __init__(self, api_key: str | None = None):
        self._api_key = api_key or settings.SARVAM_API_KEY
        self._client = httpx.AsyncClient(timeout=60.0)

    def _payload(self, text: str) -> dict:
        return {
            "text": text[:MAX_TEXT_LENGTH],
            "model": settings.SARVAM_TTS_MODEL,
            "speaker": settings.SARVAM_TTS_VOICE,
            "target_language_code": settings.SARVAM_TTS_LANGUAGE,
            "speech_sample_rate": 8000,
            "enable_preprocessing": True,
            "output_audio_codec": "mulaw",
            "pace": 1.0,
            "temperature": 0.6,
        }

    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        """Stream raw 8 kHz mu-law audio for `text`."""
        text = text.strip()
        if not text:
            return
        try:
            async with self._client.stream(
                "POST",
                settings.SARVAM_TTS_URL,
                json=self._payload(text),
                headers={"api-subscription-key": self._api_key},
            ) as resp:
                if resp.status_code != 200:
                    body = (await resp.aread())[:500]
                    raise SarvamTTSError(
                        f"TTS HTTP {resp.status_code}: {body.decode('utf-8', 'replace')}"
                    )
                async for chunk in resp.aiter_bytes():
                    if chunk:
                        yield chunk
        except httpx.HTTPError as e:
            raise SarvamTTSError(f"TTS request failed: {e}") from e

    async def aclose(self):
        await self._client.aclose()