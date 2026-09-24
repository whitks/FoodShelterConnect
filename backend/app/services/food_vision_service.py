"""
Food-image vision service.

Runs a Gemini vision-language model (Flash family by default) over food photos
uploaded from the donor app and returns structured data: dish title, category,
veg/non-veg/egg tag, and egg quantity.

Model choice (decent-sized, fast, cheap — no Pro models needed for food tagging):
  - gemini-3.5-flash-lite  (default; cheapest vision-capable tier, biggest free limits)
  - gemini-3.6-flash       (better fine-detail quality: egg counting; use once billing is on)
  - gemini-3.7-flash       (newest Flash, slightly better quality, same intro price)
Override via GEMINI_VISION_MODEL env var.
"""
import io
import json
import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Optional, Tuple

import httpx
import google.generativeai as genai
from fastapi import HTTPException, status
from PIL import Image

from backend.app.config import settings
from backend.app.schemas.food_vision import APP_FOOD_CATEGORIES, DietaryTag, FoodType

logger = logging.getLogger(__name__)

_IMAGE_MIME_PREFIXES = ("image/",)

# Native structured-output schema (Gemini `response_schema`): the model must
# conform, so schema handling is enforced server-side instead of via prompt alone.
_FOOD_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "title": {"type": "STRING"},
        "category": {"type": "STRING", "enum": APP_FOOD_CATEGORIES},
        "food_type": {"type": "STRING", "enum": [f.value for f in FoodType]},
        "dietary_tag": {"type": "STRING", "enum": ["VEG", "NON_VEG", "EGG"]},
        "egg_quantity": {"type": "INTEGER"},
        "confidence": {"type": "STRING", "enum": ["LOW", "MEDIUM", "HIGH"]},
        "reasoning": {"type": "STRING", "nullable": True},
    },
    "required": [
        "title",
        "category",
        "food_type",
        "dietary_tag",
        "egg_quantity",
        "confidence",
    ],
}

# Tolerance folds so the model's phrasing can drift without breaking the API.
_CATEGORY_FALLBACK_MAP = {
    "cooked": "Cooked Meals",
    "meal": "Cooked Meals",
    "curry": "Cooked Meals",
    "rice": "Cooked Meals",
    "raw": "Raw Produce",
    "produce": "Raw Produce",
    "fruit": "Raw Produce",
    "vegetable": "Raw Produce",
    "bakery": "Bakery & Bread",
    "bread": "Bakery & Bread",
    "baked": "Bakery & Bread",
    "snack": "Packaged Snacks",
    "packaged": "Packaged Snacks",
    "dairy": "Dairy & Drinks",
    "drink": "Dairy & Drinks",
    "beverage": "Dairy & Drinks",
}

_DIETARY_NORMALIZE = {
    "veg": "Veg",
    "vegetarian": "Veg",
    "pure veg": "Veg",
    "nonveg": "Non-Veg",
    "non-veg": "Non-Veg",
    "nonvegetarian": "Non-Veg",
    "non vegetarian": "Non-Veg",
    "egg": "Egg",
    "eggetarian": "Egg",
    "eggitarian": "Egg",
}

_FOOD_TYPE_NORMALIZE = {
    "cooked": FoodType.COOKED,
    "raw": FoodType.RAW,
    "packaged": FoodType.PACKAGED,
    "baked": FoodType.BAKED,
    "bakery": FoodType.BAKED,
}


def _get_model():
    """Return a configured GenerativeModel or None when no API key is set."""
    if not settings.GEMINI_API_KEY:
        return None
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(settings.GEMINI_VISION_MODEL)


def is_image_mime(mime: str) -> bool:
    return (mime or "").lower().startswith(_IMAGE_MIME_PREFIXES)


def validate_image_bytes(data: bytes) -> Tuple[bytes, str]:
    """
    Light-weight image validation. Returns a verified byte blob plus a mime type.
    Raises HTTPException(415) for non-image / corrupt uploads.
    """
    if not data:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Empty image data")
    max_bytes = settings.GEMINI_VISION_MAX_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"Image too large (max {settings.GEMINI_VISION_MAX_MB} MB)",
        )
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.load()  # forces decode; raises for corrupt files
            mime = Image.MIME.get(img.format, "image/jpeg")
    except Exception:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "Uploaded file is not a readable image",
        )
    return data, mime


def _normalize(raw: dict) -> dict:
    """
    Thin safety net over Gemini's schema-enforced output.

    The schema already guarantees structure and enum values; this layer only:
      - maps enum labels to the frontend's strings (VEG -> 'Veg', ...),
      - clamps/repairs egg_quantity (schema-compliant ints only),
      - falls back to safe defaults if the model ever drifts.
    """
    # --- dietary tag ---
    raw_tag = str(raw.get("dietary_tag", "")).strip().lower()
    dietary: DietaryTag = "Veg"
    for key, val in _DIETARY_NORMALIZE.items():
        if key in raw_tag:
            dietary = val
            break

    # --- category ---
    raw_cat = str(raw.get("category", "")).strip().lower()
    category = "Cooked Meals"
    if raw_cat in (c.lower() for c in APP_FOOD_CATEGORIES):
        category = next(c for c in APP_FOOD_CATEGORIES if c.lower() == raw_cat)
    else:
        for key, val in _CATEGORY_FALLBACK_MAP.items():
            if key in raw_cat:
                category = val
                break

    # --- food type (backend enum) ---
    raw_ftype = str(raw.get("food_type", "")).strip().lower()
    food_type = _FOOD_TYPE_NORMALIZE.get(raw_ftype, FoodType.COOKED)
    if raw_ftype in (f.value.lower() for f in FoodType):
        food_type = FoodType(raw_ftype.upper())

    # --- egg quantity ---
    egg_qty = raw.get("egg_quantity", 0)
    try:
        egg_qty = int(egg_qty)
    except (TypeError, ValueError):
        egg_qty = 0
    egg_qty = max(0, egg_qty)
    if dietary == "Egg" and egg_qty == 0:
        egg_qty = 1  # egg dish present but count unclear; assume at least one

    confidence = str(raw.get("confidence", "MEDIUM")).strip().upper()
    if confidence not in ("LOW", "MEDIUM", "HIGH"):
        confidence = "MEDIUM"

    return {
        "title": str(raw.get("title") or "Food Item").strip()[:200],
        "category": category,
        "food_type": food_type,
        "dietary_tag": dietary,
        "egg_quantity": egg_qty,
        "confidence": confidence,
        "reasoning": (str(raw.get("reasoning") or "").strip() or None),
    }


