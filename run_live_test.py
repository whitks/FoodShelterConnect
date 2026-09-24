import asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import Base, engine, async_session_maker
from backend.app.models import user, donation, shelter, request, delivery # Import to register

async def main():
    print("Setting up DB...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    print("\n--- Running API Tests ---")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Register Donor
        res = await client.post("/auth/register", json={
            "name": "Donor Dave",
            "phone": "5551112222",
            "password": "pass",
            "role": "DONOR"
        })
        print(f"Register Donor: {res.status_code}")
        token = res.json().get("access_token")
        
        # Create Donation
        headers = {"Authorization": f"Bearer {token}"}
        res = await client.post("/donations/", json={
            "food_name": "Fresh Pasta",
            "food_type": "COOKED",
            "quantity_kg": 2.0,
            "portions": 4,
            "storage_condition": "REFRIGERATED",
            "prepared_at": "2026-09-24T12:00:00Z",
            "pickup_address": "123 Pasta Lane",
            "pickup_lat": 1.0,
            "pickup_lng": 1.0,
            "area_zone": "North"
        }, headers=headers)
        donation_id = res.json().get('id')
        print(f"Create Donation: {res.status_code} | ID: {donation_id}")
        
        # Register Shelter
        res = await client.post("/auth/register", json={
            "name": "Shelter Sam",
            "phone": "9998887777",
            "password": "pass",
            "role": "SHELTER"
        })
        s_token = res.json().get("access_token")
        s_headers = {"Authorization": f"Bearer {s_token}"}
        
        # Create Profile
        res = await client.post("/shelters/profile", json={
            "ngo_name": "Sam's Shelter",
            "address": "456 Shelter St",
            "lat": 1.1,
            "lng": 1.1,
            "area_zone": "North",
            "avg_daily_beneficiaries": 50
        }, headers=s_headers)
        print(f"Create Shelter Profile: {res.status_code}")
        
        # Request Food
        res = await client.post("/shelters/requests/", json={
            "requested_portions": 70
        }, headers=s_headers)
        print(f"Create Food Request: {res.status_code} | Urgency: {res.json().get('urgency')}")
        
        # Create Admin
        res = await client.post("/auth/register", json={
            "name": "Admin Alice",
            "phone": "0000000000",
            "password": "pass",
            "role": "ADMIN"
        })
        a_token = res.json().get("access_token")
        a_headers = {"Authorization": f"Bearer {a_token}"}
        
        # Trigger rematch manually
        res = await client.post(f"/admin/donations/{donation_id}/rematch", headers=a_headers)
        print(f"Admin Rematch: {res.status_code} | Payload: {res.json()}")
        
        # Check donation status
        res = await client.get(f"/donations/{donation_id}", headers=headers)
        print(f"Donation Status after match: {res.json().get('status')}")
        
        # --- VOLUNTEER WORKFLOW ---
        print("\n--- VOLUNTEER WORKFLOW ---")
        # 1. Register Volunteer
        res = await client.post("/auth/register", json={
            "name": "Volunteer Vic",
            "phone": "5555555555",
            "password": "pass",
            "role": "VOLUNTEER"
        })
        v_token = res.json().get("access_token")
        v_headers = {"Authorization": f"Bearer {v_token}"}
        
        # 2. Create Profile
        res = await client.post("/volunteers/profile", json={
            "vehicle_type": "BIKE"
        }, headers=v_headers)
        print(f"Create Volunteer Profile: {res.status_code}")
        
        # 3. Toggle Online and Location
        await client.patch("/volunteers/location", json={"lat": 1.15, "lng": 1.15}, headers=v_headers)
        await client.patch("/volunteers/online", json={"online": True}, headers=v_headers)
        
        # 4. Get Available Jobs
        res = await client.get("/volunteers/jobs/available", headers=v_headers)
        jobs = res.json()
        print(f"Available Jobs for Vic: {len(jobs)}")
        
        if jobs:
            job = jobs[0]
            assignment_id = job["id"]
            print(f"Vic sees job {assignment_id} at distance {job['distance_km']:.2f}km")
            
            # 5. Accept Job
            res = await client.post(f"/volunteers/jobs/{assignment_id}/accept", headers=v_headers)
            print(f"Accept Job: {res.status_code} | {res.json()}")
            
            # 6. Try accepting again (should fail)
            res = await client.post(f"/volunteers/jobs/{assignment_id}/accept", headers=v_headers)
            print(f"Accept Job again: {res.status_code} | {res.json()}")
            
            # 7. Picked Up
            res = await client.post(f"/volunteers/jobs/{assignment_id}/picked-up", headers=v_headers)
            print(f"Picked Up Job: {res.status_code} | {res.json()}")
            
            # 8. Delivered
            res = await client.post(f"/volunteers/jobs/{assignment_id}/delivered", headers=v_headers)
            print(f"Delivered Job: {res.status_code} | {res.json()}")
            
            # 9. Shelter Confirms
            res = await client.post(f"/shelters/assignments/{assignment_id}/confirm", headers=s_headers)
            print(f"Shelter Confirmed: {res.status_code} | {res.json()}")
            
            # Check donation status
            res = await client.get(f"/donations/{donation_id}", headers=headers)
            print(f"Final Donation Status: {res.json().get('status')}")
            
            # 10. Check Donor Trust Score
            res = await client.get("/donors/me/trust", headers=headers)
            print(f"Donor Trust Summary: {res.status_code} | {res.json()}")
            
            # 11. Run Forecast
            print("\n--- AI SERVICE FORECAST ---")
            from backend.app.services.ai_service import run_nightly_forecasts
            async with async_session_maker() as session:
                await run_nightly_forecasts(session)
                
            admin_headers = {"Authorization": "Bearer admin_token_here"} # hack
            # wait, we don't have an admin token, let's just create one or query DB directly
            async with async_session_maker() as session:
                from sqlalchemy import select
                from backend.app.models.shelter import DemandForecast
                stmt = select(DemandForecast)
                forecasts = (await session.execute(stmt)).scalars().all()
                for f in forecasts:
                    print(f"Forecast for Shelter {f.shelter_id}: {f.predicted_portions} portions | Confidence: {f.confidence} | Note: {f.note}")
                    
            # 12. Check match explanation
            async with async_session_maker() as session:
                from backend.app.models.delivery import DeliveryAssignment
                stmt = select(DeliveryAssignment).where(DeliveryAssignment.donation_id == uuid.UUID(donation_id))
                da = (await session.execute(stmt)).scalar_one()
                print(f"Match Explanation: {da.match_explanation}")
            
    print("\nCleaning up...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        
if __name__ == "__main__":
    asyncio.run(main())
