from fastapi import APIRouter, Depends, HTTPException

from api.config import get_settings
from api.services.auth import get_current_user_id
from db.crud import count_referrals, get_user_by_id, list_reward_transactions
from db.models import SessionLocal

router = APIRouter()


@router.get("/me")
async def my_rewards(user_id: int = Depends(get_current_user_id)):
    async with SessionLocal() as session:
        user = await get_user_by_id(session, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Account not found.")
        referral_count = await count_referrals(session, user_id)
        transactions = await list_reward_transactions(session, user_id, limit=50)

    settings = get_settings()
    referral_link = f"{settings.web_app_url.rstrip('/')}/signup?ref={user.referral_code}" if settings.web_app_url else None
    return {
        "points_balance": user.reward_points_balance,
        "referral_code": user.referral_code,
        "referral_link": referral_link,
        "referral_count": referral_count,
        "transactions": [
            {
                "points": tx.points,
                "reason": tx.reason,
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
            }
            for tx in transactions
        ],
    }
