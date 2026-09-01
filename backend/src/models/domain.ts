export type UserStatus = "active" | "suspended" | "deleted";
export type Platform = "android" | "ios" | "web";
export type Currency = "USD" | "NGN" | "USDC";
export type Network = "ethereum" | "polygon" | "arbitrum" | "base";
export type MarketStatus = "open" | "closed" | "resolved" | "cancelled";
export type PostType =
  "insight" | "market" | "position" | "portfolio" | "ai_analysis" | "quote";

export interface User {
  id: string;
  googleSubject: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio: string;
  specializations: string[];
  createdAt: string;
  updatedAt: string;
  status: UserStatus;
}
export interface Session {
  id: string;
  userId: string;
  platform: Platform;
  refreshHash: string;
  familyId: string;
  previousHashes: string[];
  expiresAt: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string;
  ip?: string;
  userAgent?: string;
}
export interface Preferences {
  userId: string;
  theme: "dark" | "light" | "system";
  language: "en" | "fr";
  defaultCurrency: Currency;
  dailyPaperLimit: string;
  notifications: NotificationPreferences;
}
export interface NotificationPreferences {
  market: boolean;
  predictions: boolean;
  social: boolean;
  security: boolean;
  wallet: boolean;
  push: boolean;
}
export interface Privacy {
  userId: string;
  publicProfile: boolean;
  showPortfolioPerformance: boolean;
  showTotalPortfolioValue: boolean;
  showHoldings: boolean;
  showPositionHistory: boolean;
  showLikedPosts: boolean;
  showFollowingList: boolean;
  allowLeaderboards: boolean;
  allowSearch: boolean;
}
export interface WalletSettings {
  userId: string;
  requireBiometrics: boolean;
  withdrawalConfirmation: boolean;
  autoLock: "1 min" | "5 min" | "15 min" | "Never";
  defaultNetwork: Network;
  withdrawalLimit: string;
  feeSpeed: "Standard" | "Fast";
  transactionNotifications: boolean;
  currency: Currency;
  hideBalances: boolean;
  assetSort: "Balance" | "Name" | "Performance";
  compactView: boolean;
  walletMode: "Prediction" | "Trading";
  supportedAssets: { USDC: boolean; USDT: boolean };
  connectedWallet: null;
}
export interface TrustedAddress {
  id: string;
  userId: string;
  label: string;
  address: string;
  network: Network;
  createdAt: string;
}

export interface Outcome {
  id: string;
  label: string;
  probabilityBps: number;
  odds: string;
  color?: string;
  tradeAction?: "Buy" | "Sell";
}
export interface Market {
  id: string;
  title: string;
  category: "Recommend" | "Sports" | "Crypto";
  subcategory: string;
  volume: string;
  status: MarketStatus;
  outcomes: Outcome[];
  rules: string;
  opensAt: string;
  closesAt: string;
  resolvedOutcomeId?: string;
  revision: number;
  updatedAt: string;
}
export interface MarketPoint {
  at: string;
  probabilities: Record<string, number>;
}
export interface MarketAlert {
  id: string;
  userId: string;
  marketId: string;
  movementThreshold?: 5 | 10 | 15;
  closingSoon: boolean;
  resolved: boolean;
  targetProbability?: number;
  baselineProbabilities: Record<string, number>;
  lastRevision: number;
  updatedAt: string;
}

export interface Quote {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  amountMinor: bigint;
  probabilityBps: number;
  potentialWinMinor: bigint;
  expiresAt: string;
  createdAt: string;
}
export interface Prediction {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  amountMinor: bigint;
  potentialWinMinor: bigint;
  probabilityBps: number;
  status: "open" | "won" | "lost" | "refunded";
  payoutMinor: bigint;
  quoteId: string;
  createdAt: string;
  resolvedAt?: string;
}
export interface AIAnalysis {
  id: string;
  marketId: string;
  outcomeId: string;
  revision: number;
  probabilityBps: number;
  marketProbabilityBps: number;
  edgeBps: number;
  verdict: "lean_yes" | "lean_no" | "neutral";
  confidence: "low" | "medium" | "high";
  summary: string;
  signals: { name: string; score: number; explanation: string }[];
  risks: string[];
  sources: {
    label: string;
    kind: "market_fixture" | "provider";
    url?: string;
  }[];
  generatedAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  type: PostType;
  content: string;
  marketId?: string;
  positionId?: string;
  portfolioTimeframe?: "24H" | "7D" | "30D" | "ALL";
  portfolioPositionIds?: string[];
  aiAnalysisId?: string;
  quotePostId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  marketSnapshot?: Record<string, number>;
}
export interface Reply {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  replyingTo?: string;
  createdAt: string;
  deletedAt?: string;
}
export interface SocialEdges {
  follows: Set<string>;
  likes: Set<string>;
  saves: Set<string>;
  reposts: Set<string>;
  replyLikes: Set<string>;
  mutes: Set<string>;
  blocks: Set<string>;
}
export interface Report {
  id: string;
  reporterId: string;
  targetType: "post" | "user";
  targetId: string;
  reason: string;
  createdAt: string;
}
export interface PublicPosition {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  entryProbabilityBps: number;
  currentProbabilityBps: number;
  performanceBps: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "market" | "prediction" | "social" | "security" | "wallet";
  title: string;
  message: string;
  data?: Record<string, string>;
  readAt?: string;
  createdAt: string;
  dedupeKey?: string;
  deliveryAttempts: number;
  deliveredAt?: string;
  nextAttemptAt?: string;
  lastDeliveryError?: string;
}
export interface Device {
  id: string;
  userId: string;
  platform: Platform;
  token: string;
  createdAt: string;
}
export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  createdAt: string;
}
