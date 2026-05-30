from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import get_settings
from api.routes import markets, trades, wallet
from db.models import init_db

app = FastAPI(title="PredictAI API")

settings = get_settings()
allowed_origins = [
    origin.strip()
    for origin in f"{settings.mini_app_url},{settings.cors_origins}".split(",")
    if origin.strip()
]
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

app.include_router(wallet.router, prefix="/wallet", tags=["wallet"])
app.include_router(markets.router, prefix="/markets", tags=["markets"])
app.include_router(trades.router, prefix="/trades", tags=["trades"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def startup() -> None:
    await init_db()
