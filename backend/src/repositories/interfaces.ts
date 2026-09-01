import type {
  AIAnalysis,
  Device,
  LedgerEntry,
  Market,
  MarketAlert,
  MarketPoint,
  Notification,
  Post,
  Preferences,
  Privacy,
  PublicPosition,
  Quote,
  Reply,
  Report,
  Session,
  SocialEdges,
  SupportTicket,
  TrustedAddress,
  User,
  WalletSettings,
} from "../models/domain.js";
export interface Repository {
  users: Map<string, User>;
  sessions: Map<string, Session>;
  preferences: Map<string, Preferences>;
  privacy: Map<string, Privacy>;
  walletSettings: Map<string, WalletSettings>;
  trustedAddresses: Map<string, TrustedAddress>;
  markets: Map<string, Market>;
  marketHistory: Map<string, MarketPoint[]>;
  alerts: Map<string, MarketAlert>;
  quotes: Map<string, Quote>;
  predictions: Map<string, import("../models/domain.js").Prediction>;
  ledger: LedgerEntry[];
  idempotency: Map<string, string>;
  analyses: Map<string, AIAnalysis>;
  analysisCache: Map<string, { value: AIAnalysis; expiresAt: number }>;
  posts: Map<string, Post>;
  replies: Map<string, Reply>;
  social: SocialEdges;
  reports: Map<string, Report>;
  positions: Map<string, PublicPosition>;
  notifications: Map<string, Notification>;
  devices: Map<string, Device>;
  supportTickets: Map<string, SupportTicket>;
  locks: Map<string, Promise<void>>;
  clear(): void;
}
