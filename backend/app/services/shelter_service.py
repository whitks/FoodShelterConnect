import uuid
from datetime import datetime, UTC
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from typing import List

from backend.app.models.shelter import ShelterProfile
from backend.app.models.request import FoodRequest, RequestUrgency, RequestStatus
from backend.app.schemas.shelter import ShelterProfileCreate, ShelterProfileUpdate, FoodRequestCreate

async def get_shelter_by_user(db: AsyncSession, user_id: uuid.UUID) -> ShelterProfile:
    stmt = select(ShelterProfile).where(ShelterProfile.user_id == user_id)
    result = await db.execute(stmt)
    shelter = result.scalar_one_or_none()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter profile not found")
    return shelter

async def create_shelter_profile(db: AsyncSession, user_id: uuid.UUID, data: ShelterProfileCreate) -> ShelterProfile:
    stmt = select(ShelterProfile).where(ShelterProfile.user_id == user_id)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Shelter profile already exists for this user")
        
    shelter = ShelterProfile(
        user_id=user_id,
        ngo_name=data.ngo_name,
        address=data.address,
        lat=data.lat,
        lng=data.lng,
        area_zone=data.area_zone,
        avg_daily_beneficiaries=data.avg_daily_beneficiaries,
        current_capacity=data.avg_daily_beneficiaries,
        priority_score=50.0
    )
    db.add(shelter)
    await db.commit()
    await db.refresh(shelter)
    return shelter

async def update_capacity(db: AsyncSession, shelter_id: uuid.UUID, data: ShelterProfileUpdate) -> ShelterProfile:
    stmt = select(ShelterProfile).where(ShelterProfile.id == shelter_id)
    shelter = (await db.execute(stmt)).scalar_one_or_none()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter profile not found")
        
    if data.current_capacity is not None:
        shelter.current_capacity = data.current_capacity
    if data.avg_daily_beneficiaries is not None:
        shelter.avg_daily_beneficiaries = data.avg_daily_beneficiaries
        
    await db.commit()
    await db.refresh(shelter)
    return shelter

async def create_food_request(db: AsyncSession, shelter_id: uuid.UUID, data: FoodRequestCreate) -> FoodRequest:
    stmt = select(ShelterProfile).where(ShelterProfile.id == shelter_id)
    shelter = (await db.execute(stmt)).scalar_one_or_none()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter profile not found")
        
    portions = data.requested_portions or 0
    urgency = RequestUrgency.NORMAL
    if portions > shelter.avg_daily_beneficiaries * 1.3:
        urgency = RequestUrgency.HIGH
        
    req = FoodRequest(
        shelter_id=shelter_id,
        requested_portions=data.requested_portions,
        requested_quantity_kg=data.requested_quantity_kg,
        urgency=urgency,
        reason=data.reason,
        source=data.source,
        status=RequestStatus.OPEN,
        created_at=datetime.now(UTC)
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req

async def get_food_requests_by_shelter(db: AsyncSession, shelter_id: uuid.UUID) -> List[FoodRequest]:
    stmt = select(FoodRequest).where(FoodRequest.shelter_id == shelter_id).order_by(FoodRequest.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_food_request(db: AsyncSession, request_id: uuid.UUID, shelter_id: uuid.UUID) -> FoodRequest:
    stmt = select(FoodRequest).where(FoodRequest.id == request_id, FoodRequest.shelter_id == shelter_id)
    req = (await db.execute(stmt)).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return req

async def list_all_shelters(db: AsyncSession) -> List[ShelterProfile]:
    stmt = select(ShelterProfile).order_by(ShelterProfile.priority_score.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_shelter_by_id(db: AsyncSession, shelter_id: uuid.UUID) -> ShelterProfile:
    stmt = select(ShelterProfile).where(ShelterProfile.id == shelter_id)
    result = await db.execute(stmt)
    shelter = result.scalar_one_or_none()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")
    return shelter
