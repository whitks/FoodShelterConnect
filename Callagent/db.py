"""Persistence for the voice agent: reuse the FoodShelter backend DB stack.

- Ensures tables exist (async create_all against the backend engine).
- Get-or-create a DONOR User by phone number (random password, never exposed).
- Saves donations through backend.app.services.donation_service.create_donation
  with source=DonationSource.VOICE_CALL, then runs the shelter matcher.
"""
import logging
import secrets
import uuid
from datetime import datetime, UTC

from sqlalchemy import select

from backend.app.database import Base, engine, async_session_maker
# Importing the models package registers every table on Base.metadata.
import backend.app.models as _models  # noqa: F401
from backend.app.models.user import User, UserRole
from backend.app.models.donation import FoodType, StorageCondition, DonationSource
from backend.app.schemas.donation import DonationCreate
from backend.app.services.donation_service import create_donation
from backend.app.services.matching_service import run_matching
from backend.app.utils.auth import hash_password

logger = logging.getLogger(__name__)

FOOD_TYPES = {ft.value: ft for ft in FoodType}
STORAGE_TYPES = {sc.value: sc for sc in StorageCondition}
VOICE_NOTE_PREFIX = "Collected via voice call."


def normalize_phone(phone) -> str:
    """Sanitize an untrusted phone string to E.164-ish form before DB use.

    Accepts only an optional leading '+' plus 7-15 digits (E.164). Anything
    else becomes '' so malicious WS clients cannot stuff arbitrary strings
    into the unique users.phone column or skew lookups.
    """
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if 7 <= len(digits) <= 15:
        return f"+{digits}"
    return ""


def _mask_phone(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    return "***" + digits[-4:] if digits else ""


async def ensure_tables() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_or_create_donor(phone: str, name: str = "Voice Donor") -> uuid.UUID:
    """Return the DONOR user id for `phone`, creating the user if needed."""
    phone = normalize_phone(phone)
    async with async_session_maker() as session:
        stmt = select(User).where(User.phone == phone)
        user = (await session.execute(stmt)).scalar_one_or_none()
        if user is not None:
            return user.id

        new_user = User(
            name=(name or "Voice Donor").strip()[:100],
            phone=phone,
            email=None,
            password_hash=hash_password(secrets.token_urlsafe(16)),
            role=UserRole.DONOR,
        )
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        logger.info(
            "Created voice donor user %s (phone %s)", new_user.id, _mask_phone(phone)
        )
        return new_user.id


def _clean_enum(value, mapping: dict, default):
    if value is None:
        return default
    key = str(value).strip().upper()
    if key in mapping:
        return mapping[key]
    return default


def _clean_number(value, cast, default=None):
    if value in (None, "", "null", "None"):
        return default
    try:
        return cast(value)
    except (TypeError, ValueError):
        return default


def _clean_datetime(value) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value.strip():
        try:
            dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=UTC)
        except ValueError:
            pass
    return datetime.now(UTC)


def _build_donation_create(fields: dict) -> DonationCreate:
    food_name = (fields.get("food_name") or "").strip()
    if not food_name:
        food_name = "Unknown food item"
    pickup_address = (fields.get("pickup_address") or "").strip()
    if not pickup_address:
        pickup_address = "To be confirmed by phone"
    notes = (fields.get("notes") or "").strip()
    base_note = f"{VOICE_NOTE_PREFIX}"
    if notes:
        notes = f"{base_note} {notes}"
    else:
        notes = base_note

    return DonationCreate(
        food_name=food_name[:200],
        food_type=_clean_enum(fields.get("food_type"), FOOD_TYPES, FoodType.COOKED),
        quantity_kg=_clean_number(fields.get("quantity_kg"), float),
        portions=_clean_number(fields.get("portions"), int),
        storage_condition=_clean_enum(
            fields.get("storage_condition"), STORAGE_TYPES, StorageCondition.ROOM_TEMP
        ),
        prepared_at=_clean_datetime(fields.get("prepared_at")),
        pickup_address=pickup_address[:500],
        area_zone=(fields.get("area_zone") or None),
        notes=notes,
    )


async def save_donation(donor_id: uuid.UUID, fields: dict) -> dict:
    """Persist a donation tagged source=VOICE_CALL and kick off shelter matching."""
    data = _build_donation_create(fields)
    async with async_session_maker() as session:
        result = await create_donation(
            session, donor_id, data, source=DonationSource.VOICE_CALL
        )
        try:
            await run_matching(session, result["id"])
        except Exception:
            logger.exception("run_matching failed for voice donation %s", result["id"])
        return result