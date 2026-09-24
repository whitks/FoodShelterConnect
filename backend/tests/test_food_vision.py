"""Tests for the food-image vision feature (schemas + service + routes)."""
import io

import pytest
import pytest_asyncio
from httpx import AsyncClient
from PIL import Image

from backend.app.models.donation import FoodType
from backend.app.services import food_vision_service
from backend.app.services.food_vision_service import (
    _extract_json,
    _normalize,
    is_image_mime,
    validate_image_bytes,
)


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

def _tiny_png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (16, 16), color=(200, 120, 60)).save(buf, format="PNG")
    return buf.getvalue()


def test_is_image_mime():
    assert is_image_mime("image/jpeg")
    assert is_image_mime("image/png")
    assert not is_image_mime("application/pdf")
    assert not is_image_mime("")


def test_validate_image_bytes_ok():
    data, mime = validate_image_bytes(_tiny_png_bytes())
    assert mime == "image/png"


def test_validate_image_bytes_rejects_garbage():
    with pytest.raises(Exception) as exc:
        validate_image_bytes(b"this is definitely not an image")
    assert exc.value.status_code == 415


def test_validate_image_bytes_rejects_empty():
    with pytest.raises(Exception) as exc:
        validate_image_bytes(b"")
    assert exc.value.status_code == 415


def test_extract_json_plain():
    assert _extract_json('{"title": "Biryani"}') == {"title": "Biryani"}


def test_extract_json_with_markdown_fence():
    text = "```json\n{\"title\": \"Biryani\"}\n```"
    assert _extract_json(text) == {"title": "Biryani"}


def test_extract_json_with_surrounding_noise():
    text = 'Here you go: {"title": "Dal"}\n\nHope that helps.'
    assert _extract_json(text) == {"title": "Dal"}


def test_extract_json_invalid_raises():
    with pytest.raises(Exception):
        _extract_json("not json at all")


# ---------------------------------------------------------------------------
# _normalize
# ---------------------------------------------------------------------------

def test_normalize_veg_dish():
    out = _normalize({
        "title": "Paneer Butter Masala",
        "category": "Cooked Meals",
        "food_type": "COOKED",
        "dietary_tag": "VEG",
        "egg_quantity": 0,
        "confidence": "high",
    })
    assert out["title"] == "Paneer Butter Masala"
    assert out["category"] == "Cooked Meals"
    assert out["food_type"] == FoodType.COOKED
    assert out["dietary_tag"] == "Veg"
    assert out["egg_quantity"] == 0
    assert out["confidence"] == "HIGH"  # uppercased


def test_normalize_egg_dish_counts_eggs():
    out = _normalize({
        "title": "Egg Curry",
        "category": "Cooked Meals",
        "food_type": "COOKED",
        "dietary_tag": "EGG",
        "egg_quantity": "4",  # model returned a string
        "confidence": "MEDIUM",
    })
    assert out["dietary_tag"] == "Egg"
    assert out["egg_quantity"] == 4


def test_normalize_egg_dish_missing_count_defaults_to_one():
    out = _normalize({
        "title": "Boiled Eggs",
        "category": "Cooked Meals",
        "food_type": "COOKED",
        "dietary_tag": "EGG",
        "egg_quantity": None,
    })
    assert out["dietary_tag"] == "Egg"
    assert out["egg_quantity"] == 1


def test_normalize_nonveg():
    out = _normalize({
        "title": "Chicken Biryani",
        "category": "Cooked Meals",
        "food_type": "COOKED",
        "dietary_tag": "NON-VEG",
        "egg_quantity": 0,
    })
    assert out["dietary_tag"] == "Non-Veg"
    assert out["egg_quantity"] == 0


def test_normalize_category_fallback_and_typos():
    # Model said "non veg" and a sloppy category + lowercase food type
    out = _normalize({
        "title": "Fish Fry",
        "category": "cooked meal",
        "food_type": "cooked",
        "dietary_tag": "nonveg",
        "egg_quantity": -3,
    })
    assert out["category"] == "Cooked Meals"
    assert out["food_type"] == FoodType.COOKED
    assert out["dietary_tag"] == "Non-Veg"
    assert out["egg_quantity"] == 0  # negative clamped