def _extract_json(text: str) -> dict:
    """Parse model output, tolerating markdown fences and surrounding noise."""
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            return json.loads(text[start : end + 1])
        raise


_PROMPT = """You are a food recognition assistant for a food-donation app.
Analyze the food in the image. You must respond as structured JSON per the caller's schema.
Rules:
- dietary_tag "EGG" only when eggs are a visible/main ingredient (e.g. egg curry, boiled eggs, omelette, egg biryani). "NON_VEG" for meat/fish/poultry. "VEG" otherwise.
- If dietary_tag is not EGG, egg_quantity MUST be 0.
- If dietary_tag is EGG and the egg count is unclear, give a reasonable integer estimate of at least 1.
- title must be a simple, generic English menu title without the word 'photo'.
- category and food_type must come from the schema's allowed enum values.
"""


_RETRY_DELAY_RE = re.compile(r"retry in (\d+(?:\.\d+)?)s", re.IGNORECASE)


def _generate_with_retry(model, contents, retries: int = 2, base_delay: float = 10.0, max_delay: float = 60.0):
    """
    Call generate_content, retrying on rate-limit/quota errors (429).

    The free-tier Gemini quota is small (~5 req/min, ~20 req/day per model),
    so we respect the server-provided `retry_delay` when waiting.
    """
    delay = base_delay
    last_exc: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            return model.generate_content(
                contents,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                    response_schema=_FOOD_RESPONSE_SCHEMA,
                ),
            )
        except Exception as e:  # noqa: BLE001 - we re-raise after retries
            last_exc = e
            msg = str(e)
            is_rate_limit = (
                "429" in msg or "quota" in msg.lower() or "rate limit" in msg.lower() or "rate-limit" in msg.lower()
            )
            if attempt == retries or not is_rate_limit:
                raise
            match = _RETRY_DELAY_RE.search(msg)
            wait = min(max_delay, float(match.group(1)) + 1) if match else delay
            logger.info("Gemini rate limit hit; retrying in %.0fs (attempt %d/%d)", wait, attempt + 1, retries)
            time.sleep(wait)
    assert last_exc is not None  # unreachable
    raise last_exc


def analyze_food_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """Extract structured food data from one image via Gemini. Raises 503 if unconfigured."""
    model = _get_model()
    if not model:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Vision AI is not configured (GEMINI_API_KEY missing)",
        )

    try:
        response = _generate_with_retry(
            model,
            [{"mime_type": mime_type, "data": image_bytes}, _PROMPT],
        )
    except Exception as e:
        logger.warning("Gemini vision call failed: %s", e)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Vision model call failed: {e}",
        )

    raw = _extract_json(response.text)
    # Smaller models sometimes wrap a single object in a JSON array — unwrap it.
    if isinstance(raw, list):
        raw = raw[0] if raw and isinstance(raw[0], dict) else {}
    if not isinstance(raw, dict):
        logger.warning("Unexpected vision model output shape: %s", type(raw).__name__)
        raw = {}
    return _normalize(raw)


def analyze_food_images_batch(
    images: List[Tuple[bytes, str]],
    max_workers: int = 3,
) -> Tuple[List[dict], List[dict]]:
    """
    Analyze many images, tolerating per-image failures.

    Returns (results, errors) where each error is
    {"index": int, "filename": str, "error": str}.
    """
    results: List[Optional[dict]] = [None] * len(images)
    errors: List[dict] = []

    def _run(idx: int) -> Tuple[int, Optional[dict], Optional[str]]:
        try:
            return idx, analyze_food_image(*images[idx]), None
        except Exception as e:
            return idx, None, str(e)

    workers = min(max_workers, len(images)) if images else 1
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        futures = [pool.submit(_run, i) for i in range(len(images))]
        for fut in as_completed(futures):
            idx, result, error = fut.result()
            if error is not None:
                errors.append({"index": idx, "filename": "", "error": error})
            else:
                results[idx] = result

    clean = [r for r in results if r is not None]
    return clean, errors


async def analyze_food_image_url(url: str) -> dict:
    """Download an image from a public URL and analyze it."""
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "url must be http(s)")

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except Exception as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Could not download image URL: {e}")

    ctype = resp.headers.get("content-type", "")
    if not is_image_mime(ctype) and len(resp.content) < 4096:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "URL does not appear to be an image")

    data, mime = validate_image_bytes(resp.content)
    return analyze_food_image(data, mime)