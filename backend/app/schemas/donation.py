import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from backend.app.models.donation import FoodType, StorageCondition, DonationStatus, DonationSource
from typing import Optional, List

class DonationCreate(BaseModel):
    food_name: str
    food_type: FoodType
    quantity_kg: Optional[float] = None
    portions: Optional[int] = None
    storage_condition: StorageCondition
    prepared_at: datetime
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    area_zone: Optional[str] = None
    notes: Optional[str] = None
    packaged_expiry: Optional[datetime] = None

class DonationResponse(BaseModel):
    id: uuid.UUID
    donor_id: uuid.UUID
    food_name: str
    food_type: FoodType
    quantity_kg: Optional[float] = None
    portions: Optional[int] = None
    storage_condition: StorageCondition
    prepared_at: datetime
    posted_at: datetime
    expires_at: datetime
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    area_zone: Optional[str] = None
    status: DonationStatus
    source: DonationSource
    notes: Optional[str] = None
    
    time_remaining_mins: int
    safety_status: str
    
    model_config = ConfigDict(from_attributes=True)

class DonationListResponse(BaseModel):
    items: List[DonationResponse]
    total: int
