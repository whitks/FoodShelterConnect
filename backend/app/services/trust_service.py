import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.app.models.user import User, UserRole
from backend.app.models.donation import Donation, DonationStatus

def _clamp_score(score: float) -> float:
    return max(0.0, min(1.0, score))

def _check_trust_flags(donor: User):
    if donor.trust_score >= 0.8:
        donor.is_trusted = True
    else:
        donor.is_trusted = False
        
    if donor.trust_score < 0.1:
        donor.is_active = False
        print(f"DONOR {donor.id} suspended due to trust score < 0.1")

async def update_trust_after_confirmation(db: AsyncSession, donation_id: uuid.UUID) -> Optional[User]:
    stmt_don = select(Donation).where(Donation.id == donation_id)
    donation = (await db.execute(stmt_don)).scalar_one_or_none()
    if not donation: return None
    
    stmt = select(User).where(User.id == donation.donor_id)
    donor = (await db.execute(stmt)).scalar_one_or_none()
    if not donor: return None
    
    # +0.05 for CONFIRMED, but note: they might have received +0.02 for DELIVERED earlier.
    # To keep it simple, we just add 0.05 when CONFIRMED.
    # If the system calls both, they get 0.07. The prompt says:
    # +0.05 -> donation CONFIRMED
    # +0.02 -> donation DELIVERED
    donor.trust_score = _clamp_score(donor.trust_score + 0.05)
    _check_trust_flags(donor)
    
    await db.commit()
    await db.refresh(donor)
    return donor
    
async def update_trust_after_delivered(db: AsyncSession, donation_id: uuid.UUID) -> Optional[User]:
    stmt_don = select(Donation).where(Donation.id == donation_id)
    donation = (await db.execute(stmt_don)).scalar_one_or_none()
    if not donation: return None
    
    stmt = select(User).where(User.id == donation.donor_id)
    donor = (await db.execute(stmt)).scalar_one_or_none()
    if not donor: return None

    donor.trust_score = _clamp_score(donor.trust_score + 0.02)
    _check_trust_flags(donor)
    
    await db.commit()
    await db.refresh(donor)
    return donor

async def update_trust_after_rejection(db: AsyncSession, donation_id: uuid.UUID, reason: str = "food_safety") -> Optional[User]:
    stmt_don = select(Donation).where(Donation.id == donation_id)
    donation = (await db.execute(stmt_don)).scalar_one_or_none()
    if not donation: return None
    
    stmt = select(User).where(User.id == donation.donor_id)
    donor = (await db.execute(stmt)).scalar_one_or_none()
    if not donor: return None
    
    # -0.10 -> donation REJECTED by food safety check
    # -0.15 -> shelter reported food quality issue after accepting
    penalty = 0.15 if reason == "quality_issue" else 0.10
    
    donor.trust_score = _clamp_score(donor.trust_score - penalty)
    _check_trust_flags(donor)
    
    await db.commit()
    await db.refresh(donor)
    return donor

async def update_trust_after_expiry(db: AsyncSession, donation_id: uuid.UUID) -> Optional[User]:
    stmt_don = select(Donation).where(Donation.id == donation_id)
    donation = (await db.execute(stmt_don)).scalar_one_or_none()
    if not donation: return None
    
    stmt = select(User).where(User.id == donation.donor_id)
    donor = (await db.execute(stmt)).scalar_one_or_none()
    if not donor: return None
    
    donor.trust_score = _clamp_score(donor.trust_score - 0.05)
    _check_trust_flags(donor)
    
    await db.commit()
    await db.refresh(donor)
    return donor

async def get_donor_trust_summary(db: AsyncSession, donor_id: uuid.UUID) -> dict:
    stmt = select(User).where(User.id == donor_id, User.role == UserRole.DONOR)
    donor = (await db.execute(stmt)).scalar_one_or_none()
    if not donor:
        return {}
        
    stmt_all = select(func.count(Donation.id)).where(Donation.donor_id == donor_id)
    total_donations = (await db.execute(stmt_all)).scalar() or 0
    
    stmt_conf = select(func.count(Donation.id)).where(Donation.donor_id == donor_id, Donation.status == DonationStatus.CONFIRMED)
    confirmed_count = (await db.execute(stmt_conf)).scalar() or 0
    
    stmt_rej = select(func.count(Donation.id)).where(Donation.donor_id == donor_id, Donation.status == DonationStatus.REJECTED)
    rejected_count = (await db.execute(stmt_rej)).scalar() or 0
    
    stmt_exp = select(func.count(Donation.id)).where(Donation.donor_id == donor_id, Donation.status == DonationStatus.EXPIRED)
    expired_count = (await db.execute(stmt_exp)).scalar() or 0
    
    badge = "GOOD"
    if donor.trust_score >= 0.8: badge = "TRUSTED"
    elif donor.trust_score < 0.1: badge = "SUSPENDED"
    elif donor.trust_score < 0.3: badge = "PROBATION"
    
    return {
        "trust_score": donor.trust_score,
        "is_trusted": donor.is_trusted,
        "total_donations": total_donations,
        "confirmed_count": confirmed_count,
        "rejected_count": rejected_count,
        "expired_count": expired_count,
        "badge": badge
    }
