import { AppError, notFound } from "../../core/errors.js";
import { fromMinor, id, now, page } from "../../core/utils.js";
import { WALLET_ASSETS } from "../../models/wallet/index.js";
import type { WalletAsset, WalletNetwork } from "../../models/wallet/index.js";
import type { Repository } from "../../repositories/interfaces.js";
import type { UserService } from "../user.service.js";
import type { WalletLedgerService } from "../ledger/wallet-ledger.service.js";
import type { WalletAuditService } from "./wallet-audit.service.js";

export class WalletService {
  constructor(
    private repo: Repository,
    private users: UserService,
    private ledger: WalletLedgerService,
    private audit: WalletAuditService,
  ) {}

  overview(userId: string) {
    const wallet = this.ledger.walletForUser(userId);
    const open = [...this.repo.predictions.values()].filter(
      (prediction) =>
        prediction.userId === userId && prediction.status === "open",
    );
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const settledToday = [...this.repo.predictions.values()].filter(
      (prediction) =>
        prediction.userId === userId &&
        prediction.resolvedAt &&
        Date.parse(prediction.resolvedAt) >= start.getTime(),
    );
    const realizedMinor = settledToday.reduce(
      (total, prediction) =>
        total + prediction.payoutMinor - prediction.amountMinor,
      0n,
    );
    return {
      id: wallet.id,
      mode: "sandbox" as const,
      status: wallet.status,
      balances: WALLET_ASSETS.map((asset) =>
        this.ledger.serializeBalance(this.ledger.balance(wallet.id, asset)),
      ),
      unrealizedPnl: "0.00",
      realizedPnlToday: fromMinor(realizedMinor),
      positionValue: fromMinor(
        open.reduce((total, prediction) => total + prediction.amountMinor, 0n),
      ),
    };
  }

  settings(userId: string) {
    return this.users.wallet(userId);
  }

  updateSettings(
    userId: string,
    input: Partial<
      Omit<ReturnType<UserService["wallet"]>, "supportedAssets">
    > & {
      supportedAssets?: Partial<
        ReturnType<UserService["wallet"]>["supportedAssets"]
      >;
    },
  ) {
    const wallet = this.ledger.walletForUser(userId);
    const current = this.settings(userId);
    const supportedAssets = {
      ...current.supportedAssets,
      ...input.supportedAssets,
    };
    if (!supportedAssets.USDC && !supportedAssets.USDT)
      throw new AppError(
        "ONE_ASSET_REQUIRED",
        "At least one wallet asset must remain enabled",
        422,
      );
    Object.assign(current, input, {
      supportedAssets,
      connectedWallet: null,
    });
    this.audit.record({
      userId,
      walletId: wallet.id,
      action: "wallet_setting_changed",
      resourceType: "wallet_settings",
      resourceId: wallet.id,
      metadata: { changedFields: Object.keys(input).sort().join(",") },
    });
    return current;
  }

  assertAssetEnabled(userId: string, asset: WalletAsset) {
    if (!this.settings(userId).supportedAssets[asset])
      throw new AppError(
        "ASSET_DISABLED",
        `${asset} is disabled in wallet settings`,
        422,
      );
  }

  trusted(userId: string) {
    return [...this.repo.trustedAddresses.values()].filter(
      (address) => address.userId === userId,
    );
  }

  addTrusted(
    userId: string,
    input: { label: string; address: string; network: WalletNetwork },
  ) {
    const wallet = this.ledger.walletForUser(userId);
    if (!/^0x[a-fA-F0-9]{40}$/.test(input.address))
      throw new AppError(
        "INVALID_WALLET_ADDRESS",
        "A valid EVM wallet address is required",
        422,
      );
    const duplicate = this.trusted(userId).find(
      (value) =>
        value.address.toLowerCase() === input.address.toLowerCase() &&
        value.network === input.network,
    );
    if (duplicate) return duplicate;
    const address = {
      id: id("address"),
      userId,
      label: input.label.trim(),
      address: input.address.toLowerCase(),
      network: input.network,
      createdAt: now(),
    };
    this.repo.trustedAddresses.set(address.id, address);
    this.audit.record({
      userId,
      walletId: wallet.id,
      action: "trusted_address_added",
      resourceType: "trusted_address",
      resourceId: address.id,
      metadata: { network: address.network },
    });
    return address;
  }

  deleteTrusted(userId: string, addressId: string) {
    const address = this.repo.trustedAddresses.get(addressId);
    if (!address || address.userId !== userId)
      throw notFound("Trusted address");
    const wallet = this.ledger.walletForUser(userId);
    this.repo.trustedAddresses.delete(addressId);
    this.audit.record({
      userId,
      walletId: wallet.id,
      action: "trusted_address_removed",
      resourceType: "trusted_address",
      resourceId: addressId,
      metadata: { network: address.network },
    });
  }

  history(
    userId: string,
    filters: {
      type?: "deposit" | "withdrawal" | "prediction";
      status?: string;
      asset?: WalletAsset;
      cursor?: string;
      limit?: number;
    },
  ) {
    const wallet = this.ledger.walletForUser(userId);
    let data = this.repo.walletLedger
      .filter((entry) => entry.walletId === wallet.id)
      .map((entry) => {
        const deposit =
          entry.referenceType === "deposit"
            ? this.repo.deposits.get(entry.referenceId)
            : undefined;
        const withdrawal =
          entry.referenceType === "withdrawal"
            ? this.repo.withdrawals.get(entry.referenceId)
            : undefined;
        const prediction =
          entry.referenceType === "prediction"
            ? this.repo.predictions.get(entry.referenceId)
            : undefined;
        return {
          id: entry.id,
          type: entry.referenceType,
          activityType: entry.type,
          asset: entry.asset,
          amount: fromMinor(entry.amountMinor),
          direction: entry.direction,
          status:
            deposit?.status ??
            withdrawal?.status ??
            prediction?.status ??
            "completed",
          referenceId: entry.referenceId,
          network: deposit?.network ?? withdrawal?.network,
          transactionId: deposit?.transactionId ?? withdrawal?.transactionId,
          createdAt: entry.createdAt,
        };
      });
    if (filters.type)
      data = data.filter((entry) => entry.type === filters.type);
    if (filters.status)
      data = data.filter((entry) => entry.status === filters.status);
    if (filters.asset)
      data = data.filter((entry) => entry.asset === filters.asset);
    data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return page(data, filters.cursor, filters.limit);
  }
}
