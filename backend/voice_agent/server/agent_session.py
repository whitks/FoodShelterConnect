import asyncio
import os
import time

from pathlib import Path

from dotenv import load_dotenv

# FoodShelter root .env (has SARVAM_API_KEY, GROQ_API_KEY).
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(_PROJECT_ROOT / ".env", override=True)

from pipecat.frames.frames import (
    Frame,
    InputAudioRawFrame,
    InterruptionFrame,
    LLMContextFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    OutputAudioRawFrame,
    StartFrame,
    TextFrame,
    TranscriptionFrame,
    TTSAudioRawFrame,
    TTSStoppedFrame,
    TTSSpeakFrame,
    UserStartedSpeakingFrame,
    UserStoppedSpeakingFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.groq.llm import GroqLLMService
from pipecat.services.groq.stt import GroqSTTService
from pipecat.services.sarvam.stt import SarvamSTTService
from pipecat.services.sarvam.tts import SarvamTTSService
from pipecat.transcriptions.language import Language
from pipecat.transports.base_input import BaseInputTransport
from pipecat.transports.base_output import BaseOutputTransport
from pipecat.transports.base_transport import TransportParams
from pipecat.workers.runner import WorkerRunner
from pipecat.audio.vad.silero import SileroVADAnalyzer

PROMPTS = {
    "donor": {
        "system": (
            "You are FoodBridge, a friendly voice assistant on the FoodShelter app built for "
            "Indian food donors. "
            "Help the donor post surplus food for pickup: ask for the food name, how much food "
            "they have (quantity or number of portions), and the pickup address. Keep answers "
            "very short — 2-3 sentences maximum, in simple Hindi (Hinglish). Be direct and "
            "concise. You will not answer any questions that are not related to food donation."
        ),
        "greeting": "नमस्ते! मैं फूडब्रिज हूँ। आज आप कौन सा खाना दान करना चाहेंगे?",
    },
    "shelter": {
        "system": (
            "You are FoodBridge, a friendly voice assistant on the FoodShelter app built for "
            "Indian shelters. "
            "Help shelter staff see incoming food donations and coordinate pickups/deliveries. "
            "Keep answers very short — 2-3 sentences maximum, in simple Hindi (Hinglish). Be "
            "direct and concise. You will not answer any questions that are not related to "
            "shelter food operations."
        ),
        "greeting": "नमस्ते! मैं फूडब्रिज हूँ। आपके शेल्टर के लिए क्या कर सकता हूँ?",
    },
}


class WebSocketInputTransport(BaseInputTransport):
    """Receives audio chunks from WebSocket and feeds into pipeline (same path as LocalAudioInputTransport)."""

    def __init__(self):
        params = TransportParams(
            audio_in_enabled=True,
            audio_in_sample_rate=16000,
            audio_in_channels=1,
            audio_in_passthrough=True,
        )
        super().__init__(params=params)
        self._pending_audio: list[InputAudioRawFrame] = []

    async def start(self, frame: StartFrame):
        await super().start(frame)
        await self.set_transport_ready(frame)
        pending = self._pending_audio
        self._pending_audio = []
        for f in pending:
            await self.push_audio_frame(f)

    async def push_audio(self, audio_bytes: bytes):
        frame = InputAudioRawFrame(
            audio=audio_bytes,
            sample_rate=16000,
            num_channels=1,
        )
        if hasattr(self, '_audio_in_queue') and self._audio_in_queue is not None:
            try:
                await self.push_audio_frame(frame)
            except AttributeError:
                self._pending_audio.append(frame)
        else:
            self._pending_audio.append(frame)


class WebSocketOutputTransport(BaseOutputTransport):
    """Sends TTS audio to browser callback (same pattern as LocalAudioOutputTransport)."""

    def __init__(self, on_tts_audio, on_interruption):
        params = TransportParams(
            audio_out_enabled=True,
            audio_out_sample_rate=24000,
            audio_out_channels=1,
        )
        super().__init__(params=params)
        self._on_tts_audio = on_tts_audio
        self._on_interruption = on_interruption

    async def start(self, frame: StartFrame):
        await super().start(frame)
        await self.set_transport_ready(frame)

    async def write_audio_frame(self, frame: OutputAudioRawFrame) -> bool:
        if self._on_tts_audio:
            try:
                await self._on_tts_audio(frame.audio)
            except Exception:
                pass
        return True

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, InterruptionFrame):
            if self._on_interruption:
                try:
                    await self._on_interruption()
                except Exception:
                    pass
        await super().process_frame(frame, direction)


class UserTextCapture(FrameProcessor):
    def __init__(self, on_stt=None):
        super().__init__()
        self.latest_user_text = ""
        self.latency_stt_done = 0.0
        self._on_stt = on_stt

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, TranscriptionFrame):
            text = frame.text.strip()
            if text:
                self.latency_stt_done = time.time()
                self.latest_user_text = text
                if self._on_stt:
                    await self._on_stt()
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)


