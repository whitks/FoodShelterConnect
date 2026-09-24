import uuid
from datetime import datetime, UTC
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from fastapi import HTTPException, status
from backend.app.models.user import User

from backend.app.models.donation import Donation, DonationStatus, DonationSource
from backend.app.schemas.donation import DonationCreate
from backend.app.services.food_safety import (
    compute_expires_at, 
    is_donation_viable,
    get_time_remaining_mins,
    get_safety_status
)

def _enrich_donation(donation: Donation) -> dict:
    data = {c.name: getattr(donation, c.name) for c in donation.__table__.columns}
    data["time_remaining_mins"] = get_time_remaining_mins(donation.expires_at)
    data["safety_status"] = get_safety_status(donation.expires_at)
    return data

async def create_donation(db: AsyncSession, donor_id: uuid.UUID, data: DonationCreate) -> dict:
    stmt_user = select(User).where(User.id == donor_id)
    donor = (await db.execute(stmt_user)).scalar_one()

    expires_at = compute_expires_at(
        food_type=data.food_type,
        storage_condition=data.storage_condition,
        prepared_at=data.prepared_at,
        packaged_expiry=data.packaged_expiry
    )
    
    if not donor.is_trusted:
        if not is_donation_viable(expires_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Food window too short for safe delivery"
            )
            
    status_to_set = DonationStatus.POSTED
    if donor.trust_score < 0.3:
        status_to_set = DonationStatus.REVIEW
        
    now = datetime.now(UTC)
    new_donation = Donation(
        donor_id=donor_id,
        food_name=data.food_name,
        food_type=data.food_type,
        quantity_kg=data.quantity_kg,
        portions=data.portions,
        storage_condition=data.storage_condition,
        prepared_at=data.prepared_at,
        posted_at=now,
        expires_at=expires_at,
        pickup_address=data.pickup_address,
        pickup_lat=data.pickup_lat,
        pickup_lng=data.pickup_lng,
        area_zone=data.area_zone,
        status=status_to_set,
        source=DonationSource.APP,
        notes=data.notes
    )
    
    db.add(new_donation)
    await db.commit()
    await db.refresh(new_donation)
    
    return _enrich_donation(new_donation)

async def get_donation(db: AsyncSession, donation_id: uuid.UUID) -> dict:
    stmt = select(Donation).where(Donation.id == donation_id)
    result = await db.execute(stmt)
    donation = result.scalar_one_or_none()
    
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
        
    return _enrich_donation(donation)

async def list_donations(
    db: AsyncSession, 
    status: Optional[DonationStatus] = None, 
    donor_id: Optional[uuid.UUID] = None, 
    skip: int = 0, 
    limit: int = 20
) -> tuple[List[dict], int]:
    stmt = select(Donation)
    if status:
        stmt = stmt.where(Donation.status == status)
    if donor_id:
        stmt = stmt.where(Donation.donor_id == donor_id)
        
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()
    
    stmt = stmt.offset(skip).limit(limit).order_by(Donation.posted_at.desc())
    result = await db.execute(stmt)
    donations = result.scalars().all()
    
    return [_enrich_donation(d) for d in donations], total

async def expire_stale_donations(db: AsyncSession) -> int:
    now = datetime.now(UTC)
    stmt = select(Donation).where(Donation.status == DonationStatus.POSTED, Donation.expires_at <= now)
    stale_donations = (await db.execute(stmt)).scalars().all()
    
    count = 0
    from backend.app.services.trust_service import update_trust_after_expiry
    for d in stale_donations:
        d.status = DonationStatus.EXPIRED
        await update_trust_after_expiry(db, d.id)
        count += 1
        
    await db.commit()
    return count

async def cancel_donation(db: AsyncSession, donation_id: uuid.UUID, user_id: uuid.UUID, is_admin: bool) -> dict:
    stmt = select(Donation).where(Donation.id == donation_id)
    result = await db.execute(stmt)
    donation = result.scalar_one_or_none()
    
    if not donation:
        raise HTTPException(status_code=404, detail="Donation not found")
        
    if donation.donor_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this donation")
        
    if donation.status != DonationStatus.POSTED:
        raise HTTPException(status_code=400, detail="Only POSTED donations can be cancelled")
        
    donation.status = DonationStatus.CANCELLED
    await db.commit()
    return _enrich_donation(donation)
