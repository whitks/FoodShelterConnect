"""Smoke test for the voice donation agent stack.

Run from the FoodShelter folder:
    .\\.venv\\Scripts\\python.exe -m Callagent.smoke_test

Exercises (against the live APIs + local sqlite):
  1. DB table bootstrap + get-or-create donor + save VOICE_CALL donation
  2. Sarvam streaming TTS returns raw mu-law bytes
  3. Groq streaming chat returns text deltas
  4. Groq donation JSON extraction parses to a dict
  5. FastAPI /voice returns valid TwiML
"""
import asyncio
import json
import logging
import sys
import time

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")

from Callagent import db
from Callagent.sarvam_tts import SarvamStreamingTTS
from Callagent.groq_llm import extract_donation_json, stream_chat
from backend.app.models.donation import DonationSource

PHONE = "+19990001111"


async def test_db():
    print("\n[1] DB path")
    await db.ensure_tables()
    donor_id = await db.get_or_create_donor(PHONE, "Smoke Tester")
    print(f"    donor_id={donor_id}")
    fields = {
        "donor_name": "Smoke Tester",
        "food_name": "Vegetable Biryani",
        "food_type": "COOKED",
        "quantity_kg": 2.5,
        "portions": 10,
        "storage_condition": "HOT_BOX",
        "prepared_at": None,
        "pickup_address": "123 Main St",
        "area_zone": "zone-1",
        "notes": "",
        "wants_to_donate": True,
        "complete": True,
    }
    result = await db.save_donation(donor_id, fields)
    print(f"    saved donation food_name={result['food_name']} "
          f"source={result['source']} status={result['status']} id={result['id']}")
    assert result["source"] == DonationSource.VOICE_CALL, result["source"]
    return donor_id


async def test_tts():
    print("\n[2] Sarvam TTS")
    tts = SarvamStreamingTTS()
    total = 0
    async for chunk in tts.synthesize("नमस्ते, आपका दिन शुभ हो।"):
        total += len(chunk)
    await tts.aclose()
    print(f"    streamed {total} bytes of mu-law audio")
    assert total > 0, "TTS returned no audio"


async def test_groq_chat():
    print("\n[3] Groq streaming chat")
    parts = []
    async for delta in stream_chat(
        [{"role": "user", "content": "Say exactly: smoke test okay"}], max_tokens=100
    ):
        parts.append(delta)
    reply = "".join(parts).strip()
    print(f"    reply={reply!r}")
    assert reply, "Groq streaming returned empty reply"


async def test_extraction():
    print("\n[4] Groq donation extraction")
    history = [
        {"role": "assistant", "content": "नमस्ते! क्या आप दान करना चाहेंगे?"},
        {"role": "user", "content": "हाँ, मैं 5 किलो दाल और चावल दान करना चाहती हूँ।"},
        {"role": "assistant", "content": "बढ़िया! खाना कब पकाया था? और कैसे रखा है?"},
        {"role": "user", "content": "अभी पकाया है, गरम रखा है।"},
    ]
    fields = await extract_donation_json(history)
    print(f"    extracted: {json.dumps(fields, ensure_ascii=False)[:300]}")
    assert isinstance(fields, dict), fields
    assert fields.get("food_name"), "food_name missing"


async def test_twiml():
    print("\n[5] /voice TwiML")
    from fastapi.testclient import TestClient
    from Callagent.app import app

    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200 and r.json()["status"] == "ok", r.text
        r = client.post("/voice", data={"From": "+10000000001"})
        assert r.status_code == 200, r.status_code
        body = r.text
        assert "<Connect>" in body and 'url="ws://' in body and "media-stream" in body, body
        print(f"    {body[:200]}...")


async def main():
    t0 = time.time()
    await test_db()
    await test_tts()
    await test_groq_chat()
    await test_extraction()
    await test_twiml()
    print(f"\nALL SMOKE TESTS PASSED in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        logging.error("Smoke test failed", exc_info=True)
        sys.exit(1)