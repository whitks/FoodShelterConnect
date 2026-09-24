import asyncio
import uuid
import httpx
from datetime import datetime, UTC
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import Base, engine, async_session_maker

async def main():
    print("Setting up DB...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        
    print("\n--- Starting Full Workflow Test ---")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Register Users
        print("\n[1] Registering Users...")
        users = [
            {"name": "Donor Dan", "phone": "1000000001", "password": "pass", "role": "DONOR"},
            {"name": "Shelter Sue", "phone": "2000000002", "password": "pass", "role": "SHELTER"},
            {"name": "Volunteer Val", "phone": "3000000003", "password": "pass", "role": "VOLUNTEER"},
            {"name": "Admin Alan", "phone": "4000000004", "password": "pass", "role": "ADMIN"}
        ]
        
        tokens = {}
        for u in users:
            res = await client.post("/auth/register", json=u)
            assert res.status_code == 200, f"Register failed for {u['role']}: {res.json()}"
            tokens[u["role"]] = res.json().get("access_token")
            
        # Also test login
        print("\n[2] Testing Login...")
        res = await client.post("/auth/login", json={"phone": "1000000001", "password": "pass"})
        assert res.status_code == 200, "Login failed"
        
        h_donor = {"Authorization": f"Bearer {tokens['DONOR']}"}
        h_shelter = {"Authorization": f"Bearer {tokens['SHELTER']}"}
        h_vol = {"Authorization": f"Bearer {tokens['VOLUNTEER']}"}
        h_admin = {"Authorization": f"Bearer {tokens['ADMIN']}"}
        
        # 3. Create Profiles
        print("\n[3] Creating Profiles...")
        res = await client.post("/shelters/profile", json={
            "ngo_name": "Sue's Shelter",
            "address": "123 Hope St",
            "lat": 1.1, "lng": 1.1,
            "area_zone": "Central",
            "avg_daily_beneficiaries": 100
        }, headers=h_shelter)
        assert res.status_code == 200
        
        res = await client.get("/shelters/profile/me", headers=h_shelter)
        assert res.status_code == 200
        shelter_id = res.json()["id"]
        
        res = await client.post("/volunteers/profile", json={"vehicle_type": "CAR"}, headers=h_vol)
        assert res.status_code == 200
        
        # 4. Shelter makes a request
        print("\n[4] Shelter requests food...")
        res = await client.post("/shelters/requests/", json={"requested_portions": 50}, headers=h_shelter)
        assert res.status_code == 200
        
        res = await client.get("/shelters/requests/", headers=h_shelter)
        assert res.status_code == 200 and len(res.json()) > 0
        
        # 5. Donor creates donation
        print("\n[5] Donor creates donation...")
        now = datetime.now(UTC).isoformat()
        res = await client.post("/donations/", json={
            "food_name": "Sandwiches",
            "food_type": "COOKED",
            "quantity_kg": 5.0,
            "portions": 20,
            "storage_condition": "ROOM_TEMP",
            "prepared_at": now,
            "pickup_address": "456 Generosity Ave",
            "pickup_lat": 1.15,
            "pickup_lng": 1.15,
            "area_zone": "Central"
        }, headers=h_donor)
        assert res.status_code == 200, res.text
        donation_id = res.json()["id"]
        
        res = await client.get("/donations/", headers=h_donor)
        assert res.status_code == 200 and len(res.json()) > 0
        
        res = await client.get(f"/donations/{donation_id}", headers=h_donor)
        assert res.status_code == 200
        
        # 6. Volunteer Delivery Flow
        print("\n[6] Volunteer Delivery Flow...")
        await client.patch("/volunteers/location", json={"lat": 1.14, "lng": 1.14}, headers=h_vol)
        await client.patch("/volunteers/online", json={"online": True}, headers=h_vol)
        
        res = await client.get("/volunteers/jobs/available", headers=h_vol)
        assert res.status_code == 200
        jobs = res.json()
        assert len(jobs) > 0, "No jobs available for volunteer"
        
        assignment_id = jobs[0]["id"]
        
        # Accept
        res = await client.post(f"/volunteers/jobs/{assignment_id}/accept", headers=h_vol)
        assert res.status_code == 200
        
        # Picked up
        res = await client.post(f"/volunteers/jobs/{assignment_id}/picked-up", headers=h_vol)
        assert res.status_code == 200
        
        # Delivered
        res = await client.post(f"/volunteers/jobs/{assignment_id}/delivered", headers=h_vol)
        assert res.status_code == 200
        
        # 7. Shelter Check & Confirm
        print("\n[7] Shelter confirms delivery...")
        res = await client.post(f"/shelters/assignments/{assignment_id}/confirm", headers=h_shelter)
        assert res.status_code == 200
        
        # 8. Volunteer History & Donor Trust
        print("\n[8] Checking History and Trust...")
        res = await client.get("/volunteers/jobs/my", headers=h_vol)
        assert res.status_code == 200 and len(res.json()) > 0
        
        res = await client.get("/donors/me/trust", headers=h_donor)
        assert res.status_code == 200
        print("Donor Trust:", res.json())
        
        # 9. AI Forecasting & Admin
        print("\n[9] AI Forecasting & Admin routes...")
        from backend.app.services.ai_service import run_nightly_forecasts
        async with async_session_maker() as session:
            await run_nightly_forecasts(session)
            
        res = await client.get(f"/admin/shelters/{shelter_id}/forecast", headers=h_admin)
        assert res.status_code == 200
        print(f"Forecast for Shelter: {res.json()}")
        
        res = await client.get("/admin/forecasts/tomorrow", headers=h_admin)
        assert res.status_code == 200 and len(res.json()) > 0
        
        # 10. Admin Rematch
        print("\n[10] Admin Rematch...")
        # Create a new donation for rematch
        res = await client.post("/donations/", json={
            "food_name": "Apples",
            "food_type": "RAW",
            "quantity_kg": 10.0,
            "portions": 50,
            "storage_condition": "ROOM_TEMP",
            "prepared_at": now,
            "pickup_address": "Orchard",
            "pickup_lat": 1.2,
            "pickup_lng": 1.2,
            "area_zone": "Central"
        }, headers=h_donor)
        d2_id = res.json()["id"]
        
        res = await client.post(f"/admin/donations/{d2_id}/rematch", headers=h_admin)
        assert res.status_code in [200, 404]
        print("Rematch successful or properly rejected:", res.json())
        
        print("\n[SUCCESS] All endpoints passed!")

if __name__ == "__main__":
    asyncio.run(main())