class TranscriptionToLLM(FrameProcessor):
    def __init__(self, context: LLMContext, on_log=None, on_speech_segment=None):
        super().__init__()
        self._context = context
        self._echo_cooldown_until = 0.0
        self.latest_user_text = ""
        self.latency_stt_done = 0.0
        self._on_log = on_log
        self._on_speech_segment = on_speech_segment
        self._speech_start = 0.0

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, UserStartedSpeakingFrame):
            self._speech_start = time.time()
        elif isinstance(frame, UserStoppedSpeakingFrame):
            if self._speech_start > 0 and self._on_speech_segment:
                elapsed = time.time() - self._speech_start
                self._speech_start = 0.0
                await self._on_speech_segment(elapsed)
        if isinstance(frame, TranscriptionFrame):
            if time.time() < self._echo_cooldown_until:
                if self._on_log:
                    await self._on_log("[STT] Skipping echo (cooldown)")
                return
            text = frame.text.strip()
            if text:
                self.latency_stt_done = time.time()
                self.latest_user_text = text
                if self._on_log:
                    await self._on_log(f"[STT] Transcription received: \"{text}\"")
                self._context.add_message({"role": "user", "content": text})
                if self._on_log:
                    await self._on_log("[STT] Pushing LLMContextFrame to trigger LLM")
                await self.push_frame(LLMContextFrame(self._context))
            return
        elif isinstance(frame, LLMFullResponseEndFrame):
            self._echo_cooldown_until = time.time() + 1.5
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)


class UsageTracker(FrameProcessor):
    def __init__(self, user_text_ref, on_cost=None):
        super().__init__()
        self._user_text_ref = user_text_ref
        self._on_cost = on_cost
        self._turn_count = 0
        self._response_chars = 0

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, LLMFullResponseStartFrame):
            self._response_chars = 0
        elif isinstance(frame, TextFrame):
            self._response_chars += len(frame.text)
        elif isinstance(frame, LLMFullResponseEndFrame):
            self._turn_count += 1
            user_text = self._user_text_ref.latest_user_text if hasattr(self._user_text_ref, 'latest_user_text') else ""
            user_chars = len(user_text) if user_text else 0
            tts_chars = self._response_chars
            cost_tts = tts_chars * (30 / 10000)
            cost_total = round(cost_tts, 3)
            print(
                f"[USAGE] #{self._turn_count}: "
                f"user={user_chars}c tts={tts_chars}c ₹{cost_tts:.3f} total=₹{cost_total}",
                flush=True,
            )
            if self._on_cost:
                await self._on_cost(tts_chars)
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)


class LatencyTracker(FrameProcessor):
    def __init__(self, time_ref):
        super().__init__()
        self._time_ref = time_ref
        self._t_tts_first_audio = 0.0
        self._inside_response = False
        self._turn_count = 0

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, InterruptionFrame):
            self._inside_response = False
            self._t_tts_first_audio = 0.0
        if isinstance(frame, LLMFullResponseStartFrame):
            self._inside_response = True
            self._t_tts_first_audio = 0.0
        elif isinstance(frame, TTSAudioRawFrame):
            if self._t_tts_first_audio == 0.0 and self._inside_response:
                self._t_tts_first_audio = time.time()
                t0 = self._time_ref.latency_stt_done if hasattr(self._time_ref, 'latency_stt_done') else 0
                if t0:
                    self._turn_count += 1
                    delay = round((time.time() - t0) * 1000)
                    print(f"[LATENCY] #{self._turn_count}: {delay}ms", flush=True)
        elif isinstance(frame, TTSStoppedFrame):
            self._inside_response = False
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)


class AssistantContextUpdater(FrameProcessor):
    def __init__(self, context: LLMContext):
        super().__init__()
        self._context = context
        self._buffer = ""

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        if isinstance(frame, LLMFullResponseStartFrame):
            self._buffer = ""
        elif isinstance(frame, TextFrame):
            self._buffer += frame.text
        elif isinstance(frame, LLMFullResponseEndFrame):
            if self._buffer.strip():
                self._context.add_message({"role": "assistant", "content": self._buffer.strip()})
                self._buffer = ""
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)


class GreetingProcessor(FrameProcessor):
    def __init__(self, greeting_text: str):
        super().__init__()
        self._greeting = greeting_text

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, StartFrame):

            async def _delayed_greeting():
                await asyncio.sleep(1)
                await self.push_frame(TTSSpeakFrame(self._greeting))

            self.create_task(_delayed_greeting())
        await self.push_frame(frame, direction)


