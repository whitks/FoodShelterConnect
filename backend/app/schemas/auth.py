import uuid
from pydantic import BaseModel
from backend.app.models.user import UserRole

class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: str | None = None
    password: str
    role: UserRole

class LoginRequest(BaseModel):
    phone: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: uuid.UUID
