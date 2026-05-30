from fastapi import APIRouter
from pydantic import BaseModel

from api.services.wallets import get_usdc_balance, is_evm_address
from db.crud import add_wallet, list_wallets as list_user_wallets
from db.models import SessionLocal

router = APIRouter()


class WalletConnectRequest(BaseModel):
    telegram_id: int
    address: str


@router.post("/connect")
async def connect_wallet(request: WalletConnectRequest):
    if not is_evm_address(request.address):
        return {"status": "rejected", "message": "Invalid EVM address"}

    async with SessionLocal() as session:
        wallet = await add_wallet(session, request.telegram_id, request.address)
    balance = await get_usdc_balance(wallet.address)
    return {
        "status": "connected",
        "telegram_id": request.telegram_id,
        "address": wallet.address,
        "balance_usdc": balance,
    }


@router.get("/list/{telegram_id}")
async def list_wallets(telegram_id: int):
    async with SessionLocal() as session:
        wallets = await list_user_wallets(session, telegram_id)
    return {
        "telegram_id": telegram_id,
        "wallets": [
            {"address": wallet.address, "is_active": wallet.is_active, "connected_at": wallet.connected_at.isoformat()}
            for wallet in wallets
        ],
    }
