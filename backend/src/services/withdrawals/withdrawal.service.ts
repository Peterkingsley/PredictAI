import { AppError, notFound } from "../../core/errors.js";
import { fromMinor, id, now, page, toMinor } from "../../core/utils.js";
import type { PaymentProvider } from "../../integrations/payments/payment-provider.js";
import { SandboxPaymentProvider } from "../../integrations/payments/sandbox-payment-provider.js";
import type {
  WalletAsset,
  WalletNetwork,
  Withdrawal,
  WithdrawalStatus,
} from "../../models/wallet/index.js";
import type { Repository } from "../../repositories/interfaces.js";
import type { WalletLedgerService } from "../ledger/wallet-ledger.service.js";
import type { NotificationService } from "../notification.service.js";
import type { WalletAuditService } from "../wallet/wallet-audit.service.js";
import type { WalletService } from "../wallet/wallet.service.js";

export class WithdrawalService {
  constructor(
    private repo: Repository,
    private provider: PaymentProvider,
    private ledger: WalletLedgerService,
    private wallet: WalletService,
    private audit: WalletAuditService,
    private notifications: NotificationService,
  ) {}

  quote(
    userId: string,
    input: {
      asset: WalletAsset;
      network: WalletNetwork;
      address: string;
      amount: string;
    },
  ) {
    this.wallet.assertAssetEnabled(userId, input.asset);
    if (!/^0x[a-fA-F0-9]{40}$/.test(input.address))
      throw new AppError(
        "INVALID_WALLET_ADDRESS",
        "A valid EVM wallet address is required",
        422,
      );
    const wallet = this.ledger.walletForUser(userId);
    const amountMinor = toMinor(input.amount);
    this.ledger.assertAvailable(userId, input.asset, amountMinor);
    this.assertDailyLimit(userId, amountMinor);
    const settings = this.wallet.settings(userId);
    const feeMinor = settings.feeSpeed === "Fast" ? 25n : 10n;
    if (amountMinor <= feeMinor)
      throw new AppError(
        "AMOUNT_BELOW_FEE",
        "Withdrawal amount must be greater than the estimated fee",
        422,
      );
    const stamp = now();
    const quote = {
      id: id("withdrawal_quote"),
      walletId: wallet.id,
      userId,
      asset: input.asset,
      network: input.network,
      address: input.address.toLowerCase(),
      amountMinor,
      estimatedFeeMinor: feeMinor,
      estimatedReceiveMinor: amountMinor - feeMinor,
      createdAt: stamp,
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    };
    this.repo.withdrawalQuotes.set(quote.id, quote);
    return this.serializeQuote(quote);
  }