class AgentSession:
    def __init__(self, agent_type: str = "v1", mode: str = "donor"):
        self.agent_type = agent_type
        self.mode = mode if mode in ("donor", "shelter") else "donor"
        self._on_tts_callback = None
        self._on_interruption_callback = None
        self._on_log_callback = None
        self._on_cost_callback = None
        self._running = False
        self._worker = None
        self._runner = None
        self._ws_input = None
        self._stt_seconds = 0.0
        self._stt_utterances = 0
        self._tts_chars = 0

    def on_tts_audio(self, callback):
        self._on_tts_callback = callback

    def on_interruption(self, callback):
        self._on_interruption_callback = callback

    def on_log(self, callback):
        self._on_log_callback = callback

    def on_cost(self, callback):
        self._on_cost_callback = callback

    async def _log(self, msg: str):
        if self._on_log_callback:
            await self._on_log_callback(msg)

    async def _emit_cost(self):
        if not self._on_cost_callback:
            return
        if self.agent_type == "v1":
            stt_cost = round(self._stt_seconds * 0.008333, 3)
        else:
            billable_sec = self._stt_utterances * 10
            stt_cost = round(billable_sec * 0.0000111 * 95.16, 3)
        tts_cost = round(self._tts_chars * 0.003, 3)
        total = round(stt_cost + tts_cost, 3)
        await self._on_cost_callback(stt_cost, tts_cost, total)

    async def feed_audio(self, audio_bytes: bytes):
        if self._running and self._ws_input:
            await self._ws_input.push_audio(audio_bytes)

    async def start(self):
        self._running = True

        prompts = PROMPTS[self.mode]
        context = LLMContext()
        context.set_messages([{"role": "system", "content": prompts["system"]}])

        llm = GroqLLMService(
            api_key=os.environ["GROQ_API_KEY"],
            settings=GroqLLMService.Settings(
                model="llama-3.3-70b-versatile",
            ),
        )

        # Sarvam TTS (bulbul:v3, 24 kHz) — replaces the Inworld TTS used in the
        # original voiebot server, so only Sarvam + Groq keys are needed.
        tts = SarvamTTSService(
            api_key=os.environ["SARVAM_API_KEY"],
            settings=SarvamTTSService.Settings(
                model="bulbul:v3",
                voice="aditya",
                language=Language.HI_IN,
            ),
        )

        self._ws_input = WebSocketInputTransport()
        self._ws_output = WebSocketOutputTransport(
            on_tts_audio=self._on_tts_callback,
            on_interruption=self._on_interruption_callback,
        )

        if self.agent_type == "v3":
            stt = GroqSTTService(
                api_key=os.environ["GROQ_API_KEY"],
                settings=GroqSTTService.Settings(
                    model="whisper-large-v3-turbo",
                    language=Language.HI_IN,
                ),
            )

            async def _on_stt_utterance():
                self._stt_utterances += 1
                await self._emit_cost()

            user_text_capture = UserTextCapture(on_stt=_on_stt_utterance)

            async def _on_usage_cost(chars: int):
                self._tts_chars += chars
                await self._emit_cost()

            user_agg, assistant_agg = LLMContextAggregatorPair(
                context,
                user_params=LLMUserAggregatorParams(
                    vad_analyzer=SileroVADAnalyzer(),
                ),
            )

            pipeline = Pipeline([
                GreetingProcessor(prompts["greeting"]),
                self._ws_input,
                stt,
                user_text_capture,
                user_agg,
                llm,
                UsageTracker(user_text_capture, on_cost=_on_usage_cost),
                tts,
                LatencyTracker(user_text_capture),
                self._ws_output,
                assistant_agg,
            ])
        else:
            # v1: Sarvam streaming STT (Saaras v3) with server-side VAD.
            stt = SarvamSTTService(
                api_key=os.environ["SARVAM_API_KEY"],
                settings=SarvamSTTService.Settings(
                    language=Language.HI_IN,
                    vad_signals=True,
                ),
            )

            async def _on_speech_segment(sec: float):
                self._stt_seconds += sec
                await self._emit_cost()

            transcribe = TranscriptionToLLM(context, on_log=self._log, on_speech_segment=_on_speech_segment)

            async def _on_usage_cost(chars: int):
                self._tts_chars += chars
                await self._emit_cost()

            pipeline = Pipeline([
                GreetingProcessor(prompts["greeting"]),
                self._ws_input,
                stt,
                transcribe,
                llm,
                UsageTracker(transcribe, on_cost=_on_usage_cost),
                tts,
                LatencyTracker(transcribe),
                self._ws_output,
                AssistantContextUpdater(context),
            ])

        self._worker = PipelineWorker(
            pipeline,
            params=PipelineParams(
                audio_in_sample_rate=16000,
                audio_out_sample_rate=24000,
            ),
        )

        self._runner = WorkerRunner()
        await self._runner.add_workers(self._worker)

        if self._on_log_callback:
            await self._on_log_callback(f"[STARTED] Agent {self.agent_type} (WebSocket)")

        await self._runner.run()

    async def stop(self):
        self._running = False
        if self._runner:
            await self._runner.end(reason="user disconnected")