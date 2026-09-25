import uuid
from datetime import datetime, UTC
from sqlalchemy import String, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
from backend.app.database import Base

class DonorProfile(Base):
    __tablename__ = "donor_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String, nullable=False)
    business_type: Mapped[str] = mapped_column(String, nullable=False)
    address: Mapped[str] = mapped_column(String, nullable=False)
    city: Mapped[str] = mapped_column(String, nullable=False)
    pincode: Mapped[str] = mapped_column(String, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    pickup_window_start: Mapped[str] = mapped_column(String, nullable=False)
    pickup_window_end: Mapped[str] = mapped_column(String, nullable=False)
    trust_score: Mapped[float] = mapped_column(Float, default=0.5)

    user = relationship("User", back_populates="donor_profile")