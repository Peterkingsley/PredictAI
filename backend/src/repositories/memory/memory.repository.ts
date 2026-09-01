import type { Repository } from "../interfaces.js";
import type {
  AIAnalysis,
  Device,
  LedgerEntry,
  Market,
  MarketAlert,
  MarketPoint,
  Notification,
  Post,
  Prediction,
  Preferences,
  Privacy,
  PublicPosition,
  Quote,
  Reply,
  Report,
  Session,
  SupportTicket,
  TrustedAddress,
  User,
  WalletSettings,
} from "../../models/domain.js";
import {
  marketFixtures,
  marketHistoryFixtures,
} from "../../fixtures/markets.js";
const clone = <T>(v: T): T => structuredClone(v);
export class MemoryRepository implements Repository {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  preferences = new Map<string, Preferences>();
  privacy = new Map<string, Privacy>();
  walletSettings = new Map<string, WalletSettings>();
  trustedAddresses = new Map<string, TrustedAddress>();
  markets = new Map<string, Market>(
    marketFixtures.map((m) => [m.id, clone(m)]),
  );
  marketHistory = new Map<string, MarketPoint[]>(
    [...marketHistoryFixtures].map(([k, v]) => [k, clone(v)]),
  );
  alerts = new Map<string, MarketAlert>();
  quotes = new Map<string, Quote>();
  predictions = new Map<string, Prediction>();
  ledger: LedgerEntry[] = [];
  idempotency = new Map<string, string>();
  analyses = new Map<string, AIAnalysis>();
  analysisCache = new Map<string, { value: AIAnalysis; expiresAt: number }>();
  posts = new Map<string, Post>();
  replies = new Map<string, Reply>();
  social = {
    follows: new Set<string>(),
    likes: new Set<string>(),
    saves: new Set<string>(),
    reposts: new Set<string>(),
    replyLikes: new Set<string>(),
    mutes: new Set<string>(),
    blocks: new Set<string>(),
  };
  reports = new Map<string, Report>();
  positions = new Map<string, PublicPosition>();
  notifications = new Map<string, Notification>();
  devices = new Map<string, Device>();
  supportTickets = new Map<string, SupportTicket>();
  locks = new Map<string, Promise<void>>();
  clear() {
    this.users.clear();
    this.sessions.clear();
    this.preferences.clear();
    this.privacy.clear();
    this.walletSettings.clear();
    this.trustedAddresses.clear();
    this.alerts.clear();
    this.quotes.clear();
    this.predictions.clear();
    this.ledger = [];
    this.idempotency.clear();
    this.analyses.clear();
    this.analysisCache.clear();
    this.posts.clear();
    this.replies.clear();
    this.social.follows.clear();
    this.social.likes.clear();
    this.social.saves.clear();
    this.social.reposts.clear();
    this.social.replyLikes.clear();
    this.social.mutes.clear();
    this.social.blocks.clear();
    this.reports.clear();
    this.positions.clear();
    this.notifications.clear();
    this.devices.clear();
    this.supportTickets.clear();
  }
}
