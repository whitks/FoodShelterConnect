import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid, Enum as SQLEnum
from backend.app.database import Base

class FoodType(enum.Enum):
    COOKED = "COOKED"
    RAW = "RAW"
    PACKAGED = "PACKAGED"
    BAKED = "BAKED"

class StorageCondition(enum.Enum):
    ROOM_TEMP = "ROOM_TEMP"
    REFRIGERATED = "REFRIGERATED"
    HOT_BOX = "HOT_BOX"

class DonationStatus(enum.Enum):
    POSTED = "POSTED"
    REVIEW = "REVIEW"
    MATCHED = "MATCHED"
    ACCEPTED = "ACCEPTED"
    PICKED_UP = "PICKED_UP"
    DELIVERED = "DELIVERED"
    CONFIRMED = "CONFIRMED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"

class DonationSource(enum.Enum):
    APP = "APP"
    VOICE_CALL = "VOICE_CALL"

class Donation(Base):
    __tablename__ = "donations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    food_name: Mapped[str] = mapped_column(String, nullable=False)
    food_type: Mapped[FoodType] = mapped_column(SQLEnum(FoodType), nullable=False)
    quantity_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    portions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    storage_condition: Mapped[StorageCondition] = mapped_column(SQLEnum(StorageCondition), nullable=False)
    prepared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    posted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pickup_address: Mapped[str] = mapped_column(String, nullable=False)
    pickup_lat: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_lng: Mapped[float] = mapped_column(Float, nullable=False)
    area_zone: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[DonationStatus] = mapped_column(SQLEnum(DonationStatus), nullable=False)
    source: Mapped[DonationSource] = mapped_column(SQLEnum(DonationSource), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    donor = relationship("User")
