import base64
import json

import httpx
import miniaudio

from pipecat.frames.frames import ErrorFrame, TTSAudioRawFrame
from pipecat.services.tts_service import TTSService


class InworldTTSService(TTSService):
    def __init__(
        self,
        *,
        api_key: str,
        voice: str = "humble-bell-3983__someone",
        model: str = "inworld-tts-2",
        speaking_rate: float = 1.0,
        delivery_mode: str = "BALANCED",
        language: str = "AUTO",
        sample_rate: int = 24000,
        **kwargs,
    ):
        super().__init__(
            sample_rate=sample_rate,
            push_stop_frames=True,
            push_start_frame=True,
            **kwargs,
        )
        self._api_key = api_key
        self._voice = voice
        self._model = model
        self._speaking_rate = speaking_rate
        self._delivery_mode = delivery_mode
        self._language = language
        self._output_sample_rate = sample_rate

    async def run_tts(self, text: str, context_id: str):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.inworld.ai/tts/v1/voice:stream",
                    json={
                        "text": text,
                        "voice_id": self._voice,
                        "model_id": self._model,
                        "audio_config": {
                            "audio_encoding": "MP3",
                            "speaking_rate": self._speaking_rate,
                        },
                        "delivery_mode": self._delivery_mode,
                        "language": self._language,
                    },
                    headers={
                        "Authorization": f"Basic {self._api_key}",
                        "Content-Type": "application/json",
                    },
                ) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        yield ErrorFrame(
                            error=f"Inworld TTS API error {response.status_code}: {body.decode()}"
                        )
                        return

                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            data = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        audio_b64 = data.get("result", {}).get("audioContent")
                        if not audio_b64:
                            continue

                        mp3_bytes = base64.b64decode(audio_b64)
                        decoded = miniaudio.decode(
                            mp3_bytes,
                            output_format=miniaudio.SampleFormat.SIGNED16,
                            nchannels=1,
                            sample_rate=self._output_sample_rate,
                        )

                        yield TTSAudioRawFrame(
                            audio=decoded.samples,
                            sample_rate=decoded.sample_rate,
                            num_channels=decoded.nchannels,
                            context_id=context_id,
                        )

        except httpx.TimeoutException:
            yield ErrorFrame(error="Inworld TTS request timed out")
        except Exception as e:
            yield ErrorFrame(error=f"Inworld TTS error: {e}")