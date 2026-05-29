from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class WalletConnectRequest(BaseModel):
    telegram_id: int
    address: str


@router.post("/connect")
async def connect_wallet(request: WalletConnectRequest):
    return {
        "status": "accepted",
        "telegram_id": request.telegram_id,
        "address": request.address,
    }


@router.get("/list/{telegram_id}")
async def list_wallets(telegram_id: int):
    return {"telegram_id": telegram_id, "wallets": []}
