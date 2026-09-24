"""Groq LLM client: SSE streaming chat completion + donation detail extraction.

All requests go to the OpenAI-compatible chat completions endpoint at
https://api.groq.com/openai/v1/chat/completions.
"""
from collections.abc import AsyncIterator
import json
import logging

import httpx

from .config import settings

logger = logging.getLogger(__name__)

CHAT_URL = f"{settings.GROQ_LLM_BASE_URL}/chat/completions"

EXTRACTION_SYSTEM_PROMPT = """\
You extract a food donation from a phone conversation (Hindi/Hinglish) into strict JSON.

Allowed field values:
- food_type: "COOKED" | "RAW" | "PACKAGED" | "BAKED" (infer from the item; default "COOKED")
- storage_condition: "ROOM_TEMP" | "REFRIGERATED" | "HOT_BOX" (infer; default "ROOM_TEMP")

Return ONLY this JSON object (no commentary):
{
  "donor_name": string | null,
  "food_name": string | null,
  "food_type": "COOKED" | "RAW" | "PACKAGED" | "BAKED" | null,
  "quantity_kg": number | null,
  "portions": number | null,
  "storage_condition": "ROOM_TEMP" | "REFRIGERATED" | "HOT_BOX" | null,
  "prepared_at": ISO-8601 string | null,
  "pickup_address": string | null,
  "area_zone": string | null,
  "notes": string | null,
  "wants_to_donate": boolean,
  "complete": boolean
}

Rules:
- "prepared_at" defaults to now (ISO-8601) when the caller says the food was just made.
- "complete" is true only when food_name is known together with food_type and
  storage_condition (explicit or reliably defaulted).
- "quantity_kg" and "portions" may stay null when unknown.
- "wants_to_donate" is false when the caller clearly declines to donate.
"""


class GroqError(Exception):
    pass


def _auth_headers() -> dict:
    return {"Authorization": f"Bearer {settings.GROQ_API_KEY}"}


def _base_payload(messages, max_tokens, temperature) -> dict:
    payload = {
        "model": settings.GROQ_LLM_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": True,
    }
    # gpt-oss models are reasoning models: without an explicit effort level they
    # burn the token budget on `reasoning` and (for 120b) return empty content.
    # "low" keeps first-token latency reasonable for a phone conversation.
    if "gpt-oss" in settings.GROQ_LLM_MODEL:
        payload["reasoning_effort"] = "low"
    return payload


async def stream_chat(
    messages: list[dict],
    max_tokens: int | None = None,
    temperature: float | None = None,
) -> AsyncIterator[str]:
    """Yield text deltas for a streaming chat completion."""
    payload = _base_payload(
        messages,
        max_tokens or settings.GROQ_LLM_MAX_TOKENS,
        temperature if temperature is not None else settings.GROQ_LLM_TEMPERATURE,
    )
    async with httpx.AsyncClient(timeout=90.0) as client:
        async with client.stream(
            "POST", CHAT_URL, json=payload, headers=_auth_headers()
        ) as resp:
            if resp.status_code != 200:
                body = (await resp.aread())[:500]
                raise GroqError(f"Groq HTTP {resp.status_code}: {body.decode('utf-8', 'replace')}")
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]" or not data:
                    continue
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if chunk.get("error"):
                    raise GroqError(f"Groq streaming error: {chunk['error']}")
                delta = (chunk.get("choices") or [{}])[0].get("delta") or {}
                content = delta.get("content")
                if content:
                    yield content


async def extract_donation_json(history: list[dict]) -> dict:
    """Ask Groq to extract donation fields from the conversation transcript.

    Uses a non-streaming JSON completion (falls back to plain text parsing if
    response_format is not supported).
    """
    transcript = "\n".join(
        f"{'Caller' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')}"
        for m in history
        if m.get("content")
    )
    messages = [
        {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
        {"role": "user", "content": transcript},
    ]
    payload = _base_payload(
        messages,
        max_tokens=settings.GROQ_LLM_MAX_TOKENS,
        temperature=0.0,
    )
    payload["stream"] = False
    payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        for use_json_mode in (True, False):
            if not use_json_mode:
                payload.pop("response_format", None)
            try:
                resp = await client.post(CHAT_URL, json=payload, headers=_auth_headers())
                if resp.status_code == 400 and use_json_mode:
                    continue  # model doesn't support response_format -> retry plain
                resp.raise_for_status()
                data = resp.json()
                content = (data["choices"][0]["message"].get("content") or "").strip()
                return _parse_json_response(content)
            except httpx.HTTPStatusError as e:
                raise GroqError(f"Groq extraction HTTP {e.response.status_code}: {e.response.text[:300]}") from e
    raise GroqError("Groq extraction failed")


def _parse_json_response(content: str) -> dict:
    """Parse a dict out of the model output, tolerating markdown fences,
    leading/trailing prose, and a top-level `reasoning` text preceding the JSON.
    """
    for candidate in _json_candidates(content):
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            return data
    logger.warning("Could not parse Groq extraction output as JSON: %s", content[:300])
    return {}


def _json_candidates(content: str):
    """Yield increasingly tolerant candidate JSON strings."""
    text = content or ""
    # 1. whole thing (already-trimmed JSON)
    if text.strip():
        yield text.strip()
    # 2. markdown code fence block
    if "```" in text:
        blocks = text.split("```")
        for block in blocks[1:-1]:  # skip any surrounding prose
            inner = block.strip()
            if inner.lower().startswith("json"):
                inner = inner[4:].strip()
            yield inner
    # 3. first balanced {...} object anywhere in the text
    start = text.find("{")
    if start != -1:
        depth = 0
        in_str = False
        escaped = False
        for i in range(start, len(text)):
            ch = text[i]
            if in_str:
                if escaped:
                    escaped = False
                elif ch == "\\":
                    escaped = True
                elif ch == '"':
                    in_str = False
                continue
            if ch == '"':
                in_str = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    yield text[start : i + 1]
                    break