import type { WalletAsset } from "../wallet/index.js";

export type WalletLedgerEntryType =
  | "sandbox_credit"
  | "sandbox_deposit"
  | "prediction_stake"
  | "prediction_return"
  | "prediction_refund"
  | "sandbox_withdrawal"
  | "adjustment";

export interface WalletLedgerEntry {
  id: string;
  walletId: string;
  userId: string;
  type: WalletLedgerEntryType;
  asset: WalletAsset;
  amountMinor: bigint;
  direction: "credit" | "debit";
  referenceType:
    "wallet" | "deposit" | "withdrawal" | "prediction" | "adjustment";
  referenceId: string;
  createdAt: string;
}

export interface WalletBalance {
  asset: WalletAsset;
  availableMinor: bigint;
  lockedMinor: bigint;
  totalMinor: bigint;
}
