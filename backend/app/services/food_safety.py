from typing import Literal, Optional
from datetime import datetime, timedelta, UTC
from backend.app.models.donation import FoodType, StorageCondition

SHELF_LIFE_RULES = {
    (FoodType.COOKED, StorageCondition.ROOM_TEMP): timedelta(hours=4),
    (FoodType.COOKED, StorageCondition.REFRIGERATED): timedelta(hours=24),
    (FoodType.COOKED, StorageCondition.HOT_BOX): timedelta(hours=6),
    (FoodType.RAW, StorageCondition.ROOM_TEMP): timedelta(hours=12),
    (FoodType.RAW, StorageCondition.REFRIGERATED): timedelta(hours=48),
    (FoodType.BAKED, StorageCondition.ROOM_TEMP): timedelta(hours=6),
    (FoodType.BAKED, StorageCondition.REFRIGERATED): timedelta(hours=48),
}

def compute_expires_at(
    food_type: FoodType, 
    storage_condition: StorageCondition, 
    prepared_at: datetime, 
    packaged_expiry: Optional[datetime] = None
) -> datetime:
    if food_type == FoodType.PACKAGED:
        if not packaged_expiry:
            raise ValueError("packaged_expiry is required for PACKAGED food")
        return packaged_expiry
        
    rule = SHELF_LIFE_RULES.get((food_type, storage_condition))
    if not rule:
        # Safe default if combination is unsupported but passed
        rule = timedelta(hours=2)
        
    return prepared_at + rule

def is_donation_viable(expires_at: datetime, estimated_delivery_mins: int = 60) -> bool:
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    now = datetime.now(UTC)
    time_left = expires_at - now
    required_mins = estimated_delivery_mins + 30
    return time_left >= timedelta(minutes=required_mins)

def get_time_remaining_mins(expires_at: datetime) -> int:
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    now = datetime.now(UTC)
    time_left = expires_at - now
    mins = int(time_left.total_seconds() / 60)
    return max(0, mins)

def get_safety_status(expires_at: datetime) -> Literal["SAFE", "EXPIRING_SOON", "EXPIRED"]:
    mins_left = get_time_remaining_mins(expires_at)
    if mins_left > 90:
        return "SAFE"
    elif 30 <= mins_left <= 90:
        return "EXPIRING_SOON"
    else:
        return "EXPIRED"
