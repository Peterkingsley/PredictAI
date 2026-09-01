import { createHash } from "node:crypto";
import { AppError, notFound } from "../../core/errors.js";
import type {
  CreateDepositIntentInput,
  CreateWithdrawalIntentInput,
  ParsedPaymentWebhook,
  PaymentProvider,
  ProviderDeposit,
  ProviderWithdrawal,
} from "./payment-provider.js";

const deterministic = (input: string) =>
  createHash("sha256").update(input).digest("hex").slice(0, 24);

export class SandboxPaymentProvider implements PaymentProvider {
  readonly name = "sandbox";
  private deposits = new Map<string, ProviderDeposit>();
  private withdrawals = new Map<string, ProviderWithdrawal>();

  async getCapabilities() {
    return {
      mode: "sandbox" as const,
      deposits: true,
      withdrawals: true,
      assets: ["USDC", "USDT"] as const as ("USDC" | "USDT")[],
      networks: ["ethereum", "polygon", "arbitrum", "base"] as const as (
        "ethereum" | "polygon" | "arbitrum" | "base"
      )[],
    };
  }
  async createDepositIntent(input: CreateDepositIntentInput) {
    const token = deterministic(
      `${input.walletId}:${input.asset}:${input.network}:${input.requestId}:deposit`,
    );
    const value: ProviderDeposit = {
      externalId: `sandbox_dep_${token}`,
      address: `sandbox_${input.network}_${input.asset.toLowerCase()}_${token}`,
      status: "waiting",
    };
    this.deposits.set(value.externalId, value);
    return value;
  }
  async getDeposit(externalId: string) {
    const value = this.deposits.get(externalId);
    if (!value) throw notFound("Provider deposit");
    return value;
  }
  completeDeposit(externalId: string, amount: string) {
    const value = this.deposits.get(externalId);
    if (!value) throw notFound("Provider deposit");
    Object.assign(value, {
      status: "completed" as const,
      amount,
      transactionId: `sandbox_tx_${deterministic(`${externalId}:${amount}`)}`,
    });
    return value;
  }
  async createWithdrawalIntent(input: CreateWithdrawalIntentInput) {
    const token = deterministic(
      `${input.walletId}:${input.asset}:${input.network}:${input.address}:${input.amount}:${input.requestId}:withdrawal`,
    );
    const value: ProviderWithdrawal = {
      externalId: `sandbox_wd_${token}`,
      status: "processing",
    };
    this.withdrawals.set(value.externalId, value);
    return value;
  }
  async getWithdrawal(externalId: string) {
    const value = this.withdrawals.get(externalId);
    if (!value) throw notFound("Provider withdrawal");
    return value;
  }
  completeWithdrawal(externalId: string) {
    const value = this.withdrawals.get(externalId);
    if (!value) throw notFound("Provider withdrawal");
    Object.assign(value, {
      status: "completed" as const,
      transactionId: `sandbox_tx_${deterministic(externalId)}`,
    });
    return value;
  }
  async verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    _rawBody: Buffer,
  ) {
    return headers["x-sandbox-webhook"] === "true";
  }
  async parseWebhook(rawBody: Buffer): Promise<ParsedPaymentWebhook> {
    try {
      const value = JSON.parse(rawBody.toString()) as ParsedPaymentWebhook;
      if (
        !value.providerEventId ||
        !value.externalId ||
        ![
          "deposit.completed",
          "withdrawal.completed",
          "withdrawal.failed",
        ].includes(value.type)
      )
        throw new Error("invalid sandbox event");
      return value;
    } catch {
      throw new AppError(
        "INVALID_PAYMENT_WEBHOOK",
        "Sandbox payment event is invalid",
        422,
      );
    }
  }
}
