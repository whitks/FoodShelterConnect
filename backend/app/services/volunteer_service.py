import uuid
from typing import Optional, List
from datetime import datetime, UTC
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException

from backend.app.models.volunteer import VolunteerProfile
from backend.app.schemas.volunteer import VolunteerProfileCreate, LocationUpdate, OnlineUpdate
from backend.app.models.delivery import DeliveryAssignment, DeliveryStatus
from backend.app.models.donation import Donation, DonationStatus
from backend.app.models.shelter import ShelterProfile
from backend.app.services.matching_service import haversine_distance
from backend.app.services.food_safety import get_time_remaining_mins

async def create_profile(db: AsyncSession, user_id: uuid.UUID, data: VolunteerProfileCreate) -> VolunteerProfile:
    # check exists
    stmt = select(VolunteerProfile).where(VolunteerProfile.user_id == user_id)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists")
        
    profile = VolunteerProfile(
        user_id=user_id,
        vehicle_type=data.vehicle_type,
        is_online=False
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile

async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> VolunteerProfile:
    stmt = select(VolunteerProfile).where(VolunteerProfile.user_id == user_id)
    profile = (await db.execute(stmt)).scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Volunteer profile not found")
    return profile

async def update_location(db: AsyncSession, user_id: uuid.UUID, data: LocationUpdate) -> VolunteerProfile:
    profile = await get_profile(db, user_id)
    profile.current_lat = data.lat
    profile.current_lng = data.lng
    profile.last_location_update = datetime.now(UTC)
    await db.commit()
    await db.refresh(profile)
    return profile

async def toggle_online(db: AsyncSession, user_id: uuid.UUID, data: OnlineUpdate) -> VolunteerProfile:
    profile = await get_profile(db, user_id)
    profile.is_online = data.online
    await db.commit()
    await db.refresh(profile)
    return profile

async def get_available_jobs(db: AsyncSession, user_id: uuid.UUID) -> List[dict]:
    profile = await get_profile(db, user_id)
    if not profile.is_online or profile.current_lat is None or profile.current_lng is None:
        return []
        
    stmt = select(DeliveryAssignment, Donation, ShelterProfile).join(
        Donation, DeliveryAssignment.donation_id == Donation.id
    ).join(
        ShelterProfile, DeliveryAssignment.shelter_id == ShelterProfile.id
    ).where(
        DeliveryAssignment.status == DeliveryStatus.PENDING,
        DeliveryAssignment.volunteer_id == None
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    jobs = []
    for assignment, donation, shelter in rows:
        distance = haversine_distance(profile.current_lat, profile.current_lng, donation.pickup_lat, donation.pickup_lng)
        
        job_data = {
            "id": assignment.id,
            "donation_id": donation.id,
            "shelter_id": shelter.id,
            "assigned_at": assignment.assigned_at,
            "status": assignment.status,
            "distance_km": distance,
            "pickup_address": donation.pickup_address,
            "shelter_address": shelter.address,
            "portions": donation.portions or 1,
            "expires_at": donation.expires_at,
            "time_remaining_mins": get_time_remaining_mins(donation.expires_at)
        }
        jobs.append(job_data)
        
    jobs.sort(key=lambda x: x["distance_km"])
    return jobs

async def check_active_jobs(db: AsyncSession, user_id: uuid.UUID):
    stmt = select(DeliveryAssignment).where(
        DeliveryAssignment.volunteer_id == user_id,
        or_(DeliveryAssignment.status == DeliveryStatus.ACCEPTED, DeliveryAssignment.status == DeliveryStatus.PICKED_UP)
    )
    active = (await db.execute(stmt)).first()
    if active:
        raise HTTPException(status_code=400, detail="You already have an active delivery assignment. Finish it first.")

async def accept_job(db: AsyncSession, user_id: uuid.UUID, assignment_id: uuid.UUID):
    profile = await get_profile(db, user_id) # ensure they are a volunteer
    await check_active_jobs(db, user_id)
    
    stmt = select(DeliveryAssignment).where(DeliveryAssignment.id == assignment_id)
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    if assignment.volunteer_id is not None or assignment.status != DeliveryStatus.PENDING:
        raise HTTPException(status_code=400, detail="Assignment already taken or not available")
        
    assignment.volunteer_id = user_id
    assignment.status = DeliveryStatus.ACCEPTED
    
    stmt_don = select(Donation).where(Donation.id == assignment.donation_id)
    donation = (await db.execute(stmt_don)).scalar_one()
    donation.status = DonationStatus.ACCEPTED
    
    await db.commit()
    return {"message": "Job accepted"}

async def mark_picked_up(db: AsyncSession, user_id: uuid.UUID, assignment_id: uuid.UUID):
    stmt = select(DeliveryAssignment).where(DeliveryAssignment.id == assignment_id, DeliveryAssignment.volunteer_id == user_id)
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    
    if not assignment or assignment.status != DeliveryStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Invalid assignment state")
        
    assignment.status = DeliveryStatus.PICKED_UP
    assignment.picked_up_at = datetime.now(UTC)
    
    stmt_don = select(Donation).where(Donation.id == assignment.donation_id)
    donation = (await db.execute(stmt_don)).scalar_one()
    donation.status = DonationStatus.PICKED_UP
    
    await db.commit()
    return {"message": "Marked as picked up"}

async def mark_delivered(db: AsyncSession, user_id: uuid.UUID, assignment_id: uuid.UUID):
    stmt = select(DeliveryAssignment).where(DeliveryAssignment.id == assignment_id, DeliveryAssignment.volunteer_id == user_id)
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    
    if not assignment or assignment.status != DeliveryStatus.PICKED_UP:
        raise HTTPException(status_code=400, detail="Invalid assignment state")
        
    assignment.status = DeliveryStatus.DELIVERED
    assignment.delivered_at = datetime.now(UTC)
    
    stmt_don = select(Donation).where(Donation.id == assignment.donation_id)
    donation = (await db.execute(stmt_don)).scalar_one()
    donation.status = DonationStatus.DELIVERED
    
    await db.commit()
    
    from backend.app.services.trust_service import update_trust_after_delivered
    await update_trust_after_delivered(db, donation.id)
    
    return {"message": "Marked as delivered"}
    
async def get_my_jobs(db: AsyncSession, user_id: uuid.UUID):
    stmt = select(DeliveryAssignment).where(DeliveryAssignment.volunteer_id == user_id).order_by(DeliveryAssignment.assigned_at.desc())
    return (await db.execute(stmt)).scalars().all()
