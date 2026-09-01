import type {
  DepositStatus,
  WalletAsset,
  WalletNetwork,
  WithdrawalStatus,
} from "../../models/wallet/index.js";

export interface PaymentProviderCapabilities {
  mode: "sandbox" | "live";
  deposits: boolean;
  withdrawals: boolean;
  assets: WalletAsset[];
  networks: WalletNetwork[];
}
export interface CreateDepositIntentInput {
  requestId: string;
  walletId: string;
  asset: WalletAsset;
  network: WalletNetwork;
}
export interface ProviderDepositIntent {
  externalId: string;
  address: string;
  status: DepositStatus;
}
export interface ProviderDeposit extends ProviderDepositIntent {
  amount?: string;
  transactionId?: string;
}
export interface CreateWithdrawalIntentInput {
  requestId: string;
  walletId: string;
  asset: WalletAsset;
  network: WalletNetwork;
  address: string;
  amount: string;
}
export interface ProviderWithdrawalIntent {
  externalId: string;
  status: WithdrawalStatus;
}
export interface ProviderWithdrawal extends ProviderWithdrawalIntent {
  transactionId?: string;
}
export interface ParsedPaymentWebhook {
  providerEventId: string;
  type: "deposit.completed" | "withdrawal.completed" | "withdrawal.failed";
  externalId: string;
  amount?: string;
}

export interface PaymentProvider {
  readonly name: string;
  getCapabilities(): Promise<PaymentProviderCapabilities>;
  createDepositIntent(
    input: CreateDepositIntentInput,
  ): Promise<ProviderDepositIntent>;
  getDeposit(externalId: string): Promise<ProviderDeposit>;
  createWithdrawalIntent?(
    input: CreateWithdrawalIntentInput,
  ): Promise<ProviderWithdrawalIntent>;
  getWithdrawal?(externalId: string): Promise<ProviderWithdrawal>;
  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<boolean>;
  parseWebhook(rawBody: Buffer): Promise<ParsedPaymentWebhook>;
}
