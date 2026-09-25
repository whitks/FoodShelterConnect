import uuid
from typing import Annotated, List
from fastapi import APIRouter, Depends

from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import require_role
from backend.app.models.user import User, UserRole
from backend.app.schemas.donor import DonorProfileCreate, DonorProfileUpdate, DonorProfileResponse
from backend.app.services import trust_service, donor_service
from sqlalchemy import select

router = APIRouter(prefix="/donors", tags=["donors"])
admin_router = APIRouter(prefix="/admin/donors", tags=["admin_donors"])

@router.post("/profile", response_model=DonorProfileResponse)
async def create_profile(
    data: DonorProfileCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("DONOR"))]
):
    return await donor_service.create_donor_profile(db, current_user.id, data)

@router.get("/profile/me", response_model=DonorProfileResponse)
async def get_profile(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("DONOR"))]
):
    return await donor_service.get_donor_by_user(db, current_user.id)

@router.patch("/profile/me", response_model=DonorProfileResponse)
async def update_profile(
    data: DonorProfileUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("DONOR"))]
):
    donor = await donor_service.get_donor_by_user(db, current_user.id)
    return await donor_service.update_donor_profile(db, donor.id, data)

@router.get("/me/trust")
async def get_my_trust_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("DONOR"))]
):
    return await trust_service.get_donor_trust_summary(db, current_user.id)

@admin_router.get("/flagged")
async def get_flagged_donors(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("ADMIN"))]
):
    stmt = select(User).where(User.role == UserRole.DONOR, User.trust_score < 0.3)
    users = (await db.execute(stmt)).scalars().all()
    
    res = []
    for u in users:
        summary = await trust_service.get_donor_trust_summary(db, u.id)
        summary["id"] = u.id
        summary["name"] = u.name
        res.append(summary)
    return res

@admin_router.get("/{id}/trust")
async def get_donor_trust(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("ADMIN"))]
):
    return await trust_service.get_donor_trust_summary(db, id)
