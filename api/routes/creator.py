from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.services.auth import get_current_user_id
from db.crud import create_market_suggestion, get_user_by_id, list_market_suggestions, review_market_suggestion
from db.models import SessionLocal

router = APIRouter()


class SuggestionRequest(BaseModel):
    question: str = Field(min_length=10, max_length=280)
    category: str = Field(default="general", max_length=32)
    resolution_criteria: str = Field(min_length=10, max_length=2000)
    source_url: str | None = None


class ReviewRequest(BaseModel):
    status: str
    admin_note: str | None = None


@router.post("/suggestions")
async def submit_suggestion(request: SuggestionRequest, user_id: int = Depends(get_current_user_id)):
    async with SessionLocal() as session:
        suggestion = await create_market_suggestion(
            session,
            user_id=user_id,
            question=request.question,
            category=request.category,
            resolution_criteria=request.resolution_criteria,
            source_url=request.source_url,
        )
    return _suggestion_dict(suggestion)


@router.get("/suggestions")
async def suggestions():
    async with SessionLocal() as session:
        rows = await list_market_suggestions(session, status="APPROVED")
    return {"suggestions": [_suggestion_dict(row) for row in rows]}


@router.get("/suggestions/mine")
async def my_suggestions(user_id: int = Depends(get_current_user_id)):
    async with SessionLocal() as session:
        rows = await list_market_suggestions(session, user_id=user_id)
    return {"suggestions": [_suggestion_dict(row) for row in rows]}


@router.post("/suggestions/{suggestion_id}/review")
async def review_suggestion(suggestion_id: int, request: ReviewRequest, user_id: int = Depends(get_current_user_id)):
    if request.status.upper() not in {"APPROVED", "REJECTED"}:
        raise HTTPException(status_code=400, detail="status must be APPROVED or REJECTED.")
    async with SessionLocal() as session:
        reviewer = await get_user_by_id(session, user_id)
        if not reviewer or not reviewer.is_admin:
            raise HTTPException(status_code=403, detail="Admin access required.")
        suggestion = await review_market_suggestion(
            session,
            suggestion_id=suggestion_id,
            reviewer_id=user_id,
            status=request.status,
            admin_note=request.admin_note,
        )
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found.")
    return _suggestion_dict(suggestion)


def _suggestion_dict(suggestion) -> dict:
    return {
        "id": suggestion.id,
        "question": suggestion.question,
        "category": suggestion.category,
        "resolution_criteria": suggestion.resolution_criteria,
        "source_url": suggestion.source_url,
        "status": suggestion.status,
        "admin_note": suggestion.admin_note,
        "created_at": suggestion.created_at.isoformat() if suggestion.created_at else None,
        "reviewed_at": suggestion.reviewed_at.isoformat() if suggestion.reviewed_at else None,
    }
