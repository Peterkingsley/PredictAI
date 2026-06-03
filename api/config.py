from functools import lru_cache

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    telegram_bot_token: str = ""
    bot_username: str = "TrypredictAI_bot"
    database_url: str = ""
    redis_url: str = ""
    polymarket_private_key: str = ""
    polymarket_api_key: str = ""
    polymarket_api_secret: str = ""
    polymarket_api_passphrase: str = ""
    polymarket_funder_address: str = ""
    polymarket_usdc_spender: str = ""
    polymarket_signature_type: int = 0
    polymarket_order_submission_enabled: bool = False
    polymarket_host: str = "https://clob.polymarket.com"
    polygon_chain_id: int = 137
    polygon_rpc_url: str = ""
    walletconnect_project_id: str = ""
    mini_app_url: str = ""
    cors_origins: str = ""
    gemini_api_key: str = ""
    environment: str = "development"
    admin_telegram_ids: str = ""
    min_bet_usdc: float = 1.0
    signature_timeout: int = 120

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("redis_url")
    @classmethod
    def normalize_redis_url(cls, value: str) -> str:
        if value and "://" not in value:
            return f"redis://{value}"
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
