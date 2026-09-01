import type { CustodyProvider } from "../core/providers.js";
import type { Repository } from "../repositories/interfaces.js";
import type { Network } from "../models/domain.js";
import type { UserService } from "./user.service.js";
import { AppError, notFound } from "../core/errors.js";
import { id, now } from "../core/utils.js";
export class WalletService {
  constructor(
    private repo: Repository,
    private users: UserService,
    private custody: CustodyProvider,
  ) {}
  settings(userId: string) {
    return this.users.wallet(userId);
  }
  trusted(userId: string) {
    return [...this.repo.trustedAddresses.values()].filter(
      (a) => a.userId === userId,
    );
  }
  addTrusted(
    userId: string,
    input: { label: string; address: string; network: Network },
  ) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(input.address))
      throw new AppError(
        "INVALID_WALLET_ADDRESS",
        "A valid EVM wallet address is required",
        422,
      );
    const a = {
      id: id("address"),
      userId,
      ...input,
      address: input.address.toLowerCase(),
      createdAt: now(),
    };
    this.repo.trustedAddresses.set(a.id, a);
    return a;
  }
  deleteTrusted(userId: string, id_: string) {
    const a = this.repo.trustedAddresses.get(id_);
    if (!a || a.userId !== userId) throw notFound("Trusted address");
    this.repo.trustedAddresses.delete(id_);
  }
  deposit() {
    return this.custody.depositAddress();
  }
  withdraw() {
    return this.custody.withdraw();
  }
  connect() {
    return this.custody.connect();
  }
}
