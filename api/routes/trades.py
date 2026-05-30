from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from db.crud import list_open_positions
from db.models import SessionLocal

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
    async with SessionLocal() as session:
        open_positions = await list_open_positions(session, telegram_id)
    return {
        "telegram_id": telegram_id,
        "positions": [
            {
                "id": position.id,
                "market_id": position.market_id,
                "market_question": position.market_question,
                "side": position.side,
                "amount_usdc": float(position.amount_usdc),
                "shares": float(position.shares),
                "entry_price": float(position.entry_price),
                "current_price": float(position.current_price or position.entry_price),
                "status": position.status,
            }
            for position in open_positions
        ],
    }
