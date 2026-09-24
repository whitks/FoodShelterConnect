import uuid
import enum
from datetime import datetime, UTC
from sqlalchemy import String, Float, Boolean, DateTime, Enum as SQLEnum, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from backend.app.database import Base

class UserRole(enum.Enum):
    DONOR = "DONOR"
    SHELTER = "SHELTER"
    VOLUNTEER = "VOLUNTEER"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=text("now()"))
    trust_score: Mapped[float] = mapped_column(Float, default=1.0, server_default=text("1.0"))

    shelter_profile = relationship("ShelterProfile", back_populates="user", uselist=False)
