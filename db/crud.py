from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import User, Wallet


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
