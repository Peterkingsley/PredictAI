export const WALLET_ASSETS = ["USDC", "USDT"] as const;
export const WALLET_NETWORKS = [
  "ethereum",
  "polygon",
  "arbitrum",
  "base",
] as const;

export type WalletAsset = (typeof WALLET_ASSETS)[number];
export type WalletNetwork = (typeof WALLET_NETWORKS)[number];
export type WalletStatus = "active" | "locked" | "closed";

export interface WalletAccount {
  id: string;
  userId: string;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
}

export type DepositStatus =
  "waiting" | "confirming" | "completed" | "expired" | "failed";

export interface DepositIntent {
  id: string;
  walletId: string;
  userId: string;
  externalId: string;
  mode: "sandbox";
  asset: WalletAsset;
  network: WalletNetwork;
  address: string;
  status: DepositStatus;
  amountMinor?: bigint;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WithdrawalQuote {
  id: string;
  walletId: string;
  userId: string;
  asset: WalletAsset;
  network: WalletNetwork;
  address: string;
  amountMinor: bigint;
  estimatedFeeMinor: bigint;
  estimatedReceiveMinor: bigint;
  expiresAt: string;
  createdAt: string;
}

export type WithdrawalStatus =
  "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface Withdrawal {
  id: string;
  walletId: string;
  userId: string;
  externalId: string;
  quoteId: string;
  mode: "sandbox";
  asset: WalletAsset;
  network: WalletNetwork;
  address: string;
  amountMinor: bigint;
  feeMinor: bigint;
  receiveMinor: bigint;
  status: WithdrawalStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WalletAuditEvent {
  id: string;
  userId: string;
  walletId?: string;
  action:
    | "wallet_created"
    | "deposit_intent_created"
    | "deposit_completed"
    | "withdrawal_requested"
    | "withdrawal_completed"
    | "withdrawal_failed"
    | "wallet_setting_changed"
    | "trusted_address_added"
    | "trusted_address_removed";
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface PaymentProviderEvent {
  providerEventId: string;
  provider: string;
  type: string;
  externalId: string;
  amount?: string;
  processedAt: string;
}
