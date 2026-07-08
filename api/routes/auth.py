import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.services.auth import create_access_token, get_current_user_id, hash_password, verify_password
from db.crud import (
    count_referrals,
    create_web_user,
    get_user_by_email,
    get_user_by_id,
    list_reward_transactions,
)
from db.models import SessionLocal

router = APIRouter()
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    referral_code: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
async def signup(request: SignupRequest):
    email = request.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    async with SessionLocal() as session:
        existing = await get_user_by_email(session, email)
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        user = await create_web_user(
            session,
            email=email,
            password_hash=hash_password(request.password),
            referred_by_code=request.referral_code,
        )
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "user": await _user_dict(user)}


@router.post("/login")
async def login(request: LoginRequest):
    async with SessionLocal() as session:
        user = await get_user_by_email(session, request.email.strip().lower())
        if not user or not user.password_hash or not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "user": await _user_dict(user)}


@router.get("/me")
async def me(user_id: int = Depends(get_current_user_id)):
    async with SessionLocal() as session:
        user = await get_user_by_id(session, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Account not found.")
    return await _user_dict(user)


async def _user_dict(user) -> dict:
    async with SessionLocal() as session:
        referral_count = await count_referrals(session, user.id)
        recent_rewards = await list_reward_transactions(session, user.id, limit=5)
    return {
        "id": user.id,
        "email": user.email,
        "referral_code": user.referral_code,
        "referral_count": referral_count,
        "reward_points_balance": user.reward_points_balance,
        "is_admin": user.is_admin,
        "joined_at": user.joined_at.isoformat() if user.joined_at else None,
        "recent_rewards": [
            {"points": tx.points, "reason": tx.reason, "created_at": tx.created_at.isoformat() if tx.created_at else None}
            for tx in recent_rewards
        ],
    }
