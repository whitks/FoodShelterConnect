# FoodShelter Voice Donation Agent

Copied & adapted from `voiebot/voice_agent` for the FoodShelter project.

- **STT**: Sarvam streaming STT (`SarvamSTTService`, Saaras v3, server-side VAD)
- **LLM**: Groq (`llama-3.3-70b-versatile`)
- **TTS**: Sarvam TTS (`SarvamTTSService`, Bulbul v3, voice `aditya`) — replaces the
  Inworld TTS used in the original `voiebot` server so only `SARVAM_API_KEY` and
  `GROQ_API_KEY` are required.

## Files

```
backend/voice_agent/
  agent_v3.py              local-mic build (run on the machine with a mic + speaker)
  tools.py                 donation creation tool (used by other services)
  server/
    __init__.py
    app.py                 FastAPI WebSocket server for the frontend (expoapp/web)
    agent_session.py       AgentSession: pipecat pipeline for /ws/v1 and /ws/v3
    inworld_tts.py         retained from the original server folder (unused; Sarvam TTS now in use)
```

## Requirements

From the FoodShelter repo root:

```bash
pip install "pipecat-ai[sarvam,groq,whisper]==1.3.0"
```

`.env` needs `SARVAM_API_KEY` and `GROQ_API_KEY` (already present in the root `.env`).

## Run the WebSocket server (for the frontend / expoapp)

```bash
# --host 0.0.0.0 lets a physical phone (same Wi-Fi) reach the server
uvicorn backend.voice_agent.server.app:app --reload --host 0.0.0.0 --port 8765
```

- `GET /api/health` → `{"status":"ok"}`
- `WS /ws/v1` → Sarvam streaming STT (default)
- `WS /ws/v3` → Groq Whisper STT
- Query param `mode`: `donor` (default) or `shelter`

### WebSocket protocol

- Client sends raw **PCM16 mono, 16 kHz** mic bytes as binary frames.
- Server sends back:
  - binary frames: TTS audio (**PCM16 mono, 24 kHz**)
  - text JSON: `{"type":"log","message":...}` / `{"type":"interruption"}` /
    `{"type":"cost","stt":...,"tts":...,"total":...}`
- Client may send `{"type":"stop"}` to end the session.

## Run the local-mic build (testing on this machine)

```bash
python backend/voice_agent/agent_v3.py
```

Speak into the mic; the agent greets in Hindi ("नमस्ते! मैं फूडब्रिज हूँ…") and helps
the donor share surplus food (food name, quantity/portions, pickup address).
Cost/latency CSV logs are written next to the script (`usage_log_v3.csv`,
`latency_log_v3.csv`).