  async create(userId: string, quoteId: string, idempotencyKey: string) {
    if (!idempotencyKey || idempotencyKey.length > 128)
      throw new AppError(
        "IDEMPOTENCY_KEY_REQUIRED",
        "A valid Idempotency-Key header is required",
        400,
      );
    const key = `withdrawal:${userId}:${idempotencyKey}`;
    const previous = this.repo.walletIdempotency.get(key);
    if (previous) return this.serialize(this.repo.withdrawals.get(previous)!);
    return this.withUserLock(userId, async () => {
      const repeated = this.repo.walletIdempotency.get(key);
      if (repeated) return this.serialize(this.repo.withdrawals.get(repeated)!);
      const quote = this.repo.withdrawalQuotes.get(quoteId);
      if (!quote || quote.userId !== userId) throw notFound("Withdrawal quote");
      if (Date.parse(quote.expiresAt) <= Date.now())
        throw new AppError(
          "WITHDRAWAL_QUOTE_EXPIRED",
          "Withdrawal quote has expired",
          409,
        );
      this.wallet.assertAssetEnabled(userId, quote.asset);
      this.ledger.assertAvailable(userId, quote.asset, quote.amountMinor);
      this.assertDailyLimit(userId, quote.amountMinor);
      if (!this.provider.createWithdrawalIntent)
        throw new AppError(
          "WITHDRAWALS_NOT_SUPPORTED",
          "Payment provider does not support withdrawals",
          501,
        );
      const withdrawalId = id("withdrawal");
      const provider = await this.provider.createWithdrawalIntent({
        requestId: withdrawalId,
        walletId: quote.walletId,
        asset: quote.asset,
        network: quote.network,
        address: quote.address,
        amount: fromMinor(quote.amountMinor),
      });
      const stamp = now();
      const withdrawal: Withdrawal = {
        id: withdrawalId,
        walletId: quote.walletId,
        userId,
        externalId: provider.externalId,
        quoteId: quote.id,
        mode: "sandbox",
        asset: quote.asset,
        network: quote.network,
        address: quote.address,
        amountMinor: quote.amountMinor,
        feeMinor: quote.estimatedFeeMinor,
        receiveMinor: quote.estimatedReceiveMinor,
        status: "processing",
        createdAt: stamp,
        updatedAt: stamp,
      };
      this.ledger.debit(
        userId,
        withdrawal.asset,
        withdrawal.amountMinor,
        "sandbox_withdrawal",
        "withdrawal",
        withdrawal.id,
      );
      this.repo.withdrawals.set(withdrawal.id, withdrawal);
      this.repo.walletIdempotency.set(key, withdrawal.id);
      this.audit.record({
        userId,
        walletId: quote.walletId,
        action: "withdrawal_requested",
        resourceType: "withdrawal",
        resourceId: withdrawal.id,
        metadata: { asset: quote.asset, network: quote.network },
      });
      if (this.wallet.settings(userId).transactionNotifications)
        this.notifications.create(
          userId,
          "wallet",
          "Withdrawal submitted",
          `Your ${fromMinor(withdrawal.amountMinor)} ${withdrawal.asset} sandbox withdrawal is processing.`,
          { withdrawalId: withdrawal.id },
          `wallet:withdrawal:submitted:${withdrawal.id}`,
        );
      return this.serialize(withdrawal);
    });
  }

  get(userId: string, withdrawalId: string) {
    const withdrawal = this.repo.withdrawals.get(withdrawalId);
    if (!withdrawal || withdrawal.userId !== userId)
      throw notFound("Withdrawal");
    return this.serialize(withdrawal);
  }

  list(
    userId: string,
    filters: {
      asset?: WalletAsset;
      network?: WalletNetwork;
      status?: WithdrawalStatus;
      cursor?: string;
      limit?: number;
    },
  ) {
    let data = [...this.repo.withdrawals.values()].filter(
      (withdrawal) => withdrawal.userId === userId,
    );
    if (filters.asset)
      data = data.filter((withdrawal) => withdrawal.asset === filters.asset);
    if (filters.network)
      data = data.filter(
        (withdrawal) => withdrawal.network === filters.network,
      );
    if (filters.status)
      data = data.filter((withdrawal) => withdrawal.status === filters.status);
    data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const result = page(data, filters.cursor, filters.limit);
    return {
      ...result,
      data: result.data.map((value) => this.serialize(value)),
    };
  }

  complete(userId: string, withdrawalId: string) {
    const withdrawal = this.repo.withdrawals.get(withdrawalId);
    if (!withdrawal || withdrawal.userId !== userId)
      throw notFound("Withdrawal");
    return this.completeRecord(withdrawal);
  }

  completeByExternal(externalId: string) {
    const withdrawal = [...this.repo.withdrawals.values()].find(
      (value) => value.externalId === externalId,
    );
    if (!withdrawal) throw notFound("Withdrawal");
    return this.completeRecord(withdrawal);
  }

