from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from api.config import get_settings


class OrderSubmissionError(Exception):
    pass


@dataclass(frozen=True)
class OrderSubmissionResult:
    status: str
    message: str
    order_id: str | None = None
    raw_response: dict[str, Any] | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "message": self.message,
            "order_id": self.order_id,
            "raw_response": self.raw_response,
        }


class PolymarketOrderSubmissionService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def submit_verified_intent(self, intent) -> OrderSubmissionResult:
        payload = intent.payload or {}
        if not self.settings.polymarket_order_submission_enabled:
            return OrderSubmissionResult(
                status="disabled",
                message="POLYMARKET_ORDER_SUBMISSION_ENABLED is false; verified intent is waiting for live submission.",
            )

        missing = self._missing_configuration(payload)
        if missing:
            return OrderSubmissionResult(
                status="configuration_missing",
                message=f"Missing required Polymarket submission configuration: {', '.join(missing)}.",
            )

        try:
            client = self._client()
            order_args = self._order_args(payload)
            signed_order = client.create_order(order_args)
            response = self._post_order(client, signed_order)
        except Exception as exc:
            raise OrderSubmissionError(self._friendly_error_message(exc)) from exc

        response_dict = self._response_to_dict(response)
        return OrderSubmissionResult(
            status="submitted",
            message="Signed order submitted to Polymarket CLOB.",
            order_id=self._extract_order_id(response_dict),
            raw_response=response_dict,
        )

    def _missing_configuration(self, payload: dict[str, Any]) -> list[str]:
        checks = {
            "POLYMARKET_PRIVATE_KEY": self.settings.polymarket_private_key,
            "POLYMARKET_API_KEY": self.settings.polymarket_api_key,
            "POLYMARKET_API_SECRET": self.settings.polymarket_api_secret,
            "POLYMARKET_API_PASSPHRASE": self.settings.polymarket_api_passphrase,
            "outcome_token_id": payload.get("outcome_token_id"),
        }
        return [name for name, value in checks.items() if not value]

    def _client(self):
        from py_clob_client.client import ClobClient
        from py_clob_client.clob_types import ApiCreds

        kwargs = {
            "host": self.settings.polymarket_host,
            "key": self.settings.polymarket_private_key,
            "chain_id": self.settings.polygon_chain_id,
        }
        if self.settings.polymarket_signature_type:
            kwargs["signature_type"] = self.settings.polymarket_signature_type
        if self.settings.polymarket_funder_address:
            kwargs["funder"] = self.settings.polymarket_funder_address

        client = ClobClient(**kwargs)
        try:
            creds = ApiCreds(
                api_key=self.settings.polymarket_api_key,
                api_secret=self.settings.polymarket_api_secret,
                api_passphrase=self.settings.polymarket_api_passphrase,
            )
        except TypeError:
            creds = ApiCreds(
                key=self.settings.polymarket_api_key,
                secret=self.settings.polymarket_api_secret,
                passphrase=self.settings.polymarket_api_passphrase,
            )
        if hasattr(client, "set_api_creds"):
            client.set_api_creds(creds)
        else:
            client.creds = creds
        return client

    def _order_args(self, payload: dict[str, Any]):
        from py_clob_client.clob_types import OrderArgs
        try:
            from py_clob_client.constants import BUY
        except ImportError:
            BUY = "BUY"

        kwargs = {
            "price": round(float(payload["entry_price"]), 4),
            "size": round(float(payload["shares"]), 6),
            "side": BUY,
            "token_id": str(payload["outcome_token_id"]),
        }
        return OrderArgs(**kwargs)

    def _post_order(self, client, signed_order):
        try:
            from py_clob_client.clob_types import OrderType

            return client.post_order(signed_order, OrderType.GTC)
        except (ImportError, AttributeError):
            return client.post_order(signed_order)

    def _response_to_dict(self, response: Any) -> dict[str, Any]:
        if isinstance(response, dict):
            return response
        if hasattr(response, "model_dump"):
            return response.model_dump()
        if hasattr(response, "dict"):
            return response.dict()
        return {"response": str(response)}

    def _extract_order_id(self, response: dict[str, Any]) -> str | None:
        order_id = response.get("orderID") or response.get("order_id") or response.get("id")
        if order_id:
            return str(order_id)
        nested = response.get("order") if isinstance(response.get("order"), dict) else {}
        nested_id = nested.get("id") or nested.get("orderID") or nested.get("order_id")
        return str(nested_id) if nested_id else None

    def _friendly_error_message(self, exc: Exception) -> str:
        message = str(exc)
        lowered = message.lower()
        if "status_code=403" in lowered and ("geoblock" in lowered or "restricted in your region" in lowered):
            return (
                "Polymarket rejected the order because the API request came from a restricted server region. "
                "Move the API service to a Polymarket-supported deployment region, then try again."
            )
        return message
