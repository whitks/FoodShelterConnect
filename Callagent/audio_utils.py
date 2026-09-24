"""Small audio / payload helpers for Twilio <-> Sarvam audio forwarding.

Twilio Media Streams carries 8 kHz mu-law audio in both directions. Sarvam
realtime STT is configured with encoding=mulaw & sample_rate=8000 and Sarvam
streaming TTS is configured with output_audio_codec=mulaw & speech_sample_rate=8000,
so audio bytes pass through untouched (base64 encode/decode only, no resampling).
"""
import base64

MULAW_SAMPLE_RATE = 8000


def b64encode(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")


def b64decode(payload: str) -> bytes:
    return base64.b64decode(payload)


def make_media_message(stream_sid: str, payload_b64: str) -> dict:
    """Build an outbound Twilio media event carrying mu-law audio."""
    return {
        "event": "media",
        "streamSid": stream_sid,
        "media": {"payload": payload_b64},
    }


def make_clear_message(stream_sid: str) -> dict:
    """Build a Twilio clear event (stops currently queued audio playback)."""
    return {"event": "clear", "streamSid": stream_sid}