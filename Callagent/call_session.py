"""Per-call orchestration for the voice donation agent.

Data path
---------
Twilio Media Stream (8 kHz mu-law, base64)
  -> forwarded verbatim to Sarvam realtime STT (encoding=mulaw&sample_rate=8000)
  -> `transcript.final` adds a user message to history and triggers a Groq turn
  -> Groq deltas are split into sentences and queued for TTS
  -> Sarvam streaming TTS (output_audio_codec=mulaw) chunks are base64-encoded
     and sent straight to Twilio media events (zero conversion)

Barge-in
--------
`vad.speech_start` while the assistant is audible:
  - send {"event": "clear"} to Twilio (stops queued playback)
  - bump the generation counter (drops stale queued TTS + aborts LLM streaming)

Echo suppression
----------------
`transcript.final` events arriving within a short window right after our own
TTS has finished are presumed to be the assistant's echo and are ignored.
"""
import asyncio
import logging
import re
import time
from collections.abc import Awaitable, Callable
from typing import Any

from . import db, prompts
from .audio_utils import b64encode, make_clear_message, make_media_message
from .config import settings
from .groq_llm import GroqError, extract_donation_json, stream_chat
from .sarvam_stt import SarvamStreamingSTT, SarvamSTTError
from .sarvam_tts import SarvamStreamingTTS, SarvamTTSError

logger = logging.getLogger(__name__)

TwilioSend = Callable[[dict], Awaitable[None]]

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?।])\s+")
_STRIP_CHARS = " \t\r\n*_"

# Minimum user turns before we attempt donation extraction.
_MIN_TURNS_BEFORE_EXTRACT = 1


