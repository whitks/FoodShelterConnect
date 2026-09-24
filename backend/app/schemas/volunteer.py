import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from backend.app.models.volunteer import VehicleType
from backend.app.models.delivery import DeliveryStatus

class VolunteerProfileCreate(BaseModel):
    vehicle_type: VehicleType

class VolunteerProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    vehicle_type: VehicleType
    is_online: bool
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    last_location_update: Optional[datetime] = None
    total_deliveries: int
    rating: float

    model_config = ConfigDict(from_attributes=True)

class LocationUpdate(BaseModel):
    lat: float
    lng: float

class OnlineUpdate(BaseModel):
    online: bool

class AvailableJobResponse(BaseModel):
    id: uuid.UUID
    donation_id: uuid.UUID
    shelter_id: uuid.UUID
    assigned_at: datetime
    status: DeliveryStatus
    
    # Enrichment fields
    distance_km: float
    pickup_address: str
    shelter_address: str
    portions: int
    expires_at: datetime
    time_remaining_mins: int
    
    model_config = ConfigDict(from_attributes=True)
