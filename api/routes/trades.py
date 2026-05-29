from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class BuildOrderRequest(BaseModel):
    telegram_id: int
    market_id: str
    side: Literal["YES", "NO"]
    amount_usdc: float = Field(gt=0)
    wallet_address: str


@router.post("/build")
async def build_order(request: BuildOrderRequest):
    return {
        "status": "not_enabled",
        "message": "Real trade construction is intentionally disabled until wallet signing is validated.",
        "request": request.model_dump(),
    }


@router.get("/positions/{telegram_id}")
async def positions(telegram_id: int):
    return {"telegram_id": telegram_id, "positions": []}
