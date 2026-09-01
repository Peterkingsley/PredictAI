import type { Config } from "../../core/config.js";
import { AppError } from "../../core/errors.js";
import { now } from "../../core/utils.js";
import type { PaymentProvider } from "../../integrations/payments/payment-provider.js";
import type { Repository } from "../../repositories/interfaces.js";
import type { DepositService } from "../deposits/deposit.service.js";
import type { WithdrawalService } from "../withdrawals/withdrawal.service.js";

export class PaymentWebhookService {
  constructor(
    private repo: Repository,
    private config: Config,
    private provider: PaymentProvider,
    private deposits: DepositService,
    private withdrawals: WithdrawalService,
  ) {}

  async process(
    providerName: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ) {
    if (providerName !== this.provider.name)
      throw new AppError(
        "PAYMENT_PROVIDER_NOT_ENABLED",
        "Payment provider is not enabled",
        404,
      );
    if (this.config.NODE_ENV === "production")
      throw new AppError(
        "SANDBOX_WEBHOOK_DISABLED",
        "Sandbox webhooks are disabled in production",
        403,
      );
    if (!(await this.provider.verifyWebhook(headers, rawBody)))
      throw new AppError(
        "INVALID_PAYMENT_WEBHOOK_SIGNATURE",
        "Payment webhook could not be verified",
        401,
      );
    const event = await this.provider.parseWebhook(rawBody);
    const previous = this.repo.paymentProviderEvents.get(event.providerEventId);
    if (previous) return { duplicate: true, event: previous };
    if (event.type === "deposit.completed")
      this.deposits.completeByExternal(event.externalId, event.amount);
    else if (event.type === "withdrawal.completed")
      this.withdrawals.completeByExternal(event.externalId);
    else this.withdrawals.failByExternal(event.externalId);
    const processed = {
      ...event,
      provider: providerName,
      processedAt: now(),
    };
    this.repo.paymentProviderEvents.set(event.providerEventId, processed);
    return { duplicate: false, event: processed };
  }
}
