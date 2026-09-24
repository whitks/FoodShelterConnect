import pytest
from datetime import datetime, timedelta, UTC
from backend.app.models.donation import FoodType, StorageCondition
from backend.app.services.food_safety import (
    compute_expires_at, 
    is_donation_viable,
    get_time_remaining_mins,
    get_safety_status
)

def test_compute_expires_at_rules():
    prepared_at = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
    
    # COOKED + ROOM_TEMP -> 4 hours
    assert compute_expires_at(FoodType.COOKED, StorageCondition.ROOM_TEMP, prepared_at) == prepared_at + timedelta(hours=4)
    # COOKED + REFRIGERATED -> 24 hours
    assert compute_expires_at(FoodType.COOKED, StorageCondition.REFRIGERATED, prepared_at) == prepared_at + timedelta(hours=24)
    # COOKED + HOT_BOX -> 6 hours
    assert compute_expires_at(FoodType.COOKED, StorageCondition.HOT_BOX, prepared_at) == prepared_at + timedelta(hours=6)
    
    # RAW + ROOM_TEMP -> 12 hours
    assert compute_expires_at(FoodType.RAW, StorageCondition.ROOM_TEMP, prepared_at) == prepared_at + timedelta(hours=12)
    # RAW + REFRIGERATED -> 48 hours
    assert compute_expires_at(FoodType.RAW, StorageCondition.REFRIGERATED, prepared_at) == prepared_at + timedelta(hours=48)
    
    # BAKED + ROOM_TEMP -> 6 hours
    assert compute_expires_at(FoodType.BAKED, StorageCondition.ROOM_TEMP, prepared_at) == prepared_at + timedelta(hours=6)
    # BAKED + REFRIGERATED -> 48 hours
    assert compute_expires_at(FoodType.BAKED, StorageCondition.REFRIGERATED, prepared_at) == prepared_at + timedelta(hours=48)

def test_packaged_food_expiry():
    prepared_at = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
    packaged_expiry = datetime(2026, 2, 1, 12, 0, tzinfo=UTC)
    
    assert compute_expires_at(FoodType.PACKAGED, StorageCondition.ROOM_TEMP, prepared_at, packaged_expiry) == packaged_expiry

    with pytest.raises(ValueError):
        compute_expires_at(FoodType.PACKAGED, StorageCondition.ROOM_TEMP, prepared_at)

def test_packaged_food_past_expiry():
    now = datetime.now(UTC)
    expires_at = now - timedelta(days=1)
    
    assert get_time_remaining_mins(expires_at) == 0
    assert get_safety_status(expires_at) == "EXPIRED"
    assert is_donation_viable(expires_at) is False

def test_is_donation_viable():
    now = datetime.now(UTC)
    
    # Needs 60 + 30 = 90 mins buffer. Let's give it exactly 90 mins -> viable
    expires_at = now + timedelta(minutes=90)
    assert is_donation_viable(expires_at, estimated_delivery_mins=60) is True
    
    # Give it 89 mins -> not viable
    expires_at = now + timedelta(minutes=89)
    assert is_donation_viable(expires_at, estimated_delivery_mins=60) is False

def test_get_time_remaining_mins():
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=100)
    # Allow 1 minute threshold incase the test execution takes a split second
    assert 99 <= get_time_remaining_mins(expires_at) <= 100

def test_get_safety_status():
    now = datetime.now(UTC)
    
    # > 90 mins
    assert get_safety_status(now + timedelta(minutes=92)) == "SAFE"
    
    # 30-90 mins
    assert get_safety_status(now + timedelta(minutes=90)) == "EXPIRING_SOON"
    assert get_safety_status(now + timedelta(minutes=30)) == "EXPIRING_SOON"
    
    # < 30 mins
    assert get_safety_status(now + timedelta(minutes=29)) == "EXPIRED"
    assert get_safety_status(now - timedelta(minutes=10)) == "EXPIRED"
