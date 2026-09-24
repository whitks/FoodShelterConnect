from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from backend.app.models.user import User
from backend.app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from backend.app.utils.auth import hash_password, verify_password, create_access_token

async def register_user(db: AsyncSession, data: RegisterRequest) -> User:
    stmt = select(User).where(User.phone == data.phone)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
        
    if data.email:
        stmt = select(User).where(User.email == data.email)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    hashed_pw = hash_password(data.password)
    new_user = User(
        name=data.name,
        phone=data.phone,
        email=data.email,
        password_hash=hashed_pw,
        role=data.role
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user

async def login_user(db: AsyncSession, data: LoginRequest) -> TokenResponse:
    stmt = select(User).where(User.phone == data.phone)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated"
        )

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id
    )
