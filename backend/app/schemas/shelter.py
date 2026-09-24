import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from backend.app.models.request import RequestUrgency, RequestSource, RequestStatus

class ShelterProfileCreate(BaseModel):
    ngo_name: str
    address: str
    lat: float
    lng: float
    area_zone: str
    avg_daily_beneficiaries: int

class ShelterProfileUpdate(BaseModel):
    current_capacity: Optional[int] = None
    avg_daily_beneficiaries: Optional[int] = None

class ShelterProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    ngo_name: str
    address: str
    lat: float
    lng: float
    area_zone: str
    avg_daily_beneficiaries: int
    current_capacity: int
    priority_score: float
    last_received_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class FoodRequestCreate(BaseModel):
    requested_portions: Optional[int] = None
    requested_quantity_kg: Optional[float] = None
    reason: Optional[str] = None
    source: RequestSource = RequestSource.APP

class FoodRequestResponse(BaseModel):
    id: uuid.UUID
    shelter_id: uuid.UUID
    requested_portions: Optional[int] = None
    requested_quantity_kg: Optional[float] = None
    urgency: RequestUrgency
    reason: Optional[str] = None
    source: RequestSource
    status: RequestStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DeclineRequest(BaseModel):
    reason: Optional[str] = None
