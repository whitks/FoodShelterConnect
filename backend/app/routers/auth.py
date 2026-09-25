from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database import get_db
from backend.app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from backend.app.services.auth_service import register_user, login_user
from backend.app.utils.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
async def register(
    data: RegisterRequest, 
    db: Annotated[AsyncSession, Depends(get_db)]
):
    user = await register_user(db, data)
    
    # Auto-login after registration with user in response
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    
    user_response = UserResponse(
        id=user.id,
        name=user.name,
        phone=user.phone,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        trust_score=user.trust_score,
        is_trusted=user.is_trusted,
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        user=user_response
    )

@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    return await login_user(db, data)