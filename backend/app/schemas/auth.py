import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator
from backend.app.models.user import UserRole

class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: str | None = None
    password: str
    role: UserRole

class LoginRequest(BaseModel):
    email: str | None = None
    phone: str | None = None
    password: str

    @field_validator('email', 'phone')
    @classmethod
    def at_least_one_contact(cls, v, info):
        if v is None and info.data.get('email') is None and info.data.get('phone') is None:
            raise ValueError('Either email or phone must be provided')
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: uuid.UUID
    user: "UserResponse"

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str
    email: str | None = None
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    trust_score: float
    is_trusted: bool

    @field_validator('role', mode='before')
    @classmethod
    def role_to_lowercase(cls, v):
        if isinstance(v, UserRole):
            return v.value.lower()
        if isinstance(v, str):
            return v.lower()
        return v

    class Config:
        from_attributes = True

class UserUpdateRequest(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None

# Resolve forward reference
TokenResponse.model_rebuild()