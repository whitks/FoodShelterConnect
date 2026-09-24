import math
import uuid
from typing import Optional
from datetime import datetime, timedelta, UTC
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.donation import Donation, DonationStatus
from backend.app.models.shelter import ShelterProfile
from backend.app.models.request import FoodRequest, RequestStatus
from backend.app.models.delivery import DeliveryAssignment, DeliveryStatus
from backend.app.services.priority_service import get_effective_priority

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def score_shelter(donation: Donation, shelter: ShelterProfile) -> float:
    distance = haversine_distance(donation.pickup_lat, donation.pickup_lng, shelter.lat, shelter.lng)
    distance_score = 1.0 / (distance + 1.0)
    
    if shelter.last_received_at:
        hours_since = (datetime.now(UTC) - shelter.last_received_at.replace(tzinfo=UTC)).total_seconds() / 3600.0
    else:
        hours_since = 24.0
    
    fairness_score = min(hours_since / 24.0, 1.0)
    
    donation_portions = donation.portions or 1
    need_score = min(shelter.current_capacity, donation_portions) / float(donation_portions)
    
    priority_score = get_effective_priority(shelter) / 100.0
    
    match_score = (
        0.25 * distance_score +
        0.35 * fairness_score +
        0.25 * need_score +
        0.15 * priority_score
    )
    return match_score

async def find_best_shelter(db: AsyncSession, donation: Donation) -> tuple[Optional[ShelterProfile], float]:
    stmt = select(ShelterProfile).where(ShelterProfile.current_capacity > 0)
    # Note: assuming all ShelterProfiles are "active" as we have no status column yet,
    # or the user meant checking capacity > 0 implies active.
    result = await db.execute(stmt)
    all_shelters = result.scalars().all()
    
    # Get all shelters with OPEN FoodRequests
    req_stmt = select(FoodRequest.shelter_id).where(FoodRequest.status == RequestStatus.OPEN)
    open_request_shelters = set((await db.execute(req_stmt)).scalars().all())
    
    now = datetime.now(UTC)
    six_hours = timedelta(hours=6)
    
    eligible = []
    for s in all_shelters:
        has_open_request = s.id in open_request_shelters
        not_received_recently = (s.last_received_at is None) or ((now - s.last_received_at.replace(tzinfo=UTC)) > six_hours)
        
        if has_open_request or not_received_recently:
            eligible.append(s)
            
    # STEP 1: Filter local first
    local_shelters = [s for s in eligible if donation.area_zone and s.area_zone == donation.area_zone]
    
    # STEP 2: Expand if no local found
    candidate_shelters = local_shelters if local_shelters else eligible
    
    if not candidate_shelters:
        return None, 0.0
        
    # STEP 3: Score and pick best
    best_shelter = None
    best_score = -1.0
    
    for shelter in candidate_shelters:
        score = score_shelter(donation, shelter)
        if score > best_score:
            best_score = score
            best_shelter = shelter
            
    return best_shelter, best_score

async def run_matching(db: AsyncSession, donation_id: uuid.UUID) -> Optional[DeliveryAssignment]:
    # Fetch donation
    stmt = select(Donation).where(Donation.id == donation_id, Donation.status == DonationStatus.POSTED)
    donation = (await db.execute(stmt)).scalar_one_or_none()
    
    if not donation:
        return None # Either doesn't exist, or already matched/cancelled/expired
        
    best_shelter, best_score = await find_best_shelter(db, donation)
    
    if not best_shelter:
        # STEP 5: Leave open
        print(f"No eligible shelter found for donation {donation_id}")
        return None
        
    # Generate explanation
    from backend.app.services.ai_service import explain_match
    
    don_dict = {
        "food_name": donation.food_name,
        "portions": donation.portions,
        "time_remaining_mins": 0 # simplified, since we didn't inject the actual remaining mins here easily, wait we can
    }
    from backend.app.services.food_safety import get_time_remaining_mins
    don_dict["time_remaining_mins"] = get_time_remaining_mins(donation.expires_at)
    
    shel_dict = {
        "ngo_name": best_shelter.ngo_name,
        "avg_daily_beneficiaries": best_shelter.avg_daily_beneficiaries,
        "priority_score": best_shelter.priority_score,
        "last_received_at": best_shelter.last_received_at
    }
    
    explanation = explain_match(don_dict, shel_dict, best_score)
        
    # STEP 4: Create DeliveryAssignment
    donation.status = DonationStatus.MATCHED
    
    delivery = DeliveryAssignment(
        donation_id=donation.id,
        shelter_id=best_shelter.id,
        assigned_at=datetime.now(UTC),
        status=DeliveryStatus.PENDING,
        match_explanation=explanation
    )
    
    best_shelter.last_received_at = datetime.now(UTC)
    
    db.add(delivery)
    await db.commit()
    await db.refresh(delivery)
    
    return delivery
