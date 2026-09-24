import pytest
from httpx import AsyncClient
from datetime import datetime, UTC

@pytest.fixture
def sample_donation_data():
    return {
        "food_name": "Rice and Beans",
        "food_type": "COOKED",
        "quantity_kg": 5.5,
        "portions": 15,
        "storage_condition": "ROOM_TEMP",
        "prepared_at": datetime.now(UTC).isoformat(),
        "pickup_address": "123 Main St",
        "pickup_lat": 12.34,
        "pickup_lng": 56.78
    }

@pytest.mark.asyncio
async def test_create_and_list_donation(client: AsyncClient, sample_donation_data):
    # Register as Donor
    res = await client.post("/auth/register", json={
        "name": "Donor Bob",
        "phone": "1112223333",
        "password": "pw",
        "role": "DONOR"
    })
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create Donation
    res = await client.post("/donations/", json=sample_donation_data, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["food_name"] == "Rice and Beans"
    assert data["status"] == "POSTED"
    assert "time_remaining_mins" in data
    
    donation_id = data["id"]
    
    # List Donations
    res = await client.get("/donations/", headers=headers)
    assert res.status_code == 200
    list_data = res.json()
    assert list_data["total"] == 1
    
    # Cancel Donation
    res = await client.patch(f"/donations/{donation_id}/cancel", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "CANCELLED"