  failByExternal(externalId: string) {
    const withdrawal = [...this.repo.withdrawals.values()].find(
      (value) => value.externalId === externalId,
    );
    if (!withdrawal) throw notFound("Withdrawal");
    if (withdrawal.status === "failed") return this.serialize(withdrawal);
    if (withdrawal.status === "completed")
      throw new AppError(
        "WITHDRAWAL_ALREADY_COMPLETED",
        "A completed withdrawal cannot be marked as failed",
        409,
      );
    withdrawal.status = "failed";
    withdrawal.updatedAt = now();
    this.ledger.restoreFailedWithdrawal(
      withdrawal.userId,
      withdrawal.id,
      withdrawal.asset,
      withdrawal.amountMinor,
    );
    this.audit.record({
      userId: withdrawal.userId,
      walletId: withdrawal.walletId,
      action: "withdrawal_failed",
      resourceType: "withdrawal",
      resourceId: withdrawal.id,
      metadata: { asset: withdrawal.asset, network: withdrawal.network },
    });
    if (this.wallet.settings(withdrawal.userId).transactionNotifications)
      this.notifications.create(
        withdrawal.userId,
        "wallet",
        "Withdrawal failed",
        `Your ${fromMinor(withdrawal.amountMinor)} ${withdrawal.asset} sandbox withdrawal failed and the balance was restored.`,
        { withdrawalId: withdrawal.id },
        `wallet:withdrawal:failed:${withdrawal.id}`,
      );
    return this.serialize(withdrawal);
  }

  private completeRecord(withdrawal: Withdrawal) {
    if (withdrawal.status === "completed") return this.serialize(withdrawal);
    if (!(this.provider instanceof SandboxPaymentProvider))
      throw new AppError(
        "SANDBOX_PROVIDER_REQUIRED",
        "Withdrawal simulation requires the sandbox provider",
        409,
      );
    const provider = this.provider.completeWithdrawal(withdrawal.externalId);
    withdrawal.status = "completed";
    withdrawal.transactionId = provider.transactionId;
    withdrawal.updatedAt = now();
    withdrawal.completedAt = withdrawal.updatedAt;
    this.audit.record({
      userId: withdrawal.userId,
      walletId: withdrawal.walletId,
      action: "withdrawal_completed",
      resourceType: "withdrawal",
      resourceId: withdrawal.id,
      metadata: { asset: withdrawal.asset, network: withdrawal.network },
    });
    if (this.wallet.settings(withdrawal.userId).transactionNotifications)
      this.notifications.create(
        withdrawal.userId,
        "wallet",
        "Withdrawal completed",
        `Your ${fromMinor(withdrawal.amountMinor)} ${withdrawal.asset} sandbox withdrawal is complete.`,
        { withdrawalId: withdrawal.id },
        `wallet:withdrawal:completed:${withdrawal.id}`,
      );
    return this.serialize(withdrawal);
  }

  private assertDailyLimit(userId: string, amountMinor: bigint) {
    const limitMinor = toMinor(this.wallet.settings(userId).withdrawalLimit);
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const spent = [...this.repo.withdrawals.values()]
      .filter(
        (withdrawal) =>
          withdrawal.userId === userId &&
          !["failed", "cancelled"].includes(withdrawal.status) &&
          Date.parse(withdrawal.createdAt) >= start.getTime(),
      )
      .reduce((total, withdrawal) => total + withdrawal.amountMinor, 0n);
    if (spent + amountMinor > limitMinor)
      throw new AppError(
        "DAILY_WITHDRAWAL_LIMIT_EXCEEDED",
        "Daily sandbox withdrawal limit exceeded",
        409,
      );
  }

  private async withUserLock<T>(userId: string, work: () => Promise<T>) {
    const previous = this.repo.locks.get(userId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.repo.locks.set(userId, queued);
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.repo.locks.get(userId) === queued)
        this.repo.locks.delete(userId);
    }
  }

  private serializeQuote(
    quote: import("../../models/wallet/index.js").WithdrawalQuote,
  ) {
    return {
      quoteId: quote.id,
      asset: quote.asset,
      network: quote.network,
      address: quote.address,
      amount: fromMinor(quote.amountMinor),
      estimatedFee: fromMinor(quote.estimatedFeeMinor),
      estimatedReceive: fromMinor(quote.estimatedReceiveMinor),
      expiresAt: quote.expiresAt,
    };
  }

  private serialize(withdrawal: Withdrawal) {
    return {
      ...withdrawal,
      amount: fromMinor(withdrawal.amountMinor),
      fee: fromMinor(withdrawal.feeMinor),
      receive: fromMinor(withdrawal.receiveMinor),
      amountMinor: undefined,
      feeMinor: undefined,
      receiveMinor: undefined,
    };
  }
}
