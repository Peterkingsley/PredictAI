import { AppError, notFound } from "../../core/errors.js";
import { fromMinor, id, now, page, toMinor } from "../../core/utils.js";
import type { PaymentProvider } from "../../integrations/payments/payment-provider.js";
import { SandboxPaymentProvider } from "../../integrations/payments/sandbox-payment-provider.js";
import type {
  DepositIntent,
  DepositStatus,
  WalletAsset,
  WalletNetwork,
} from "../../models/wallet/index.js";
import type { Repository } from "../../repositories/interfaces.js";
import type { WalletLedgerService } from "../ledger/wallet-ledger.service.js";
import type { NotificationService } from "../notification.service.js";
import type { WalletAuditService } from "../wallet/wallet-audit.service.js";
import type { WalletService } from "../wallet/wallet.service.js";

export class DepositService {
  constructor(
    private repo: Repository,
    private provider: PaymentProvider,
    private ledger: WalletLedgerService,
    private wallet: WalletService,
    private audit: WalletAuditService,
    private notifications: NotificationService,
  ) {}

  async create(
    userId: string,
    input: { asset: WalletAsset; network: WalletNetwork },
    idempotencyKey: string,
  ) {
    if (!idempotencyKey || idempotencyKey.length > 128)
      throw new AppError(
        "IDEMPOTENCY_KEY_REQUIRED",
        "A valid Idempotency-Key header is required",
        400,
      );
    this.wallet.assertAssetEnabled(userId, input.asset);
    const key = `deposit:${userId}:${idempotencyKey}`;
    const previous = this.repo.walletIdempotency.get(key);
    if (previous) return this.serialize(this.repo.deposits.get(previous)!);
    const wallet = this.ledger.walletForUser(userId);
    const depositId = id("deposit");
    const provider = await this.provider.createDepositIntent({
      requestId: depositId,
      walletId: wallet.id,
      ...input,
    });
    const stamp = now();
    const deposit: DepositIntent = {
      id: depositId,
      walletId: wallet.id,
      userId,
      externalId: provider.externalId,
      mode: "sandbox",
      asset: input.asset,
      network: input.network,
      address: provider.address,
      status: provider.status,
      createdAt: stamp,
      updatedAt: stamp,
    };
    this.repo.deposits.set(deposit.id, deposit);
    this.repo.walletIdempotency.set(key, deposit.id);
    this.audit.record({
      userId,
      walletId: wallet.id,
      action: "deposit_intent_created",
      resourceType: "deposit",
      resourceId: deposit.id,
      metadata: { asset: input.asset, network: input.network },
    });
    return this.serialize(deposit);
  }

  get(userId: string, depositId: string) {
    const deposit = this.repo.deposits.get(depositId);
    if (!deposit || deposit.userId !== userId) throw notFound("Deposit");
    return this.serialize(deposit);
  }

  list(
    userId: string,
    filters: {
      asset?: WalletAsset;
      network?: WalletNetwork;
      status?: DepositStatus;
      cursor?: string;
      limit?: number;
    },
  ) {
    let data = [...this.repo.deposits.values()].filter(
      (deposit) => deposit.userId === userId,
    );
    if (filters.asset)
      data = data.filter((deposit) => deposit.asset === filters.asset);
    if (filters.network)
      data = data.filter((deposit) => deposit.network === filters.network);
    if (filters.status)
      data = data.filter((deposit) => deposit.status === filters.status);
    data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const result = page(data, filters.cursor, filters.limit);
    return {
      ...result,
      data: result.data.map((value) => this.serialize(value)),
    };
  }

  simulate(userId: string, depositId: string, amount: string) {
    const deposit = this.repo.deposits.get(depositId);
    if (!deposit || deposit.userId !== userId) throw notFound("Deposit");
    return this.complete(deposit, amount);
  }

  completeByExternal(externalId: string, amount?: string) {
    const deposit = [...this.repo.deposits.values()].find(
      (value) => value.externalId === externalId,
    );
    if (!deposit) throw notFound("Deposit");
    if (!amount)
      throw new AppError(
        "DEPOSIT_AMOUNT_REQUIRED",
        "Completed deposits require an amount",
        422,
      );
    return this.complete(deposit, amount);
  }

  private complete(deposit: DepositIntent, amount: string) {
    if (deposit.status === "completed") return this.serialize(deposit);
    if (!(this.provider instanceof SandboxPaymentProvider))
      throw new AppError(
        "SANDBOX_PROVIDER_REQUIRED",
        "Deposit simulation requires the sandbox provider",
        409,
      );
    const amountMinor = toMinor(amount);
    const provider = this.provider.completeDeposit(deposit.externalId, amount);
    deposit.status = "completed";
    deposit.amountMinor = amountMinor;
    deposit.transactionId = provider.transactionId;
    deposit.updatedAt = now();
    deposit.completedAt = deposit.updatedAt;
    this.ledger.credit(
      deposit.userId,
      deposit.asset,
      amountMinor,
      "sandbox_deposit",
      "deposit",
      deposit.id,
    );
    this.audit.record({
      userId: deposit.userId,
      walletId: deposit.walletId,
      action: "deposit_completed",
      resourceType: "deposit",
      resourceId: deposit.id,
      metadata: { asset: deposit.asset, network: deposit.network },
    });
    if (this.wallet.settings(deposit.userId).transactionNotifications) {
      this.notifications.create(
        deposit.userId,
        "wallet",
        "Deposit detected",
        `A sandbox ${deposit.asset} deposit was detected.`,
        { depositId: deposit.id },
        `wallet:deposit:detected:${deposit.id}`,
      );
      this.notifications.create(
        deposit.userId,
        "wallet",
        "Deposit completed",
        `${fromMinor(amountMinor)} ${deposit.asset} is available in your sandbox wallet.`,
        { depositId: deposit.id },
        `wallet:deposit:completed:${deposit.id}`,
      );
    }
    return this.serialize(deposit);
  }

  private serialize(deposit: DepositIntent) {
    return {
      ...deposit,
      amount: deposit.amountMinor ? fromMinor(deposit.amountMinor) : undefined,
      amountMinor: undefined,
    };
  }
}
