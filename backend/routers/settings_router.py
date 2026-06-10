"""/api/settings — behavioral configuration (read + write).

PUT replaces the in-memory settings. The Worker Agent consults these
values on every span, so changes take effect immediately (next poll).
"""
from fastapi import APIRouter

from ..schemas import BehavioralSettings
from ..state import state
from ..wa.broadcaster import broadcast

router = APIRouter()


@router.get("", response_model=BehavioralSettings)
async def get_settings() -> BehavioralSettings:
    return await state.get_settings()


@router.post("", response_model=BehavioralSettings)
async def post_settings(s: BehavioralSettings) -> BehavioralSettings:
    """Update behavioral settings (POST for the dashboard's PUT-aliasing)."""
    updated = await state.set_settings(s)
    await broadcast({
        "type": "settings_updated",
        "data": updated.model_dump(by_alias=True),
    })
    return updated


@router.put("", response_model=BehavioralSettings)
async def put_settings(s: BehavioralSettings) -> BehavioralSettings:
    """Update behavioral settings (canonical PUT)."""
    return await post_settings(s)
