from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from backend.app.services.auth_service import register_user, login_user
from backend.app.utils.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
async def register(
    data: RegisterRequest, 
    db: Annotated[AsyncSession, Depends(get_db)]
):
    user = await register_user(db, data)
    
    # Auto-login after registration
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id
    )

@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    return await login_user(db, data)
