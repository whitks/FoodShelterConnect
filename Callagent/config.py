"""Configuration for the voice donation call agent.

All values can be overridden with environment variables or the FoodShelter
root `.env` file (e.g. SARVAM_API_KEY, GROQ_API_KEY, GROQ_LLM_MODEL ...).
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT = Path(__file__).resolve().parents[1]  # the FoodShelter folder


class VoiceSettings(BaseSettings):
    # --- Sarvam (STT + TTS) ---
    SARVAM_API_KEY: str = ""
    SARVAM_STT_WS_URL: str = "wss://api.sarvam.ai/speech-to-text-realtime/ws"
    SARVAM_STT_MODEL: str = "saaras:v3-realtime"
    SARVAM_STT_LANGUAGE: str = "auto"
    SARVAM_TTS_URL: str = "https://api.sarvam.ai/text-to-speech/stream"
    SARVAM_TTS_MODEL: str = "bulbul:v3"
    SARVAM_TTS_VOICE: str = "simran"
    SARVAM_TTS_LANGUAGE: str = "hi-IN"

    # --- Groq (LLM) ---
    GROQ_API_KEY: str = ""
    GROQ_LLM_MODEL: str = "openai/gpt-oss-120b"
    GROQ_LLM_BASE_URL: str = "https://api.groq.com/openai/v1"
    GROQ_LLM_MAX_TOKENS: int = 400
    GROQ_LLM_TEMPERATURE: float = 0.6

    # --- Twilio ---
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    TWILIO_WEBHOOK_BASE_URL: str = ""

    # --- Security ---
    # Optional shared secret appended to the <Stream> URL in /voice and checked
    # on the /media-stream WebSocket. Twilio passes query params through
    # unchanged, so this secures the WS without breaking Media Streams.
    # Leave empty to keep the endpoint open (default, backwards compatible).
    MEDIA_STREAM_TOKEN: str = ""
    # Required X-Admin-Token header value for POST /make-call. If empty the
    # endpoint refuses to place calls (avoids anonymous toll-fraud abuse).
    ADMIN_TOKEN: str = ""
    # Soft cap on concurrent call sessions (each session opens paid Sarvam
    # STT/TTS connections, so bound them).
    MAX_CONCURRENT_CALLS: int = 25

    # --- Misc / tuning ---
    ECHO_SUPPRESSION_SECONDS: float = 0.6
    MAX_HISTORY_MESSAGES: int = 20

    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = VoiceSettings()