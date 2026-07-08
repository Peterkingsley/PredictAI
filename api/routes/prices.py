from fastapi import APIRouter, HTTPException

from api.services.prices import get_live_prices

router = APIRouter()


@router.get("")
async def live_prices():
    try:
        return {"prices": await get_live_prices()}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Unable to fetch live prices: {exc}") from exc
