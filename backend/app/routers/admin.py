import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.database import get_db
from backend.app.dependencies import require_role
from backend.app.models.user import User
from backend.app.services import matching_service

router = APIRouter(prefix="/admin/donations", tags=["admin_matching"])

@router.post("/{id}/rematch")
async def trigger_rematch(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("ADMIN"))]
):
    assignment = await matching_service.run_matching(db, id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Rematch failed. No eligible shelter found or donation not in POSTED status.")
        
    return {"message": "Rematched successfully", "delivery_id": assignment.id, "shelter_id": assignment.shelter_id}

from datetime import datetime, UTC, timedelta
from sqlalchemy import select, desc
from backend.app.models.shelter import DemandForecast, ShelterProfile

forecast_router = APIRouter(prefix="/admin", tags=["admin_forecast"])

@forecast_router.get("/shelters/{id}/forecast")
async def get_latest_forecast(
    id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("ADMIN"))]
):
    stmt = select(DemandForecast).where(DemandForecast.shelter_id == id).order_by(desc(DemandForecast.forecast_date)).limit(1)
    forecast = (await db.execute(stmt)).scalar_one_or_none()
    if not forecast:
        raise HTTPException(status_code=404, detail="No forecast found for this shelter")
    return forecast

@forecast_router.get("/forecasts/tomorrow")
async def get_tomorrow_forecasts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role("ADMIN"))]
):
    tomorrow = (datetime.now(UTC) + timedelta(days=1)).date()
    # We compare forecast_date date part, in sqlite we might need string comp or just fetch all recent
    # For simplicity, we just fetch the most recent forecast per shelter (assuming the cron job runs nightly)
    # Group by is tricky in sqlite without distinct on. We'll just fetch all forecasts generated in the last 24h.
    yesterday = datetime.now(UTC) - timedelta(hours=24)
    stmt = select(DemandForecast).where(DemandForecast.created_at >= yesterday)
    forecasts = (await db.execute(stmt)).scalars().all()
    return forecasts
