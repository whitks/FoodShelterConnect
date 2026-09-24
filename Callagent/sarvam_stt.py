"""Client for the Sarvam realtime speech-to-text WebSocket.

Wire protocol (verified against the live API, Sep 2026):
  URL:      wss://api.sarvam.ai/speech-to-text-realtime/ws
            ?language_code=auto&model=saaras:v3-realtime&encoding=mulaw
            &sample_rate=8000&endpointing=vad&stream_type=fast
  Header:   api-subscription-key: <key>
  Client -> {"event": "audio_input", "audio": "<base64 8kHz mu-law>"}
  Server -> {"event": "session.begin", ...}
            {"event": "vad.speech_start", "utterance_idx": n, ...}
            {"event": "transcript.partial", "utterance_idx": n, "text": "...", "language": "..."}
            {"event": "transcript.final",  "utterance_idx": n, "text": "...", "language": "..."}
            {"event": "vad.speech_end", "utterance_idx": n, ...}
            {"event": "error", ...}

Because Twilio sends 8 kHz mu-law, the base64 payload is forwarded to Sarvam
verbatim — no decoding or resampling needed.
"""
import json
import logging
from urllib.parse import urlencode

import websockets

from .audio_utils import MULAW_SAMPLE_RATE
from .config import settings

logger = logging.getLogger(__name__)


class SarvamSTTError(Exception):
    pass


class SarvamStreamingSTT:
    def __init__(self, api_key: str | None = None):
        self._api_key = api_key or settings.SARVAM_API_KEY
        self._ws = None
        self._connected = False

    @property
    def connected(self) -> bool:
        return self._connected

    def build_url(self) -> str:
        query = urlencode(
            {
                "language_code": settings.SARVAM_STT_LANGUAGE,
                "model": settings.SARVAM_STT_MODEL,
                "encoding": "mulaw",
                "sample_rate": MULAW_SAMPLE_RATE,
                "endpointing": "vad",
                "stream_type": "fast",
            }
        )
        return f"{settings.SARVAM_STT_WS_URL}?{query}"

    async def connect(self):
        if self._connected and self._ws is not None:
            return
        try:
            self._ws = await websockets.connect(
                self.build_url(),
                additional_headers={"api-subscription-key": self._api_key},
                open_timeout=15,
                close_timeout=5,
                max_size=2**23,
            )
            self._connected = True
            logger.info("Sarvam STT connected")
        except Exception as e:
            self._connected = False
            self._ws = None
            raise SarvamSTTError(f"STT connect failed: {e}") from e

    async def send_audio(self, payload_b64: str):
        """Forward a Twilio media payload (base64 mu-law) to Sarvam."""
        if not self._connected or self._ws is None:
            return
        await self._ws.send(
            json.dumps({"event": "audio_input", "audio": payload_b64})
        )

    async def next_event(self) -> dict:
        """Receive the next JSON event from Sarvam (blocking until one arrives)."""
        raw = await self._ws.recv()
        return json.loads(raw)

    async def close(self):
        self._connected = False
        ws, self._ws = self._ws, None
        if ws is not None:
            try:
                await ws.close()
            except Exception:
                pass