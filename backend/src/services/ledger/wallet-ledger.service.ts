import type { Config } from "../../core/config.js";
import { AppError, notFound } from "../../core/errors.js";
import { fromMinor, id, now, toMinor } from "../../core/utils.js";
import type {
  WalletBalance,
  WalletLedgerEntry,
  WalletLedgerEntryType,
} from "../../models/ledger/index.js";
import type { WalletAsset } from "../../models/wallet/index.js";
import type { WalletRepository } from "../../repositories/interfaces/wallet.repository.js";
import type { NotificationService } from "../notification.service.js";
import type { WalletAuditService } from "../wallet/wallet-audit.service.js";

export class WalletLedgerService {
  constructor(
    private repo: WalletRepository,
    private config: Config,
    private audit: WalletAuditService,
    private notifications: NotificationService,
  ) {}

  ensureWallet(userId: string) {
    let wallet = [...this.repo.walletAccounts.values()].find(
      (value) => value.userId === userId,
    );
    if (wallet) return wallet;
    const stamp = now();
    wallet = {
      id: id("wallet"),
      userId,
      status: "active",
      createdAt: stamp,
      updatedAt: stamp,
    };
    this.repo.walletAccounts.set(wallet.id, wallet);
    this.record({
      walletId: wallet.id,
      userId,
      type: "sandbox_credit",
      asset: "USDC",
      amountMinor: toMinor(this.config.PAPER_STARTING_BALANCE),
      direction: "credit",
      referenceType: "wallet",
      referenceId: wallet.id,
    });
    this.audit.record({
      userId,
      walletId: wallet.id,
      action: "wallet_created",
      resourceType: "wallet",
      resourceId: wallet.id,
      metadata: { mode: "sandbox" },
    });
    return wallet;
  }

  walletForUser(userId: string) {
    const wallet = this.ensureWallet(userId);
    if (wallet.status !== "active")
      throw new AppError("WALLET_UNAVAILABLE", "Wallet is not active", 423);
    return wallet;
  }

  getOwned(userId: string, walletId: string) {
    const wallet = this.repo.walletAccounts.get(walletId);
    if (!wallet || wallet.userId !== userId) throw notFound("Wallet");
    return wallet;
  }

  record(input: Omit<WalletLedgerEntry, "id" | "createdAt">) {
    const duplicate = this.repo.walletLedger.find(
      (entry) =>
        entry.walletId === input.walletId &&
        entry.type === input.type &&
        entry.referenceType === input.referenceType &&
        entry.referenceId === input.referenceId,
    );
    if (duplicate) return duplicate;
    if (input.amountMinor <= 0n)
      throw new AppError(
        "INVALID_LEDGER_AMOUNT",
        "Ledger amount must be positive",
        422,
      );
    const entry = Object.freeze({
      ...input,
      id: id("wallet_ledger"),
      createdAt: now(),
    }) as WalletLedgerEntry;
    this.repo.walletLedger.push(entry);
    return entry;
  }

  balance(walletId: string, asset: WalletAsset): WalletBalance {
    const availableMinor = this.repo.walletLedger
      .filter((entry) => entry.walletId === walletId && entry.asset === asset)
      .reduce(
        (total, entry) =>
          total +
          (entry.direction === "credit"
            ? entry.amountMinor
            : -entry.amountMinor),
        0n,
      );
    return {
      asset,
      availableMinor,
      lockedMinor: 0n,
      totalMinor: availableMinor,
    };
  }

  available(userId: string, asset: WalletAsset = "USDC") {
    const wallet = this.walletForUser(userId);
    return this.balance(wallet.id, asset).availableMinor;
  }

  assertAvailable(userId: string, asset: WalletAsset, amountMinor: bigint) {
    if (this.available(userId, asset) < amountMinor)
      throw new AppError(
        "INSUFFICIENT_WALLET_BALANCE",
        "Insufficient sandbox wallet balance",
        409,
      );
  }

  debit(
    userId: string,
    asset: WalletAsset,
    amountMinor: bigint,
    type: Extract<
      WalletLedgerEntryType,
      "prediction_stake" | "sandbox_withdrawal"
    >,
    referenceType: "prediction" | "withdrawal",
    referenceId: string,
  ) {
    const wallet = this.walletForUser(userId);
    this.assertAvailable(userId, asset, amountMinor);
    return this.record({
      walletId: wallet.id,
      userId,
      type,
      asset,
      amountMinor,
      direction: "debit",
      referenceType,
      referenceId,
    });
  }

  credit(
    userId: string,
    asset: WalletAsset,
    amountMinor: bigint,
    type: Extract<
      WalletLedgerEntryType,
      "sandbox_deposit" | "prediction_return" | "prediction_refund"
    >,
    referenceType: "deposit" | "prediction",
    referenceId: string,
  ) {
    const wallet = this.walletForUser(userId);
    return this.record({
      walletId: wallet.id,
      userId,
      type,
      asset,
      amountMinor,
      direction: "credit",
      referenceType,
      referenceId,
    });
  }

  stakePrediction(userId: string, predictionId: string, amountMinor: bigint) {
    const entry = this.debit(
      userId,
      "USDC",
      amountMinor,
      "prediction_stake",
      "prediction",
      predictionId,
    );
    this.notifications.create(
      userId,
      "wallet",
      "Prediction stake deducted",
      `${fromMinor(amountMinor)} USDC was deducted from your sandbox wallet.`,
      { predictionId },
      `wallet:prediction:stake:${predictionId}`,
    );
    return entry;
  }

  settlePrediction(userId: string, predictionId: string, amountMinor: bigint) {
    const entry = this.credit(
      userId,
      "USDC",
      amountMinor,
      "prediction_return",
      "prediction",
      predictionId,
    );
    this.notifications.create(
      userId,
      "wallet",
      "Prediction settled",
      `${fromMinor(amountMinor)} USDC was credited to your sandbox wallet.`,
      { predictionId },
      `wallet:prediction:settled:${predictionId}`,
    );
    return entry;
  }

  refundPrediction(userId: string, predictionId: string, amountMinor: bigint) {
    const entry = this.credit(
      userId,
      "USDC",
      amountMinor,
      "prediction_refund",
      "prediction",
      predictionId,
    );
    this.notifications.create(
      userId,
      "wallet",
      "Prediction settled",
      `${fromMinor(amountMinor)} USDC was refunded to your sandbox wallet.`,
      { predictionId },
      `wallet:prediction:refund:${predictionId}`,
    );
    return entry;
  }

  restoreFailedWithdrawal(
    userId: string,
    withdrawalId: string,
    asset: WalletAsset,
    amountMinor: bigint,
  ) {
    const wallet = this.walletForUser(userId);
    return this.record({
      walletId: wallet.id,
      userId,
      type: "adjustment",
      asset,
      amountMinor,
      direction: "credit",
      referenceType: "withdrawal",
      referenceId: withdrawalId,
    });
  }

  serializeBalance(balance: WalletBalance) {
    return {
      asset: balance.asset,
      available: fromMinor(balance.availableMinor),
      locked: fromMinor(balance.lockedMinor),
      total: fromMinor(balance.totalMinor),
    };
  }
}
