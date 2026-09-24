import uuid
from typing import Annotated, List
from fastapi import APIRouter, Depends

from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import require_role
from backend.app.models.user import User
from backend.app.schemas.volunteer import (
    VolunteerProfileCreate, VolunteerProfileResponse,
    LocationUpdate, OnlineUpdate, AvailableJobResponse
)
from backend.app.services import volunteer_service

router = APIRouter(prefix="/volunteers", tags=["volunteers"])

@router.post("/profile", response_model=VolunteerProfileResponse)
async def create_profile(
    data: VolunteerProfileCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("VOLUNTEER"))]
):
    return await volunteer_service.create_profile(db, current_user.id, data)

@router.patch("/location", response_model=VolunteerProfileResponse)
async def update_location(
    data: LocationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("VOLUNTEER"))]
):
    return await volunteer_service.update_location(db, current_user.id, data)

@router.patch("/online", response_model=VolunteerProfileResponse)
async def toggle_online(
    data: OnlineUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("VOLUNTEER"))]
):
    return await volunteer_service.toggle_online(db, current_user.id, data)

@router.get("/jobs/available", response_model=List[AvailableJobResponse])
async def list_available_jobs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("VOLUNTEER"))]
):
    return await volunteer_service.get_available_jobs(db, current_user.id)

@router.post("/jobs/{assignment_id}/accept")
async def accept_job(
    assignment_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("VOLUNTEER"))]
):
    return await volunteer_service.accept_job(db, current_user.id, assignment_id)

@router.post("/jobs/{assignment_id}/picked-up")
async def picked_up_job(
    assignment_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("VOLUNTEER"))]
):
    return await volunteer_service.mark_picked_up(db, current_user.id, assignment_id)

@router.post("/jobs/{assignment_id}/delivered")
async def delivered_job(
    assignment_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("VOLUNTEER"))]
):
    return await volunteer_service.mark_delivered(db, current_user.id, assignment_id)

@router.get("/jobs/my")
async def list_my_jobs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("VOLUNTEER"))]
):
    return await volunteer_service.get_my_jobs(db, current_user.id)
