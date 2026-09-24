import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # Register Donor
    res = await client.post("/auth/register", json={
        "name": "Test Donor",
        "phone": "1234567890",
        "email": "donor@test.com",
        "password": "password123",
        "role": "DONOR"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "DONOR"
    
    # Login Donor
    res = await client.post("/auth/login", json={
        "phone": "1234567890",
        "password": "password123"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()
    
    # Register Shelter
    res2 = await client.post("/auth/register", json={
        "name": "Test Shelter",
        "phone": "0987654321",
        "password": "password123",
        "role": "SHELTER"
    })
    assert res2.status_code == 200
    assert res2.json()["role"] == "SHELTER"
