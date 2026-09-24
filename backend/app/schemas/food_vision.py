"""
Schemas for the food-image vision (VLM) feature.

The frontend (Expo donor app) captures food photos and posts them here;
the backend runs a Gemini vision model and returns structured food data:
title, category, veg/non-veg/egg tag, and egg quantity.
"""
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from backend.app.models.donation import FoodType

# Matches the frontend dietary tags exactly (donor.tsx uses 'Veg' | 'Non-Veg' | 'Egg').
DietaryTag = Literal["Veg", "Non-Veg", "Egg"]
ConfidenceLevel = Literal["LOW", "MEDIUM", "HIGH"]

# Frontend category list used in donor.tsx
APP_FOOD_CATEGORIES = [
    "Cooked Meals",
    "Raw Produce",
    "Bakery & Bread",
    "Packaged Snacks",
    "Dairy & Drinks",
]


class FoodVisionItem(BaseModel):
    """One food item extracted from one image."""

    title: str = Field(..., description="Menu-style dish title, e.g. 'Paneer Butter Masala with Roti'")
    category: str = Field(
        ...,
        description="One of: Cooked Meals, Raw Produce, Bakery & Bread, Packaged Snacks, Dairy & Drinks",
    )
    food_type: FoodType = Field(..., description="Backend enum: COOKED, RAW, PACKAGED or BAKED")
    dietary_tag: DietaryTag = Field(..., description="Veg / Non-Veg / Egg")
    egg_quantity: int = Field(
        0,
        ge=0,
        description="Number of whole eggs visible or estimated. 0 when the dish contains no eggs.",
    )
    confidence: ConfidenceLevel = Field("MEDIUM", description="Model confidence in the extraction")
    reasoning: Optional[str] = Field(
        None, description="One short sentence justifying the dietary tag and egg count"
    )


class FoodVisionSingleResponse(BaseModel):
    success: bool = True
    source: Literal["upload", "url"] = "upload"
    filename: Optional[str] = None
    item: FoodVisionItem


class FoodVisionUrlRequest(BaseModel):
    url: str = Field(..., description="Publicly reachable http(s) URL of a food image")


class FoodVisionError(BaseModel):
    index: int = Field(..., description="Position of the failed image in the batch (0-based)")
    filename: str
    error: str


class FoodVisionBatchResponse(BaseModel):
    success: bool = True
    analyzed: int = Field(..., description="Number of images successfully analyzed")
    failed: int = Field(..., description="Number of images that could not be analyzed")
    items: List[FoodVisionItem] = Field(default_factory=list)
    errors: List[FoodVisionError] = Field(default_factory=list)