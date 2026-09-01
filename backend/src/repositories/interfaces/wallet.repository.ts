import type { WalletLedgerEntry } from "../../models/ledger/index.js";
import type {
  DepositIntent,
  PaymentProviderEvent,
  WalletAccount,
  WalletAuditEvent,
  Withdrawal,
  WithdrawalQuote,
} from "../../models/wallet/index.js";

export interface WalletRepository {
  walletAccounts: Map<string, WalletAccount>;
  walletLedger: WalletLedgerEntry[];
  deposits: Map<string, DepositIntent>;
  withdrawalQuotes: Map<string, WithdrawalQuote>;
  withdrawals: Map<string, Withdrawal>;
  walletAuditEvents: WalletAuditEvent[];
  paymentProviderEvents: Map<string, PaymentProviderEvent>;
  walletIdempotency: Map<string, string>;
  locks: Map<string, Promise<void>>;
}
