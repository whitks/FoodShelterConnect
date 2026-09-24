import uuid
import enum
from datetime import datetime
from sqlalchemy import Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid, Enum as SQLEnum
from backend.app.database import Base

class RequestUrgency(enum.Enum):
    NORMAL = "NORMAL"
    HIGH = "HIGH"

class RequestSource(enum.Enum):
    APP = "APP"
    VOICE_CALL = "VOICE_CALL"

class RequestStatus(enum.Enum):
    OPEN = "OPEN"
    FULFILLED = "FULFILLED"
    CANCELLED = "CANCELLED"

class FoodRequest(Base):
    __tablename__ = "food_requests"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shelter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shelter_profiles.id"), nullable=False)
    requested_portions: Mapped[int] = mapped_column(Integer, nullable=False)
    urgency: Mapped[RequestUrgency] = mapped_column(SQLEnum(RequestUrgency), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[RequestSource] = mapped_column(SQLEnum(RequestSource), nullable=False)
    status: Mapped[RequestStatus] = mapped_column(SQLEnum(RequestStatus), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    shelter = relationship("ShelterProfile")
