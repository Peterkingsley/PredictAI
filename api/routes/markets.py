from fastapi import APIRouter, HTTPException, Query

from api.services.polymarket import PolymarketService, PolymarketServiceError

router = APIRouter()
service = PolymarketService()


@router.get("/top")
async def top_markets(limit: int = Query(default=10, ge=1, le=50)):
    try:
        return await service.get_top_markets(limit=limit)
    except PolymarketServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/new")
async def new_markets(limit: int = Query(default=10, ge=1, le=50)):
    try:
        return await service.get_new_markets(limit=limit)
    except PolymarketServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/category/{category}")
async def category_markets(category: str, limit: int = Query(default=10, ge=1, le=50)):
    try:
        return await service.get_markets_by_category(category=category, limit=limit)
    except PolymarketServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/search")
async def search_markets(q: str = Query(min_length=2), limit: int = Query(default=10, ge=1, le=25)):
    try:
        return await service.search_markets(q, limit=limit)
    except PolymarketServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{market_id}")
async def market_detail(market_id: str):
    market = await service.get_market(market_id)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    return market
