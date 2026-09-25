import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from typing import Optional

from backend.app.models.donor import DonorProfile
from backend.app.schemas.donor import DonorProfileCreate, DonorProfileUpdate

async def get_donor_by_user(db: AsyncSession, user_id: uuid.UUID) -> DonorProfile:
    stmt = select(DonorProfile).where(DonorProfile.user_id == user_id)
    result = await db.execute(stmt)
    donor = result.scalar_one_or_none()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor profile not found")
    return donor

async def create_donor_profile(db: AsyncSession, user_id: uuid.UUID, data: DonorProfileCreate) -> DonorProfile:
    stmt = select(DonorProfile).where(DonorProfile.user_id == user_id)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Donor profile already exists for this user")
        
    donor = DonorProfile(
        user_id=user_id,
        business_name=data.business_name,
        business_type=data.business_type,
        address=data.address,
        city=data.city,
        pincode=data.pincode,
        latitude=data.latitude,
        longitude=data.longitude,
        pickup_window_start=data.pickup_window_start,
        pickup_window_end=data.pickup_window_end,
    )
    db.add(donor)
    await db.commit()
    await db.refresh(donor)
    return donor

async def update_donor_profile(db: AsyncSession, donor_id: uuid.UUID, data: DonorProfileUpdate) -> DonorProfile:
    stmt = select(DonorProfile).where(DonorProfile.id == donor_id)
    donor = (await db.execute(stmt)).scalar_one_or_none()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor profile not found")
        
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(donor, field, value)
        
    await db.commit()
    await db.refresh(donor)
    return donor

async def get_donor_by_id(db: AsyncSession, donor_id: uuid.UUID) -> DonorProfile:
    stmt = select(DonorProfile).where(DonorProfile.id == donor_id)
    donor = (await db.execute(stmt)).scalar_one_or_none()
    if not donor:
        raise HTTPException(status_code=404, detail="Donor profile not found")
    return donor