def test_normalize_bakery_category():
    out = _normalize({
        "title": "Croissant",
        "category": "bakery & bread",
        "food_type": "BAKED",
        "dietary_tag": "VEG",
    })
    assert out["category"] == "Bakery & Bread"
    assert out["food_type"] == FoodType.BAKED


def test_normalize_unknown_inputs_have_safe_defaults():
    out = _normalize({
        "title": "",
        "category": "mystery",
        "food_type": "???",
        "dietary_tag": "???",
        "egg_quantity": "abc",
    })
    assert out["title"] == "Food Item"
    assert out["category"] == "Cooked Meals"
    assert out["food_type"] == FoodType.COOKED
    assert out["dietary_tag"] == "Veg"
    assert out["egg_quantity"] == 0


# ---------------------------------------------------------------------------
# Endpoints (VLM mocked out; no real API calls)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(autouse=True)
def _mock_vision(monkeypatch):
    fake_item = {
        "title": "Fake Paneer Curry",
        "category": "Cooked Meals",
        "food_type": "COOKED",
        "dietary_tag": "Veg",
        "egg_quantity": 0,
        "confidence": "HIGH",
        "reasoning": "test fixture",
    }
    monkeypatch.setattr(
        food_vision_service, "analyze_food_image", lambda data, mime="image/jpeg": dict(fake_item)
    )
    monkeypatch.setattr(
        food_vision_service,
        "analyze_food_images_batch",
        lambda images, max_workers=3: ([dict(fake_item) for _ in images], []),
    )
    monkeypatch.setattr(
        food_vision_service, "analyze_food_image_url", lambda url: dict(fake_item)
    )


async def _auth_headers(client: AsyncClient) -> dict:
    res = await client.post("/auth/register", json={
        "name": "Vision Tester",
        "phone": "5550001111",
        "password": "pw",
        "role": "DONOR",
    })
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.mark.asyncio
async def test_analyze_single_image_endpoint(client: AsyncClient):
    headers = await _auth_headers(client)
    res = await client.post(
        "/vision/food/analyze",
        files={"file": ("dish.png", _tiny_png_bytes(), "image/png")},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert data["source"] == "upload"
    assert data["item"]["title"] == "Fake Paneer Curry"
    assert data["item"]["dietary_tag"] == "Veg"
    assert "egg_quantity" in data["item"]


@pytest.mark.asyncio
async def test_analyze_batch_endpoint(client: AsyncClient):
    headers = await _auth_headers(client)
    files = [("files", (f"dish_{i}.png", _tiny_png_bytes(), "image/png")) for i in range(3)]
    res = await client.post("/vision/food/analyze-batch", files=files, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["analyzed"] == 3
    assert data["failed"] == 0
    assert len(data["items"]) == 3
    assert data["errors"] == []


@pytest.mark.asyncio
async def test_analyze_url_endpoint(client: AsyncClient):
    headers = await _auth_headers(client)
    res = await client.post(
        "/vision/food/analyze-url",
        json={"url": "https://example.com/dish.jpg"},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    assert res.json()["source"] == "url"
    assert res.json()["item"]["title"] == "Fake Paneer Curry"


@pytest.mark.asyncio
async def test_endpoints_require_auth(client: AsyncClient):
    res = await client.post(
        "/vision/food/analyze",
        files={"file": ("dish.png", _tiny_png_bytes(), "image/png")},
    )
    assert res.status_code == 401
    res = await client.post("/vision/food/analyze-url", json={"url": "https://example.com/d.jpg"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_batch_rejects_too_many_images(client: AsyncClient):
    headers = await _auth_headers(client)
    files = [("files", (f"dish_{i}.png", _tiny_png_bytes(), "image/png")) for i in range(99)]
    res = await client.post("/vision/food/analyze-batch", files=files, headers=headers)
    assert res.status_code == 422