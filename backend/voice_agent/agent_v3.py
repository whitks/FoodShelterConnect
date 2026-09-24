"""
FoodShelter voice donation agent — local microphone build.

Copied & adapted from voiebot/voice_agent/agent_v3.py for the FoodShelter
project. Pipeline (official Pipecat pattern):

    GreetingProcessor
    => transport.input()          (mic, 16 kHz mono)
    => SarvamSTTService           (Saaras v3, streaming + server-side VAD)
    => UserTextCapture            (latency tracking)
    => TranscriptionToLLM         (feeds transcripts into the LLM context)
    => GroqLLMService             (llama-3.3-70b-versatile)
    => UsageTracker               (per-turn cost estimates -> CSV)
    => SarvamTTSService           (Bulbul v3, 24 kHz mono)
    => LatencyTracker             (STT -> first TTS audio, -> CSV)
    => transport.output()         (speaker)
    => AssistantContextUpdater    (keeps the conversation history)

Run from the FoodShelter repo root:

    python backend/voice_agent/agent_v3.py

Requires SARVAM_API_KEY and GROQ_API_KEY in the root .env file.
"""

import asyncio
import os
import time

from pathlib import Path

from dotenv import load_dotenv

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_PROJECT_ROOT / ".env", override=True)

from pipecat.frames.frames import (
    Frame,
    InterruptionFrame,
    LLMContextFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
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
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.groq.llm import GroqLLMService
from pipecat.services.sarvam.stt import SarvamSTTService
from pipecat.services.sarvam.tts import SarvamTTSService
from pipecat.transcriptions.language import Language
from pipecat.transports.local.audio import LocalAudioTransport, LocalAudioTransportParams
from pipecat.workers.runner import WorkerRunner

SYSTEM_PROMPT = (
    "You are FoodBridge, a friendly voice assistant on the FoodShelter app built for "
    "Indian food donors and shelters. "
    "You help users donate surplus food to nearby shelters, ask for the food name, "
    "how much food they have (quantity or number of portions), and where it can be "
    "picked up from. "
    "Respond in simple Hindi (Hinglish) and keep replies short — 2-3 sentences maximum. "
    "Be direct and concise. You will not answer questions that are not related to "
    "food donation."
)

GREETING = "नमस्ते! मैं फूडब्रिज हूँ। आज आप कौन सा खाना दान करना चाहेंगे?"

_latency_stt_done = 0.0
_latest_user_text = ""


class GreetingProcessor(FrameProcessor):
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, StartFrame):

            async def _delayed_greeting():
                await asyncio.sleep(1)
                await self.push_frame(TTSSpeakFrame(GREETING))

            self.create_task(_delayed_greeting())
        await self.push_frame(frame, direction)


class UserTextCapture(FrameProcessor):
    async def process_frame(self, frame: Frame, direction: FrameDirection):
        global _latency_stt_done, _latest_user_text
        if isinstance(frame, TranscriptionFrame):
            text = frame.text.strip()
            if text:
                _latency_stt_done = time.time()
                _latest_user_text = text
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)


class TranscriptionToLLM(FrameProcessor):
    """Feeds final transcripts into the LLM context (streaming STT path).

    Pushes an LLMContextFrame so GroqLLMService starts generating, exactly like
    server/agent_session.py does for the /ws/v1 WebSocket path.
    """

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
                    await self._on_log(f'[STT] Transcription received: "{text}"')
                self._context.add_message({"role": "user", "content": text})
                await self.push_frame(LLMContextFrame(self._context))
            return
        elif isinstance(frame, LLMFullResponseEndFrame):
            self._echo_cooldown_until = time.time() + 1.5
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


