"""FastAPI app for the FoodShelter voice donation agent.

Endpoints
---------
POST /voice          -> TwiML with <Connect><Stream> pointing back at us
                       (TwiML webhook for inbound calls)
WS   /media-stream   -> Twilio bidirectional media stream
GET  /health         -> liveness
POST /make-call      -> place an outbound call to a donor via Twilio (optional)
"""
import asyncio
import json
import logging
import secrets
from contextlib import asynccontextmanager
from html import escape
from typing import Optional
from urllib.parse import quote

from fastapi import FastAPI, Form, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, PlainTextResponse

from . import db
from .call_session import CallSession
from .config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Soft cap on concurrent call sessions: each one opens paid Sarvam STT/TTS
# connections, so reject excess connections instead of exhausting quota.
_call_slots = asyncio.Semaphore(max(settings.MAX_CONCURRENT_CALLS, 1))

# Twilio media frames are 20 ms of 8 kHz mu-law = 160 bytes -> ~216 chars of
# base64. Anything far beyond that is not a real Twilio frame; drop it before
# it is forwarded to the paid STT upstream.
_MAX_MEDIA_PAYLOAD_LEN = 4096
_MAX_WS_MESSAGE_LEN = 65536


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Make sure the backend tables exist before accepting calls.
    await db.ensure_tables()
    yield


app = FastAPI(title="FoodShelter Voice Donation Agent", lifespan=lifespan)


def _mask_phone(phone: str) -> str:
    """Mask a phone number for logs, keeping only the last 4 digits."""
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if not digits:
        return "<unknown>"
    return "***" + digits[-4:]


def _token_ok(provided: str, expected: str) -> bool:
    return bool(expected) and secrets.compare_digest(provided, expected)


def _ws_url_for(request: Request) -> str:
    base = str(request.base_url)
    if base.startswith("https://"):
        base = "wss://" + base[len("https://"):]
    elif base.startswith("http://"):
        base = "ws://" + base[len("http://"):]
    return base.rstrip("/") + "/media-stream"


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/voice")
async def voice_webhook(request: Request, From: Optional[str] = Form(None)):
    """Return TwiML that opens a media stream to our websocket."""
    stream_url = _ws_url_for(request)
    if settings.MEDIA_STREAM_TOKEN:
        sep = "&" if "?" in stream_url else "?"
        stream_url = f"{stream_url}{sep}token={quote(settings.MEDIA_STREAM_TOKEN)}"
    caller = escape(From or "")
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Response>'
        f'<Connect><Stream url="{stream_url}">'
        f'<Parameter name="caller" value="{caller}"/>'
        '</Stream></Connect>'
        '</Response>'
    )
    return PlainTextResponse(twiml, media_type="application/xml")


@app.websocket("/media-stream")
async def media_stream(ws: WebSocket):
    # Media Streams have no built-in auth; reject connections that do not
    # present the optional shared token (Twilio forwards ?token= unchanged).
    if settings.MEDIA_STREAM_TOKEN and not _token_ok(
        ws.query_params.get("token", ""), settings.MEDIA_STREAM_TOKEN
    ):
        logger.warning("media-stream rejected: missing/invalid token")
        await ws.close(code=1008, reason="unauthorized")
        return
    if _call_slots.locked():
        logger.warning("media-stream rejected: too many concurrent calls")
        await ws.close(code=1013, reason="server busy")
        return

    async with _call_slots:
        await ws.accept()
        session: CallSession | None = None

        async def send_to_twilio(message: dict):
            await ws.send_text(json.dumps(message))

        try:
            while True:
                raw = await ws.receive_text()
                if len(raw) > _MAX_WS_MESSAGE_LEN:
                    logger.warning("media-stream: dropping oversized WS message")
                    continue
                msg = json.loads(raw)
                event = msg.get("event")
                if event == "start":
                    start = msg.get("start", {})
                    custom = start.get("customParameters", {}) or {}
                    caller = custom.get("caller", "")
                    session = CallSession(
                        twilio_send=send_to_twilio,
                        stream_sid=msg.get("streamSid", ""),
                        caller=caller,
                    )
                    logger.info(
                        "[call %s] stream started (caller=%s)",
                        msg.get("streamSid"), _mask_phone(caller),
                    )
                    await session.start()
                elif event == "media" and session is not None:
                    payload = msg.get("media", {}).get("payload", "")
                    if isinstance(payload, str) and len(payload) <= _MAX_MEDIA_PAYLOAD_LEN:
                        await session.handle_media(payload)
                    else:
                        logger.warning(
                            "[call %s] dropped invalid/oversized media frame",
                            msg.get("streamSid"),
                        )
                elif event == "stop":
                    break
        except WebSocketDisconnect:
            logger.info("Twilio websocket disconnected")
        except Exception as e:
            logger.exception("media-stream error: %s", e)
        finally:
            if session is not None:
                await session.close()


@app.post("/make-call")
def make_call(request: Request, to: str = Form(...), name: Optional[str] = Form(None)):
    """Place an outbound call to a donor (optional convenience endpoint).

    Not a Twilio webhook: requires the X-Admin-Token header matching
    ADMIN_TOKEN so anonymous callers cannot initiate toll calls on our dime.
    """
    if not settings.ADMIN_TOKEN:
        return JSONResponse(
            status_code=503,
            content={"error": "ADMIN_TOKEN not configured; /make-call disabled"},
        )
    provided = request.headers.get("X-Admin-Token", "")
    if not _token_ok(provided, settings.ADMIN_TOKEN):
        logger.warning("make-call rejected: bad admin token")
        return JSONResponse(status_code=401, content={"error": "unauthorized"})
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER):
        return JSONResponse(
            status_code=503,
            content={
                "error": "Twilio credentials not configured "
                         "(TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER)"
            },
        )
    if not settings.TWILIO_WEBHOOK_BASE_URL:
        return JSONResponse(
            status_code=503,
            content={"error": "TWILIO_WEBHOOK_BASE_URL not configured"},
        )
    try:
        from twilio.rest import Client

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        call = client.calls.create(
            to=to,
            from_=settings.TWILIO_PHONE_NUMBER,
            url=settings.TWILIO_WEBHOOK_BASE_URL.rstrip("/") + "/voice",
            status_callback=settings.TWILIO_WEBHOOK_BASE_URL.rstrip("/") + "/call-status",
        )
        return {"call_sid": call.sid}
    except Exception as e:
        logger.exception("make-call failed")
        return JSONResponse(status_code=500, content={"error": str(e)})