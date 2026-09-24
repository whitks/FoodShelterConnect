import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_shelter_profile_and_requests(client: AsyncClient):
    # Register as Shelter
    res = await client.post("/auth/register", json={
        "name": "NGO Alice",
        "phone": "5556667777",
        "password": "pw",
        "role": "SHELTER"
    })
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create Profile
    res = await client.post("/shelters/profile", json={
        "ngo_name": "Alice Foundation",
        "address": "456 NGO Lane",
        "lat": 1.0,
        "lng": 1.0,
        "area_zone": "Central",
        "avg_daily_beneficiaries": 100
    }, headers=headers)
    assert res.status_code == 200
    assert res.json()["current_capacity"] == 100
    
    # Update Capacity
    res = await client.patch("/shelters/profile/me", json={
        "current_capacity": 80
    }, headers=headers)
    assert res.status_code == 200
    assert res.json()["current_capacity"] == 80
    
    # Create Request (NORMAL)
    res = await client.post("/shelters/requests/", json={
        "requested_portions": 50,
        "requested_quantity_kg": 20.0
    }, headers=headers)
    assert res.status_code == 200
    assert res.json()["urgency"] == "NORMAL"
    
    # Create Request (HIGH) -> > 100 * 1.3
    res = await client.post("/shelters/requests/", json={
        "requested_portions": 150
    }, headers=headers)
    assert res.status_code == 200
    assert res.json()["urgency"] == "HIGH"
    
    # List Requests
    res = await client.get("/shelters/requests/", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 2