class UsageTracker(FrameProcessor):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._turn_count = 0
        self._call_user_chars = 0
        self._call_tts_chars = 0
        self._response_chars = 0
        self._csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "usage_log_v3.csv")
        if not os.path.exists(self._csv_path):
            with open(self._csv_path, "w", encoding="utf-8") as f:
                f.write("turn,user_chars,tts_chars,stt_secs_est,llm_input_tok_est,llm_output_tok_est,cost_est_inr\n")

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        global _latest_user_text
        if isinstance(frame, LLMFullResponseStartFrame):
            self._response_chars = 0
        elif isinstance(frame, TextFrame):
            self._response_chars += len(frame.text)
        elif isinstance(frame, LLMFullResponseEndFrame):
            self._turn_count += 1
            user_text = _latest_user_text
            user_chars = len(user_text) if user_text else 0
            tts_chars = self._response_chars
            self._call_user_chars += user_chars
            self._call_tts_chars += tts_chars
            stt_secs_est = round(user_chars / 15)
            llm_in_tok = round(user_chars * 1.5)
            llm_out_tok = round(tts_chars * 1.5)
            cost_stt = stt_secs_est * (0.04 / 3600 * 86)
            cost_tts = tts_chars * (30 / 10000)
            cost_llm = (llm_in_tok * 0.59 + llm_out_tok * 0.79) / 1_000_000 * 86
            cost_total = round(cost_stt + cost_tts + cost_llm, 3)
            cumul_stt = round(self._call_user_chars / 15 * (0.04 / 3600 * 86), 4)
            cumul_tts = round(self._call_tts_chars * (30 / 10000), 2)
            cumul_llm = sum(
                round(c * 1.5 * (0.59 if j == 0 else 0.79) / 1_000_000 * 86, 4)
                for c, j in [(self._call_user_chars, 0), (self._call_tts_chars, 1)]
            )
            cumul_total = round(cumul_stt + cumul_tts + cumul_llm, 2)
            row = f"{self._turn_count},{user_chars},{tts_chars},{stt_secs_est},{llm_in_tok},{llm_out_tok},{cost_total}\n"
            with open(self._csv_path, "a", encoding="utf-8") as f:
                f.write(row)
            print(
                f"[USAGE] #{self._turn_count}: "
                f"stt≈{stt_secs_est}s ${cost_stt:.4f} | "
                f"tts={tts_chars}c ₹{cost_tts:.3f} | "
                f"llm~₹{cost_llm:.4f} | "
                f"this=₹{cost_total}  "
                f"call=₹{cumul_total}  → usage_log_v3.csv",
                flush=True,
            )
        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)


class LatencyTracker(FrameProcessor):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._t_tts_first_audio = 0.0
        self._inside_response = False
        self._turn_count = 0
        self._csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "latency_log_v3.csv")
        if not os.path.exists(self._csv_path):
            with open(self._csv_path, "w", encoding="utf-8") as f:
                f.write("turn,response_delay_ms\n")

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        global _latency_stt_done
        now = time.time()

        if isinstance(frame, InterruptionFrame):
            self._inside_response = False
            self._t_tts_first_audio = 0.0

        if isinstance(frame, LLMFullResponseStartFrame):
            self._inside_response = True
            self._t_tts_first_audio = 0.0

        elif isinstance(frame, TTSAudioRawFrame):
            if self._t_tts_first_audio == 0.0 and self._inside_response:
                self._t_tts_first_audio = now
                t0 = _latency_stt_done
                if t0:
                    self._turn_count += 1
                    delay = round((now - t0) * 1000)
                    try:
                        with open(self._csv_path, "a", encoding="utf-8") as f:
                            f.write(f"{self._turn_count},{delay}\n")
                    except PermissionError:
                        pass
                    print(
                        f"[LATENCY] #{self._turn_count}: "
                        f"Response delay = {delay}ms  (saved to latency_log_v3.csv)",
                        flush=True,
                    )

        elif isinstance(frame, TTSStoppedFrame):
            self._inside_response = False

        await super().process_frame(frame, direction)
        await self.push_frame(frame, direction)


async def main():
    transport = LocalAudioTransport(
        params=LocalAudioTransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,
            audio_in_channels=1,
            audio_out_channels=1,
        )
    )

    # Sarvam streaming STT (Saaras v3, server-side VAD). See pipecat docs:
    # https://docs.pipecat.ai/api-reference/services/stt/sarvam
    stt = SarvamSTTService(
        api_key=os.environ["SARVAM_API_KEY"],
        settings=SarvamSTTService.Settings(
            language=Language.HI_IN,
            vad_signals=True,
        ),
    )

    llm = GroqLLMService(
        api_key=os.environ["GROQ_API_KEY"],
        settings=GroqLLMService.Settings(
            model="llama-3.3-70b-versatile",
        ),
    )

    # Sarvam streaming TTS (Bulbul v3, 24 kHz output). See:
    # https://docs.sarvam.ai/api-reference-docs/text-to-speech/stream
    tts = SarvamTTSService(
        api_key=os.environ["SARVAM_API_KEY"],
        settings=SarvamTTSService.Settings(
            model="bulbul:v3",
            voice="aditya",
            language=Language.HI_IN,
        ),
    )

    context = LLMContext()
    context.set_messages([{"role": "system", "content": SYSTEM_PROMPT}])

    pipeline = Pipeline([
        GreetingProcessor(),
        transport.input(),
        stt,
        UserTextCapture(),
        TranscriptionToLLM(context),
        llm,
        UsageTracker(),
        tts,
        LatencyTracker(),
        transport.output(),
        AssistantContextUpdater(context),
    ])

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,
        ),
    )

    runner = WorkerRunner()
    await runner.add_workers(worker)
    print("[READY v3] FoodShelter donation agent (Sarvam STT/TTS + Groq LLM). Speak into your mic. Press Ctrl+C to stop.", flush=True)
    await runner.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[STOPPED]", flush=True)