from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import Alert, Position, SigningIntent, TradeOrder, User, Wallet


async def get_or_create_user(session: AsyncSession, telegram_id: int, username: str | None = None) -> User:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if user:
        return user

    user = User(telegram_id=telegram_id, username=username)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def add_wallet(session: AsyncSession, telegram_id: int, address: str, username: str | None = None) -> Wallet:
    user = await get_or_create_user(session, telegram_id=telegram_id, username=username)
    normalized = address.lower()

    result = await session.execute(
        select(Wallet).where(Wallet.user_id == user.id, Wallet.address == normalized)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await set_active_wallet(session, user.id, existing.id)
        await session.refresh(existing)
        return existing

    result = await session.execute(select(Wallet).where(Wallet.user_id == user.id))
    has_wallet = result.scalar_one_or_none() is not None
    wallet = Wallet(user_id=user.id, address=normalized, is_active=not has_wallet)
    session.add(wallet)
    await session.commit()
    await session.refresh(wallet)
    if wallet.is_active:
        return wallet
    return wallet


async def list_wallets(session: AsyncSession, telegram_id: int) -> list[Wallet]:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        return []
    result = await session.execute(select(Wallet).where(Wallet.user_id == user.id).order_by(Wallet.connected_at))
    return list(result.scalars().all())


async def get_active_wallet(session: AsyncSession, telegram_id: int) -> Wallet | None:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    result = await session.execute(select(Wallet).where(Wallet.user_id == user.id, Wallet.is_active == True))
    return result.scalar_one_or_none()


async def set_active_wallet(session: AsyncSession, user_id: int, wallet_id: int) -> None:
    await session.execute(update(Wallet).where(Wallet.user_id == user_id).values(is_active=False))
    await session.execute(update(Wallet).where(Wallet.id == wallet_id, Wallet.user_id == user_id).values(is_active=True))
    await session.commit()


async def disconnect_wallets(session: AsyncSession, telegram_id: int) -> int:
    wallets = await list_wallets(session, telegram_id)
    for wallet in wallets:
        await session.delete(wallet)
    await session.commit()
    return len(wallets)


async def list_open_positions(session: AsyncSession, telegram_id: int) -> list[Position]:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        return []
    result = await session.execute(
        select(Position).where(Position.user_id == user.id, Position.status == "OPEN").order_by(Position.opened_at.desc())
    )
    return list(result.scalars().all())


async def list_positions(session: AsyncSession, telegram_id: int, limit: int = 10) -> list[Position]:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        return []
    result = await session.execute(
        select(Position).where(Position.user_id == user.id).order_by(Position.opened_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def get_position(session: AsyncSession, telegram_id: int, position_id: int) -> Position | None:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    result = await session.execute(select(Position).where(Position.user_id == user.id, Position.id == position_id))
    return result.scalar_one_or_none()


async def upsert_trade_order_from_intent(
    session: AsyncSession,
    intent: SigningIntent,
    submission: dict,
) -> TradeOrder | None:
    user = await get_or_create_user(session, telegram_id=intent.telegram_id)
    payload = intent.payload or {}
    if not payload.get("market_id"):
        return None

    result = await session.execute(select(TradeOrder).where(TradeOrder.signing_intent_id == intent.id))
    order = result.scalar_one_or_none()
    if not order:
        order = TradeOrder(
            user_id=user.id,
            signing_intent_id=intent.id,
            wallet_address=intent.wallet_address,
            market_id=str(payload.get("market_id")),
            market_question=str(payload.get("market_question") or "Selected market"),
            outcome_token_id=payload.get("outcome_token_id"),
            side=str(payload.get("side") or intent.intent_type),
            order_type=intent.intent_type,
            amount_usdc=float(payload.get("amount_usdc") or 0),
            shares=float(payload.get("shares") or 0),
            limit_price=float(payload.get("entry_price") or 0),
        )
        session.add(order)

    order.status = _order_status_from_submission(submission)
    order.polymarket_order_id = submission.get("order_id")
    order.submission = submission
    order.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(order)
    return order


async def list_trade_orders(session: AsyncSession, telegram_id: int, limit: int = 10) -> list[TradeOrder]:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        return []
    result = await session.execute(
        select(TradeOrder).where(TradeOrder.user_id == user.id).order_by(TradeOrder.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def get_trade_order(session: AsyncSession, telegram_id: int, order_id: int) -> TradeOrder | None:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    result = await session.execute(select(TradeOrder).where(TradeOrder.user_id == user.id, TradeOrder.id == order_id))
    return result.scalar_one_or_none()


def _order_status_from_submission(submission: dict) -> str:
    status = submission.get("status")
    if status == "submitted":
        return "SUBMITTED"
    if status == "failed":
        return "FAILED"
    if status == "configuration_missing":
        return "CONFIGURATION_MISSING"
    if status == "disabled":
        return "SIGNED_PENDING_SUBMISSION"
    return "SIGNED"


async def create_alert(
    session: AsyncSession,
    telegram_id: int,
    username: str | None,
    market_id: str,
    market_question: str,
    threshold: float,
    direction: str = "ABOVE",
) -> Alert:
    user = await get_or_create_user(session, telegram_id=telegram_id, username=username)
    alert = Alert(
        user_id=user.id,
        market_id=market_id,
        market_question=market_question,
        threshold=threshold,
        direction=direction,
    )
    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    return alert


async def list_alerts(session: AsyncSession, telegram_id: int, include_triggered: bool = False) -> list[Alert]:
    result = await session.execute(select(User).where(User.telegram_id == telegram_id))
    user = result.scalar_one_or_none()
    if not user:
        return []
    query = select(Alert).where(Alert.user_id == user.id)
    if not include_triggered:
        query = query.where(Alert.triggered == False)
    result = await session.execute(query.order_by(Alert.created_at.desc()))
    return list(result.scalars().all())


async def list_untriggered_alerts(session: AsyncSession) -> list[tuple[Alert, int]]:
    result = await session.execute(
        select(Alert, User.telegram_id).join(User, Alert.user_id == User.id).where(Alert.triggered == False)
    )
    return [(row[0], row[1]) for row in result.all()]


async def mark_alert_triggered(session: AsyncSession, alert_id: int) -> None:
    result = await session.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        return
    alert.triggered = True
    alert.triggered_at = datetime.utcnow()
    await session.commit()


async def create_signing_intent(
    session: AsyncSession,
    telegram_id: int,
    wallet_address: str,
    intent_type: str,
    payload: dict,
) -> SigningIntent:
    intent = SigningIntent(
        telegram_id=telegram_id,
        wallet_address=wallet_address.lower(),
        intent_type=intent_type,
        payload=payload,
    )
    session.add(intent)
    await session.commit()
    await session.refresh(intent)
    return intent


async def get_signing_intent(session: AsyncSession, intent_id: int) -> SigningIntent | None:
    result = await session.execute(select(SigningIntent).where(SigningIntent.id == intent_id))
    return result.scalar_one_or_none()


async def update_signing_intent_payload(
    session: AsyncSession,
    intent_id: int,
    payload: dict,
) -> SigningIntent | None:
    intent = await get_signing_intent(session, intent_id)
    if not intent:
        return None
    intent.payload = payload
    await session.commit()
    await session.refresh(intent)
    return intent


async def complete_signing_intent(session: AsyncSession, intent_id: int, signature: str) -> SigningIntent | None:
    intent = await get_signing_intent(session, intent_id)
    if not intent:
        return None
    intent.status = "SIGNED"
    intent.signature = signature
    intent.payload = {
        **(intent.payload or {}),
        "signature_verified": True,
        "signature_verified_at": datetime.utcnow().isoformat(),
    }
    intent.completed_at = datetime.utcnow()
    await session.commit()
    await session.refresh(intent)
    return intent


async def update_signing_intent_submission(
    session: AsyncSession,
    intent_id: int,
    submission: dict,
    status: str | None = None,
) -> SigningIntent | None:
    intent = await get_signing_intent(session, intent_id)
    if not intent:
        return None
    intent.payload = {
        **(intent.payload or {}),
        "order_submission": submission,
    }
    if status:
        intent.status = status
    await session.commit()
    await session.refresh(intent)
    return intent


async def finalize_signing_intent(
    session: AsyncSession,
    intent_id: int,
    tx_hash: str,
    status: str,
) -> SigningIntent | None:
    intent = await get_signing_intent(session, intent_id)
    if not intent:
        return None

    intent.status = status
    intent.payload = {
        **(intent.payload or {}),
        "transaction": {
            "tx_hash": tx_hash,
            "status": status,
            "finalized_at": datetime.utcnow().isoformat(),
        },
    }
    await session.commit()
    await session.refresh(intent)
    return intent
