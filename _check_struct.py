"""Live re-test: schema-enforced structured output on the default model."""
import asyncio
import sys

sys.path.insert(0, ".")

from backend.app.services.food_vision_service import analyze_food_image_url

URLS = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80",
]

async def main():
    for i, url in enumerate(URLS, 1):
        item = await analyze_food_image_url(url)
        print(f"[{i}] {item}")

asyncio.run(main())