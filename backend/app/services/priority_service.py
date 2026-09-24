from datetime import datetime, timedelta, UTC
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.shelter import ShelterProfile
from backend.app.models.delivery import DeliveryAssignment, DeliveryStatus
from backend.app.models.request import FoodRequest, RequestStatus

def _clamp_score(score: float) -> float:
    return max(0.0, min(100.0, score))

def _check_suspension(shelter: ShelterProfile):
    # This could hypothetically fire events or update user status.
    # For now we log/print for admin review or auto-suspend.
    if shelter.priority_score < 10:
        print(f"SHELTER {shelter.id} auto-suspended due to priority score < 10")
        # In a full system: shelter.status = 'SUSPENDED'
    elif shelter.priority_score < 20:
        print(f"SHELTER {shelter.id} flagged for admin review (score < 20)")

def get_effective_priority(shelter: ShelterProfile) -> float:
    effective = shelter.priority_score
    if shelter.urgency_boost_expires_at and shelter.urgency_boost_expires_at > datetime.now(UTC):
        effective += 20.0
    return effective

async def update_priority_after_delivery(db: AsyncSession, assignment_id: uuid.UUID, is_unsafe: bool = False) -> Optional[ShelterProfile]:
    stmt = select(DeliveryAssignment).where(DeliveryAssignment.id == assignment_id)
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    
    if not assignment:
        return None
        
    stmt_shelter = select(ShelterProfile).where(ShelterProfile.id == assignment.shelter_id)
    shelter = (await db.execute(stmt_shelter)).scalar_one_or_none()
    if not shelter:
        return None

    score_change = 0.0

    if assignment.status == DeliveryStatus.CONFIRMED:
        # confirmed delivery on time (assuming confirmed_at - delivered_at <= 2h)
        if assignment.confirmed_at and assignment.delivered_at:
            confirmed = assignment.confirmed_at.replace(tzinfo=UTC) if assignment.confirmed_at.tzinfo is None else assignment.confirmed_at
            delivered = assignment.delivered_at.replace(tzinfo=UTC) if assignment.delivered_at.tzinfo is None else assignment.delivered_at
            delta_hours = (confirmed - delivered).total_seconds() / 3600.0
            if delta_hours <= 2.0:
                score_change += 5
            else:
                score_change -= 3 # did not confirm delivery within 2 hours
        else:
            score_change += 5 # fallback if timestamps are missing

        # +3 if shelter had an OPEN food request
        stmt_req = select(FoodRequest).where(
            FoodRequest.shelter_id == shelter.id,
            FoodRequest.status == RequestStatus.OPEN
        )
        has_open_req = (await db.execute(stmt_req)).first()
        if has_open_req:
            score_change += 3
            
        # +2 if shelter serves > 50 beneficiaries daily
        if shelter.avg_daily_beneficiaries > 50:
            score_change += 2
            
    if is_unsafe:
        score_change -= 10 # shelter marked food as unsafe after accepting
        
    shelter.priority_score = _clamp_score(shelter.priority_score + score_change)
    _check_suspension(shelter)
    
    await db.commit()
    await db.refresh(shelter)
    return shelter

async def apply_decline_penalty(db: AsyncSession, shelter_id: uuid.UUID, had_reason: bool) -> Optional[ShelterProfile]:
    stmt_shelter = select(ShelterProfile).where(ShelterProfile.id == shelter_id)
    shelter = (await db.execute(stmt_shelter)).scalar_one_or_none()
    if not shelter:
        return None
        
    penalty = 5 if had_reason else 8
    shelter.priority_score = _clamp_score(shelter.priority_score - penalty)
    _check_suspension(shelter)
    
    await db.commit()
    await db.refresh(shelter)
    return shelter

async def apply_urgency_boost(db: AsyncSession, shelter_id: uuid.UUID, hours: int = 24) -> Optional[ShelterProfile]:
    stmt_shelter = select(ShelterProfile).where(ShelterProfile.id == shelter_id)
    shelter = (await db.execute(stmt_shelter)).scalar_one_or_none()
    if not shelter:
        return None
        
    shelter.urgency_boost_expires_at = datetime.now(UTC) + timedelta(hours=hours)
    await db.commit()
    await db.refresh(shelter)
    return shelter
