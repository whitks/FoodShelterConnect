import uuid
from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import require_role
from backend.app.models.user import User
from backend.app.schemas.shelter import (
    ShelterProfileCreate, ShelterProfileUpdate, ShelterProfileResponse,
    FoodRequestCreate, FoodRequestResponse, DeclineRequest
)
from backend.app.services import shelter_service, priority_service
from backend.app.services import matching_service
from backend.app.models.delivery import DeliveryAssignment, DeliveryStatus
from sqlalchemy import select

router = APIRouter(prefix="/shelters", tags=["shelters"])
admin_router = APIRouter(prefix="/admin/shelters", tags=["admin_shelters"])

# --- SHELTER ROUTES ---

@router.post("/profile", response_model=ShelterProfileResponse)
async def create_profile(
    data: ShelterProfileCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("SHELTER"))]
):
    return await shelter_service.create_shelter_profile(db, current_user.id, data)

@router.get("/profile/me", response_model=ShelterProfileResponse)
async def get_profile(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("SHELTER"))]
):
    return await shelter_service.get_shelter_by_user(db, current_user.id)

@router.patch("/profile/me", response_model=ShelterProfileResponse)
async def update_profile_capacity(
    data: ShelterProfileUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("SHELTER"))]
):
    shelter = await shelter_service.get_shelter_by_user(db, current_user.id)
    return await shelter_service.update_capacity(db, shelter.id, data)

@router.post("/requests/", response_model=FoodRequestResponse)
async def create_request(
    data: FoodRequestCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("SHELTER"))]
):
    shelter = await shelter_service.get_shelter_by_user(db, current_user.id)
    return await shelter_service.create_food_request(db, shelter.id, data)

@router.get("/requests/", response_model=List[FoodRequestResponse])
async def list_requests(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("SHELTER"))]
):
    shelter = await shelter_service.get_shelter_by_user(db, current_user.id)
    return await shelter_service.get_food_requests_by_shelter(db, shelter.id)

@router.get("/requests/{id}", response_model=FoodRequestResponse)
async def get_single_request(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("SHELTER"))]
):
    shelter = await shelter_service.get_shelter_by_user(db, current_user.id)
    return await shelter_service.get_food_request(db, id, shelter.id)

@router.patch("/requests/{id}/decline")
async def decline_matched_donation(
    id: uuid.UUID,
    data: DeclineRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("SHELTER"))]
):
    shelter = await shelter_service.get_shelter_by_user(db, current_user.id)
    
    # id is the DeliveryAssignment.id
    stmt = select(DeliveryAssignment).where(DeliveryAssignment.id == id, DeliveryAssignment.shelter_id == shelter.id)
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    
    if not assignment or assignment.status != DeliveryStatus.PENDING:
        raise HTTPException(status_code=400, detail="Invalid assignment or already processed")
        
    assignment.status = DeliveryStatus.DECLINED
    await db.commit()
    
    had_reason = bool(data.reason and data.reason.strip())
    await priority_service.apply_decline_penalty(db, shelter.id, had_reason)
    
    # Re-trigger matching on the linked donation (since it was declined, it is open again)
    # Actually, matching_service run_matching requires the donation to be in POSTED status.
    # We should set it to POSTED first, then run matching.
    from backend.app.models.donation import Donation, DonationStatus
    stmt_don = select(Donation).where(Donation.id == assignment.donation_id)
    donation = (await db.execute(stmt_don)).scalar_one()
    donation.status = DonationStatus.POSTED
    await db.commit()
    
    background_tasks.add_task(matching_service.run_matching, db, donation.id)
    
    return {"message": "Declined successfully and penalty applied."}

@router.post("/assignments/{id}/confirm")
async def confirm_delivery(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("SHELTER"))]
):
    shelter = await shelter_service.get_shelter_by_user(db, current_user.id)
    
    stmt = select(DeliveryAssignment).where(DeliveryAssignment.id == id, DeliveryAssignment.shelter_id == shelter.id)
    assignment = (await db.execute(stmt)).scalar_one_or_none()
    
    if not assignment or assignment.status != DeliveryStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Invalid assignment state")
        
    import datetime
    assignment.status = DeliveryStatus.CONFIRMED
    assignment.confirmed_at = datetime.datetime.now(datetime.UTC)
    
    from backend.app.models.donation import Donation, DonationStatus
    stmt_don = select(Donation).where(Donation.id == assignment.donation_id)
    donation = (await db.execute(stmt_don)).scalar_one()
    donation.status = DonationStatus.CONFIRMED
    
    if assignment.volunteer_id:
        from backend.app.models.volunteer import VolunteerProfile
        stmt_vol = select(VolunteerProfile).where(VolunteerProfile.user_id == assignment.volunteer_id)
        vol = (await db.execute(stmt_vol)).scalar_one_or_none()
        if vol:
            vol.total_deliveries += 1
            
    await db.commit()
    
    await priority_service.update_priority_after_delivery(db, assignment.id)
    from backend.app.services.trust_service import update_trust_after_confirmation
    await update_trust_after_confirmation(db, donation.id)
    return {"message": "Confirmed delivery successfully"}

# --- ADMIN ROUTES ---

@admin_router.get("/", response_model=List[ShelterProfileResponse])
async def admin_list_shelters(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("ADMIN"))]
):
    return await shelter_service.list_all_shelters(db)

@admin_router.get("/{id}", response_model=ShelterProfileResponse)
async def admin_get_shelter(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("ADMIN"))]
):
    return await shelter_service.get_shelter_by_id(db, id)
