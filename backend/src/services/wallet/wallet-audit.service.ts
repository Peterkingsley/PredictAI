import type { WalletRepository } from "../../repositories/interfaces/wallet.repository.js";
import type { WalletAuditEvent } from "../../models/wallet/index.js";
import { id, now } from "../../core/utils.js";

export class WalletAuditService {
  constructor(private repo: WalletRepository) {}

  record(input: Omit<WalletAuditEvent, "id" | "createdAt">) {
    const event: WalletAuditEvent = {
      ...input,
      id: id("wallet_audit"),
      createdAt: now(),
    };
    this.repo.walletAuditEvents.push(event);
    return event;
  }
}
