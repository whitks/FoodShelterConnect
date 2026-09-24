import uuid
import enum
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid, Enum as SQLEnum
from backend.app.database import Base

class DeliveryStatus(enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    PICKED_UP = "PICKED_UP"
    DELIVERED = "DELIVERED"
    CONFIRMED = "CONFIRMED"
    FAILED = "FAILED"
    DECLINED = "DECLINED"

class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("donations.id"), nullable=False)
    shelter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shelter_profiles.id"), nullable=False)
    volunteer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    picked_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[DeliveryStatus] = mapped_column(SQLEnum(DeliveryStatus), nullable=False)
    match_explanation: Mapped[str | None] = mapped_column(String, nullable=True)

    donation = relationship("Donation")
    shelter = relationship("ShelterProfile")
    volunteer = relationship("User")
