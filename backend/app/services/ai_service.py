import json
import logging
from typing import Dict, List
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

from backend.app.config import settings

logger = logging.getLogger(__name__)

# Configure Gemini if API key is present
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
def _get_model():
    if not settings.GEMINI_API_KEY:
        return None
    # Use gemini-3.6-flash as recommended by API
    return genai.GenerativeModel('gemini-3.6-flash')

def explain_match(donation: dict, shelter: dict, match_score: float) -> str:
    """
    Generate a one-line human-readable explanation for the admin dashboard.
    """
    model = _get_model()
    
    time_remaining = donation.get("time_remaining_mins", "unknown")
    hours_since = "unknown"
    if shelter.get("last_received_at"):
        # Assuming we can get hours from now, for prompt we'll pass a placeholder or simple logic
        pass # Let's assume the caller passes the right context or we format it well
        
    # the prompt specifies certain variables, let's format them
    food_name = donation.get("food_name", "food")
    portions = donation.get("portions", 0)
    
    ngo_name = shelter.get("ngo_name", "Unknown Shelter")
    beneficiaries = shelter.get("avg_daily_beneficiaries", 0)
    priority_score = shelter.get("priority_score", 50.0)
    
    prompt = f"""You are explaining a food donation match decision for an admin dashboard.
Be concise, factual, one sentence only.

Donation: {portions} portions of {food_name}, expires in {time_remaining} mins
Shelter: {ngo_name}, serving {beneficiaries} people daily, priority score {priority_score}
Match score: {match_score:.2f}

Explain why this shelter was chosen."""

    if not model:
        return f"{ngo_name} was selected with a match score of {match_score:.2f}."

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.3,
            )
        )
        return response.text.strip()
    except Exception as e:
        logger.warning(f"Failed to generate match explanation: {e}")
        return f"{ngo_name} was selected with a match score of {match_score:.2f}."

def forecast_demand(shelter: dict, request_history: List[Dict]) -> Dict:
    """
    Predict next-day food demand for a shelter based on request history.
    """
    model = _get_model()
    ngo_name = shelter.get("ngo_name", "Unknown Shelter")
    avg = shelter.get("avg_daily_beneficiaries", 0)
    
    default_resp = {
        "predicted_portions": avg,
        "confidence": "LOW",
        "note": "Insufficient history or AI unavailable."
    }

    if not model:
        return default_resp

    prompt = f"""You are analyzing food request patterns for an NGO shelter.
Return ONLY valid JSON, no markdown, no explanation.

Shelter: {ngo_name}, avg daily beneficiaries: {avg}
Last 14 days of requests: {json.dumps(request_history)}

Predict tomorrow's food requirement.
Respond with:
{{
  "predicted_portions": <int>,
  "confidence": "<LOW|MEDIUM|HIGH>",
  "note": "<one sentence explanation>"
}}"""

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                response_mime_type="application/json"
            )
        )
        data = json.loads(response.text)
        return {
            "predicted_portions": int(data.get("predicted_portions", avg)),
            "confidence": data.get("confidence", "LOW"),
            "note": data.get("note", "Predicted using AI.")
        }
    except Exception as e:
        logger.warning(f"Failed to generate demand forecast: {e}")
        return default_resp

async def run_nightly_forecasts(db):
    """
    Generate demand forecasts for all shelters for tomorrow.
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from backend.app.models.shelter import ShelterProfile, DemandForecast
    from backend.app.models.request import FoodRequest
    from datetime import datetime, UTC, timedelta
    
    stmt = select(ShelterProfile)
    shelters = (await db.execute(stmt)).scalars().all()
    
    fourteen_days_ago = datetime.now(UTC) - timedelta(days=14)
    tomorrow = datetime.now(UTC) + timedelta(days=1)
    
    for shelter in shelters:
        req_stmt = select(FoodRequest).where(
            FoodRequest.shelter_id == shelter.id,
            FoodRequest.created_at >= fourteen_days_ago
        ).order_by(FoodRequest.created_at.desc())
        
        req_records = (await db.execute(req_stmt)).scalars().all()
        history = [
            {
                "requested_portions": r.requested_portions,
                "urgency": r.urgency.value if r.urgency else "NORMAL",
                "date": r.created_at.isoformat()
            } for r in req_records
        ]
        
        shelter_dict = {
            "ngo_name": shelter.ngo_name,
            "avg_daily_beneficiaries": shelter.avg_daily_beneficiaries
        }
        
        forecast_result = forecast_demand(shelter_dict, history)
        
        forecast = DemandForecast(
            shelter_id=shelter.id,
            forecast_date=tomorrow,
            predicted_portions=forecast_result["predicted_portions"],
            confidence=forecast_result["confidence"],
            note=forecast_result["note"]
        )
        db.add(forecast)
        
    await db.commit()
