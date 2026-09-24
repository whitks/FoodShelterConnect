# FoodShelter Voice Donation Call Agent

Answers inbound **Twilio** phone calls, talks to the caller with **Sarvam**
(STT + TTS), reasons with **Groq** (LLM), and saves the collected donation into
the FoodShelter database tagged `source=VOICE_CALL`, then runs the shelter
matcher automatically.

Direct integration — **no pipecat**:

```
Twilio Media Streams (8kHz µ-law)
        │  base64 media events
        ▼
 FastAPI  /voice (TwiML <Connect><Stream>)  +  /media-stream (WebSocket)
        │  ──────────────────────────────────────────────
        │   audio in:  base64 ───────────────► Sarvam realtime STT
        │               (mulaw&sample_rate=8000, saaras:v3-realtime)
        │   transcript.final ──► Groq LLM streaming (gpt-oss-120b)
        │   LLM sentences ───► Sarvam streaming TTS (bulbul:v3, mulaw 8k)
        │   raw µ-law chunks (base64) ──► Twilio media events
        │  ──────────────────────────────────────────────
        ▼
 FoodShelter DB: users (get-or-create DONOR by phone) → donations
                 (source=VOICE_CALL) → run_matching()
```

Barge-in is supported (Sarvam `vad.speech_start` → Twilio `clear`), with echo
suppression for `transcript.final` events that arrive right after our own TTS.

## Setup

1. Add the env vars to `../.env` (project root) — see `.env.example`:

   ```
   SARVAM_API_KEY=...
   GROQ_API_KEY=...
   TWILIO_ACCOUNT_SID=...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+1...
   TWILIO_WEBHOOK_BASE_URL=https://<your-public-host>
   ```

2. Install deps into the FoodShelter venv:

   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r Callagent\requirements.txt
   ```

3. Run (from the FoodShelter folder so `backend` and `Callagent` are importable):

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn Callagent.app:app --host 0.0.0.0 --port 8000
   ```

4. Expose it publicly (Twilio requires a public HTTPS/WSS endpoint):

   ```powershell
   ngrok http 8000
   ```

5. Point a Twilio phone number's "A call comes in" webhook to
   `https://<ngrok>/voice` (method POST).

## Config

| Env var                        | Default                                      | Purpose                            |
| ------------------------------ | -------------------------------------------- | ---------------------------------- |
| `SARVAM_API_KEY`               | *(required)*                                 | Sarvam STT + TTS auth              |
| `SARVAM_STT_WS_URL`            | `wss://api.sarvam.ai/speech-to-text-realtime/ws` | Realtime STT websocket        |
| `SARVAM_STT_MODEL`             | `saaras:v3-realtime`                         | STT model                          |
| `SARVAM_TTS_MODEL`             | `bulbul:v3`                                  | TTS model                          |
| `SARVAM_TTS_VOICE`             | `simran`                                     | TTS voice (Hindi)                  |
| `SARVAM_TTS_LANGUAGE`          | `hi-IN`                                      | TTS language                       |
| `GROQ_API_KEY`                 | *(required)*                                 | Groq auth                          |
| `GROQ_LLM_MODEL`               | `openai/gpt-oss-120b`                        | LLM (configurable, e.g. `llama-3.3-70b-versatile` when available) |
| `GROQ_LLM_MAX_TOKENS`          | `400`                                        | Max completion tokens              |
| `TWILIO_ACCOUNT_SID`           | *(required for /make-call)*                  | Twilio account                     |
| `TWILIO_AUTH_TOKEN`            | *(required for /make-call)*                  | Twilio auth                        |
| `TWILIO_PHONE_NUMBER`          | *(required for /make-call)*                  | Caller ID for outbound calls       |
| `TWILIO_WEBHOOK_BASE_URL`      | *(required for /make-call)*                  | Public base URL for webhooks       |
| `MEDIA_STREAM_TOKEN`           | *(recommended)*                              | Shared secret for the /media-stream WebSocket (see Security below) |
| `ADMIN_TOKEN`                  | *(recommended)*                              | X-Admin-Token for POST /make-call (see Security below) |
| `MAX_CONCURRENT_CALLS`         | `25`                                         | Soft cap on simultaneous call sessions |
| `ECHO_SUPPRESSION_SECONDS`     | `0.6`                                        | Window after TTS where STT echoes are dropped |
| `MAX_HISTORY_MESSAGES`         | `20`                                         | Turns fed to the LLM               |

## Security

- **Media Stream auth**: Twilio Media Streams have no built-in authentication.
  Set `MEDIA_STREAM_TOKEN` to a long random string; it is appended to the
  `<Stream>` URL in `/voice` and verified (constant-time) before the socket is
  accepted. Twilio forwards the query string unchanged, so calls keep working.
- **/make-call**: not a Twilio webhook — it places paid outbound calls. Set
  `ADMIN_TOKEN` and send `X-Admin-Token: <token>`; the endpoint returns 503
  when the token is unset so it can't be abused anonymously.
- API keys (`SARVAM_API_KEY`, `GROQ_API_KEY`, `TWILIO_AUTH_TOKEN`) are only
  ever sent in request headers and never logged or reflected in responses.
- Incoming media frames are size-checked before being forwarded to the paid
  STT upstream, the conversation history is bounded, and malicious or invalid
  caller phone numbers are normalized before any DB write.

## Project layout

```
Callagent/
├── app.py            FastAPI: /voice, /media-stream, /health, /make-call
├── call_session.py   Per-call orchestration, barge-in, echo suppression
├── sarvam_stt.py     Sarvam realtime STT WebSocket client
├── sarvam_tts.py     Sarvam TTS HTTP stream client (raw µ-law chunks)
├── groq_llm.py       Groq SSE streaming + donation JSON extraction
├── db.py             Table bootstrap, get-or-create donor, save donation + match
├── config.py         Pydantic settings (env / .env)
├── prompts.py        PLACEHOLDER system prompt + spoken lines  ← swap in real copy
├── audio_utils.py    µ-law media frame helpers
└── .env.example / requirements.txt / README.md
```

## Notes

- **System prompt**: `prompts.py::SYSTEM_PROMPT` is a clearly-marked
  placeholder — replace it with the real production prompt, keeping the same
  field name.
- **Donation save**: after a few turns the agent runs a separate Groq JSON
  extraction pass over the transcript and auto-saves when enough details are
  known (`food_name`, `food_type`, `storage_condition`). Callers never give
  lat/lng — voice donations default `pickup_lat/lng` to `0.0` (schema default).
- **Matching** runs immediately after the save; if no shelter qualifies the
  donation stays `POSTED`.
- Audio is **8 kHz µ-law end to end** — no decode/resample anywhere.