import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db, async_session_maker
from backend.app.dependencies import get_current_user, require_role
from backend.app.models.user import User
from backend.app.models.donation import DonationStatus
from backend.app.schemas.donation import DonationCreate, DonationResponse, DonationListResponse
from backend.app.services import donation_service

router = APIRouter(prefix="/donations", tags=["donations"])

@router.post("/", response_model=DonationResponse)
async def create(
    data: DonationCreate,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("DONOR"))]
):
    donation = await donation_service.create_donation(db, current_user.id, data)
    
    # Run the expiration task in the background using a fresh DB session
    async def bg_expire_task():
        async with async_session_maker() as session:
            await donation_service.expire_stale_donations(session)
            
    background_tasks.add_task(bg_expire_task)
    
    # Run the matching algorithm automatically
    if donation["status"] == DonationStatus.POSTED.value or donation["status"] == DonationStatus.POSTED:
        async def bg_match_task():
            async with async_session_maker() as session:
                from backend.app.services.matching_service import run_matching
                await run_matching(session, donation["id"])
                
        background_tasks.add_task(bg_match_task)
    
    return donation

@router.get("/", response_model=DonationListResponse)
async def list_all(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    status: Optional[DonationStatus] = None,
    skip: int = 0,
    limit: int = 20
):
    donor_id = None
    if current_user.role.value != "ADMIN":
        donor_id = current_user.id
        
    items, total = await donation_service.list_donations(db, status, donor_id, skip, limit)
    return {"items": items, "total": total}

@router.get("/{id}", response_model=DonationResponse)
async def get_single(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    donation = await donation_service.get_donation(db, id)
    if current_user.role.value != "ADMIN" and donation["donor_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return donation

@router.patch("/{id}/cancel", response_model=DonationResponse)
async def cancel(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    is_admin = current_user.role.value == "ADMIN"
    return await donation_service.cancel_donation(db, id, current_user.id, is_admin)
