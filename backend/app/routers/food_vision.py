"""
Food-image vision routes.

Used by the donor app: a user picks food photos in the frontend, we extract
the dish title, category, veg/non-veg/egg tag and egg quantity via a Gemini
vision model.
"""
from typing import Annotated, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.app.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.schemas.food_vision import (
    FoodVisionBatchResponse,
    FoodVisionError,
    FoodVisionItem,
    FoodVisionSingleResponse,
    FoodVisionUrlRequest,
)
from backend.app.services import food_vision_service

router = APIRouter(prefix="/vision", tags=["vision"])


def _filename_of(upload: UploadFile) -> str:
    return upload.filename or "image"


@router.post("/food/analyze", response_model=FoodVisionSingleResponse)
async def analyze_single_food_image(
    file: Annotated[UploadFile, File(description="Food image (jpeg/png/webp)")],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Extract food metadata from a single uploaded image."""
    data = await file.read()
    validated, mime = food_vision_service.validate_image_bytes(data)
    item = food_vision_service.analyze_food_image(validated, mime)
    return FoodVisionSingleResponse(
        source="upload",
        filename=_filename_of(file),
        item=FoodVisionItem.model_validate(item),
    )


@router.post("/food/analyze-batch", response_model=FoodVisionBatchResponse)
async def analyze_batch_food_images(
    files: Annotated[
        List[UploadFile],
        File(description=f"Up to {food_vision_service.settings.GEMINI_VISION_MAX_IMAGES} food images"),
    ],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Extract food metadata from several images at once (e.g. a batch of photos)."""
    max_images = food_vision_service.settings.GEMINI_VISION_MAX_IMAGES
    if len(files) > max_images:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Too many images: max {max_images} per request, got {len(files)}",
        )
    if not files:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "At least one image is required")

    filenames = [_filename_of(f) for f in files]
    prepared: List[tuple] = []
    for f in files:
        data = await f.read()
        validated, mime = food_vision_service.validate_image_bytes(data)
        prepared.append((validated, mime))

    items, errors = food_vision_service.analyze_food_images_batch(prepared)

    # attach filenames to error entries
    for err in errors:
        idx = err.get("index", 0)
        if 0 <= idx < len(filenames):
            err["filename"] = filenames[idx]

    return FoodVisionBatchResponse(
        analyzed=len(items),
        failed=len(errors),
        items=[FoodVisionItem.model_validate(i) for i in items],
        errors=[FoodVisionError.model_validate(e) for e in errors],
    )


@router.post("/food/analyze-url", response_model=FoodVisionSingleResponse)
async def analyze_food_image_url(
    data: FoodVisionUrlRequest,
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Extract food metadata from an image hosted at a public URL (e.g. sample photos)."""
    item = await food_vision_service.analyze_food_image_url(data.url)
    return FoodVisionSingleResponse(
        source="url",
        filename=data.url,
        item=FoodVisionItem.model_validate(item),
    )