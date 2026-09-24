import asyncio
import json

import os
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .agent_session import AgentSession

# Optional static frontend (e.g. expoapp web export at expoapp/foodapp/dist).
PROJECT_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIST = PROJECT_ROOT / "expoapp" / "foodapp" / "dist"

app = FastAPI(title="FoodShelter Voice Donation Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Expo static export emits one HTML file per route (voice.html, …).
        route_html = FRONTEND_DIST / f"{full_path}.html" if full_path else None
        if route_html and route_html.is_file():
            return FileResponse(route_html, media_type="text/html")
        route_index = FRONTEND_DIST / full_path / "index.html" if full_path else None
        if route_index and route_index.is_file():
            return FileResponse(route_index, media_type="text/html")
        index_path = FRONTEND_DIST / "index.html"
        if index_path.exists():
            return FileResponse(index_path, media_type="text/html")
        return {"error": "Frontend not built"}


@app.websocket("/ws/{agent_type}")
async def websocket_endpoint(websocket: WebSocket, agent_type: str):
    if agent_type not in ("v1", "v3"):
        await websocket.close(code=4000, reason="agent_type must be 'v1' or 'v3'")
        return

    await websocket.accept()
    mode = websocket.query_params.get("mode", "donor")
    session = AgentSession(agent_type, mode)

    async def send_tts_audio(audio_bytes: bytes):
        try:
            await websocket.send_bytes(audio_bytes)
        except Exception:
            pass

    async def send_interruption():
        try:
            await websocket.send_text(json.dumps({"type": "interruption"}))
        except Exception:
            pass

    async def send_log(msg: str):
        try:
            await websocket.send_text(json.dumps({"type": "log", "message": msg}))
        except Exception:
            pass

    async def send_cost(stt_cost: float, tts_cost: float, total: float):
        try:
            await websocket.send_text(json.dumps({
                "type": "cost",
                "stt": stt_cost,
                "tts": tts_cost,
                "total": total,
            }))
        except Exception:
            pass

    session.on_tts_audio(send_tts_audio)
    session.on_interruption(send_interruption)
    session.on_log(send_log)
    session.on_cost(send_cost)

    async def run_agent():
        try:
            await session.start()
        except Exception as e:
            try:
                await send_log(f"[ERROR] {e}")
            except Exception:
                pass

    agent_task = asyncio.create_task(run_agent())

    chunk_count = 0
    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.receive":
                data = message.get("text") or message.get("bytes")
                if isinstance(data, str):
                    try:
                        payload = json.loads(data)
                        if payload.get("type") == "stop":
                            break
                    except json.JSONDecodeError:
                        pass
                elif isinstance(data, bytes):
                    chunk_count += 1
                    if chunk_count == 1 or chunk_count % 20 == 0:
                        await send_log(f"[WS] Received audio chunk #{chunk_count} ({len(data)} bytes)")
                    try:
                        await session.feed_audio(data)
                    except Exception as e:
                        await send_log(f"[WS] feed_audio error: {e}")
    except WebSocketDisconnect:
        pass
    finally:
        agent_task.cancel()
        try:
            await agent_task
        except (asyncio.CancelledError, Exception):
            pass
        await session.stop()