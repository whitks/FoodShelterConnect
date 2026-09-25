import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from fastapi import HTTPException, status
from backend.app.models.user import User
from backend.app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserUpdateRequest, UserResponse
from backend.app.utils.auth import hash_password, verify_password, create_access_token

async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def update_user(db: AsyncSession, user_id: uuid.UUID, data: UserUpdateRequest) -> User:
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    if data.name is not None:
        user.name = data.name
    if data.phone is not None:
        stmt = select(User).where(User.phone == data.phone, User.id != user_id)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already in use")
        user.phone = data.phone
    if data.email is not None:
        stmt = select(User).where(User.email == data.email, User.id != user_id)
        result = await db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
        user.email = data.email
    
    await db.commit()
    await db.refresh(user)
    return user

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
    stmt = select(User)
    if data.email:
        stmt = stmt.where(User.email == data.email)
    elif data.phone:
        stmt = stmt.where(User.phone == data.phone)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either email or phone must be provided"
        )
    
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated"
        )

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