import uuid
from datetime import datetime, UTC
import logging

from backend.app.database import async_session_maker
from backend.app.schemas.donation import DonationCreate
from backend.app.models.donation import FoodType, StorageCondition
from backend.app.services import donation_service

logger = logging.getLogger(__name__)

async def create_donation_tool(
    food_name: str,
    portions: int,
    pickup_address: str,
    area_zone: str = "Central",
    notes: str = ""
) -> str:
    """
    Creates a food donation in the FoodBridge system.
    
    Args:
        food_name: The name/type of food being donated (e.g. 'Apples', 'Cooked Rice')
        portions: Estimated number of people this can feed
        pickup_address: The physical address where the food can be picked up
        area_zone: The geographical zone (default: Central)
        notes: Any additional notes from the donor
    """
    try:
        # In a real app we'd get the donor_id from the authenticated session (Twilio phone number lookup etc)
        # For testing, we just query any active donor from the DB or fallback.
        async with async_session_maker() as session:
            from sqlalchemy import select
            from backend.app.models.user import User, UserRole
            
            stmt = select(User.id).where(User.role == UserRole.DONOR).limit(1)
            donor_id = (await session.execute(stmt)).scalar_one_or_none()
            
            if not donor_id:
                return "Error: No donor account found in the system to post this donation."

            donation_data = DonationCreate(
                food_name=food_name,
                food_type=FoodType.RAW, # Defaulting for voice
                portions=portions,
                storage_condition=StorageCondition.ROOM_TEMP,
                prepared_at=datetime.now(UTC),
                pickup_address=pickup_address,
                area_zone=area_zone,
                notes=notes
            )
            
            donation = await donation_service.create_donation(session, donor_id, donation_data)
            await session.commit()
            
            return f"Success! Created donation for {portions} portions of {food_name}. The donation ID is {donation['id']}. Tell the user the food is now posted for pickup."
            
    except Exception as e:
        logger.error(f"Failed to create donation via voice: {e}")
        return f"Error: Could not create donation. Detail: {e}"