class CallSession:
    def __init__(self, twilio_send: TwilioSend, stream_sid: str, caller: str = ""):
        self._twilio_send = twilio_send
        self._stream_sid = stream_sid
        self._caller = (caller or "").strip()

        self._stt = SarvamStreamingSTT()
        self._tts = SarvamStreamingTTS()
        self._stt_task: asyncio.Task | None = None
        self._tts_task: asyncio.Task | None = None
        self._llm_task: asyncio.Task | None = None
        self._extract_task: asyncio.Task | None = None
        self._tts_queue: asyncio.Queue = asyncio.Queue()

        self._gen = 0          # generation: bump to invalidate in-flight work
        self._closed = False
        self._speaking = False
        self._user_speaking = False
        self._echo_window_until = 0.0
        self._history: list[dict] = []

        # donation saving state
        self._extracting = False
        self._draft_saved = False
        self._said_goodbye = False
        self._said_confirmation = False
        self._donor_id: Any = None
        self._last_fields: dict = {}

    # ------------------------------------------------------------------ lifecycle

    def _append_history(self, message: dict) -> None:
        """Append a message and keep the in-memory transcript bounded.

        MAX_HISTORY_MESSAGES limits what is sent to the LLM, but the list
        itself would otherwise grow for the whole call; keep both in sync.
        """
        self._history.append(message)
        max_len = settings.MAX_HISTORY_MESSAGES * 2
        if len(self._history) > max_len:
            self._history = self._history[-max_len:]

    async def start(self):
        """Connect STT, start receive + TTS workers, and speak the greeting."""
        try:
            await self._stt.connect()
        except SarvamSTTError as e:
            logger.error("STT connect failed for call: %s", e)
            return
        self._stt_task = asyncio.create_task(self._stt_receive_loop())
        self._tts_task = asyncio.create_task(self._tts_worker())
        self._gen += 1
        self._append_history({"role": "assistant", "content": prompts.GREETING})
        await self._enqueue_tts(prompts.GREETING)

    async def close(self):
        if self._closed:
            return
        self._closed = True
        for task in (
            self._extract_task,
            self._llm_task,
            self._stt_task,
            self._tts_task,
        ):
            if task and not task.done():
                task.cancel()
        try:
            await self._tts_queue.put((self._gen, None))  # stop TTS worker
        except Exception:
            pass
        await self._stt.close()
        await self._tts.aclose()

    async def handle_media(self, payload_b64: str):
        """Forward one Twilio media payload to Sarvam STT."""
        if not self._closed and self._stt.connected:
            try:
                await self._stt.send_audio(payload_b64)
            except Exception:
                logger.exception("Error forwarding media to STT")

    # ------------------------------------------------------------- STT receive
    async def _stt_receive_loop(self):
        while not self._closed:
            try:
                event = await self._stt.next_event()
            except Exception as e:
                if not self._closed:
                    logger.warning("STT receive ended: %s", e)
                break
            ev = event.get("event")
            if ev == "vad.speech_start":
                self._user_speaking = True
                if self._speaking:
                    await self._interrupt()
            elif ev == "vad.speech_end":
                self._user_speaking = False
            elif ev == "transcript.final":
                text = (event.get("text") or "").strip()
                if not text:
                    continue
                if time.time() < self._echo_window_until:
                    logger.info("Suppressed echo transcript: %r", text)
                    continue
                await self._on_user_turn(text)
            elif ev == "error":
                logger.error("Sarvam STT error event: %s", event.get("message") or event)
            # session.begin / transcript.partial / etc. are intentionally ignored

    async def _on_user_turn(self, text: str):
        self._gen += 1  # invalidate stale queued TTS from a previous turn
        self._append_history({"role": "user", "content": text})
        logger.info("[call %s] caller: %s", self._stream_sid, text)
        self._llm_task = asyncio.create_task(self._run_llm_turn(text))

    # ------------------------------------------------------------------ barge-in
    async def _interrupt(self):
        logger.info("[call %s] barge-in detected", self._stream_sid)
        self._gen += 1
        if self._llm_task and not self._llm_task.done():
            self._llm_task.cancel()
        while not self._tts_queue.empty():
            try:
                self._tts_queue.get_nowait()
            except asyncio.QueueEmpty:
                break
        self._speaking = False
        try:
            await self._twilio_send(make_clear_message(self._stream_sid))
        except Exception:
            logger.exception("Failed to send clear to Twilio")

    # -------------------------------------------------------------------- LLM
    async def _run_llm_turn(self, user_text: str):
        gen = self._gen
        self._speaking = True  # assistant is about to produce audible output
        messages = (
            [{"role": "system", "content": prompts.SYSTEM_PROMPT}]
            + self._history[-settings.MAX_HISTORY_MESSAGES:]
        )
        buffer = ""
        reply_parts: list[str] = []
        try:
            async for delta in stream_chat(messages):
                if self._closed or gen != self._gen:
                    return
                buffer += delta
                complete, buffer = self._drain_complete_sentences(buffer)
                for sentence in complete:
                    reply_parts.append(sentence)
                    await self._enqueue_tts(sentence)
            if buffer.strip(_STRIP_CHARS) and gen == self._gen and not self._closed:
                reply_parts.append(buffer.strip(_STRIP_CHARS))
                await self._enqueue_tts(buffer.strip(_STRIP_CHARS))
        except Exception as e:
            logger.warning("[call %s] LLM turn failed: %s", self._stream_sid, e)
            return
        finally:
            if gen == self._gen and not self._closed:
                reply = " ".join(p for p in reply_parts if p).strip()
                if reply:
                    self._append_history({"role": "assistant", "content": reply})
                    if not self._extracting:
                        if self._extract_task and not self._extract_task.done():
                            self._extract_task.cancel()
                        self._extract_task = asyncio.create_task(
                            self._maybe_extract_donation()
                        )
                else:
                    self._speaking = False

    def _drain_complete_sentences(self, buffer: str) -> tuple[list[str], str]:
        parts = _SENTENCE_SPLIT.split(buffer)
        complete, remaining = parts[:-1], parts[-1]
        return [p.strip(_STRIP_CHARS) for p in complete if p.strip(_STRIP_CHARS)], remaining

    # -------------------------------------------------------------------- TTS
    # 20 ms of 8 kHz mu-law audio = 160 bytes per Twilio media frame.
    _FRAME_BYTES = 160

    async def _enqueue_tts(self, text: str):
        text = text.strip(_STRIP_CHARS)
        if not text or self._closed:
            return
        await self._tts_queue.put((self._gen, text))

    async def _tts_worker(self):
        while not self._closed:
            gen, text = await self._tts_queue.get()
            if text is None:
                break
            if gen != self._gen or self._closed:
                continue
            try:
                async for chunk in self._tts.synthesize(text):
                    if self._closed or gen != self._gen:
                        break
                    await self._send_frames(chunk, gen)
            except SarvamTTSError as e:
                logger.warning("[call %s] TTS failed: %s", self._stream_sid, e)
            except Exception:
                # Don't let an unexpected send failure kill the worker for the
                # rest of the call (e.g. a dropped Twilio socket mid-stream).
                logger.exception("[call %s] TTS worker error", self._stream_sid)
            finally:
                # Keep echo suppression active briefly after playback stops.
                self._echo_window_until = time.time() + settings.ECHO_SUPPRESSION_SECONDS
                if self._tts_queue.empty():
                    self._speaking = False

    async def _send_frames(self, chunk: bytes, gen: int):
        """Split a TTS chunk into 20 ms frames and send each as a media event."""
        for i in range(0, len(chunk), self._FRAME_BYTES):
            if self._closed or gen != self._gen:
                return
            frame = chunk[i : i + self._FRAME_BYTES]
            await self._twilio_send(
                make_media_message(self._stream_sid, b64encode(frame))
            )

    # ------------------------------------------------------------ donation save
    async def _maybe_extract_donation(self):
        if (
            self._closed
            or self._extracting
            or self._draft_saved
            or self._said_goodbye
        ):
            return
        user_turns = sum(1 for m in self._history if m.get("role") == "user")
        if user_turns < _MIN_TURNS_BEFORE_EXTRACT:
            return
        self._extracting = True
        try:
            fields = await extract_donation_json(self._history[-12:])
        except GroqError as e:
            logger.warning("[call %s] extraction failed: %s", self._stream_sid, e)
            return
        finally:
            self._extracting = False

        self._last_fields = fields
        wants = bool(fields.get("wants_to_donate", True))
        complete = bool(fields.get("complete", False))

        if not wants:
            if not self._said_goodbye:
                self._said_goodbye = True
                self._gen += 1
                await self._enqueue_tts(prompts.GOODBYE)
            return

        has_core = bool((fields.get("food_name") or "").strip())
        if complete and has_core and not self._draft_saved:
            try:
                donor_id = await db.get_or_create_donor(
                    self._caller, fields.get("donor_name") or "Voice Donor"
                )
                await db.save_donation(donor_id, fields)
                self._draft_saved = True
                logger.info("[call %s] voice donation saved (%s)", self._stream_sid, fields.get("food_name"))
                if not self._said_confirmation:
                    self._said_confirmation = True
                    self._gen += 1
                    await self._enqueue_tts(prompts.CONFIRMATION)
            except Exception as e:
                logger.exception("[call %s] donation save failed: %s", self._stream_sid, e)