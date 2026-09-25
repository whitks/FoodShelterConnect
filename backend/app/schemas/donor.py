import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from backend.app.models.donation import DonationSource

class DonorProfileCreate(BaseModel):
    business_name: str
    business_type: str
    address: str
    city: str
    pincode: str
    latitude: float
    longitude: float
    pickup_window_start: str
    pickup_window_end: str

class DonorProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pickup_window_start: Optional[str] = None
    pickup_window_end: Optional[str] = None

class DonorProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    business_name: str
    business_type: str
    address: str
    city: str
    pincode: str
    latitude: float
    longitude: float
    pickup_window_start: str
    pickup_window_end: str
    trust_score: float

    model_config = ConfigDict(from_attributes=True)