from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from api.services.auth import get_current_user_id
from api.services.wallets import get_usdc_balance, is_evm_address
from db.crud import add_wallet_for_user, list_wallets_for_user
from db.models import SessionLocal

router = APIRouter()


class ConnectWalletRequest(BaseModel):
    address: str


@router.post("/connect")
async def connect_wallet(request: ConnectWalletRequest, user_id: int = Depends(get_current_user_id)):
    if not is_evm_address(request.address):
        raise HTTPException(status_code=400, detail="Invalid EVM address.")
    async with SessionLocal() as session:
        wallet = await add_wallet_for_user(session, user_id, request.address)
    balance = await get_usdc_balance(wallet.address)
    return {"status": "connected", "address": wallet.address, "is_active": wallet.is_active, "balance_usdc": balance}


@router.get("/list")
async def list_wallets(user_id: int = Depends(get_current_user_id)):
    async with SessionLocal() as session:
        wallets = await list_wallets_for_user(session, user_id)
    return {
        "wallets": [
            {"address": wallet.address, "is_active": wallet.is_active, "connected_at": wallet.connected_at.isoformat()}
            for wallet in wallets
        ]
    }
