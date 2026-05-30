from fastapi import FastAPI

from api.routes import markets, trades, wallet
from db.models import init_db

app = FastAPI(title="PredictAI API")

app.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
app.include_router(markets.router, prefix="/markets", tags=["markets"])
app.include_router(trades.router, prefix="/trades", tags=["trades"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def startup() -> None:
    await init_db()
