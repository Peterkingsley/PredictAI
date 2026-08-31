import type { AIConfidence, AIVerdict } from './aiAnalysis';

export type SocialPostType = 'insight' | 'market' | 'position' | 'portfolio' | 'ai_analysis';
export type SocialFeedType = 'for_you' | 'following' | 'trending';
export type LeaderboardType = 'accuracy' | 'performance' | 'consistency' | 'contrarian';

export type SocialUser = {
  id: string;
  displayName: string;
  username: string;
  initials: string;
  bio: string;
  specialization: string[];
  followers: number;
  following: number;
  predictionAccuracy?: number;
  performance30d?: number;
  consistency?: number;
  contrarianScore?: number;
  marketsCalled?: number;
  bestCategory?: string;
  isFollowing: boolean;
  isCurrentUser?: boolean;
  portfolioPublic?: boolean;
};

export type PublicPosition = {
  id: string;
  assetSymbol: string;
  assetName: string;
  entryPrice?: number;
  currentPrice?: number;
  performancePercent: number;
  positionValue?: number;
  allocationPercent?: number;
  entryDate?: string;
  showEntryPrice: boolean;
  showCurrentPrice: boolean;
  showPerformance: boolean;
  showPositionValue: boolean;
  showEntryDate?: boolean;
  showAllocation?: boolean;
};

export type PublicPortfolioSnapshot = {
  timeframe: '24H' | '7D' | '30D' | 'ALL';
  performancePercent: number;
  positions: PublicPosition[];
  totalValue?: number;
  wins: number;
  losses: number;
  showPerformance: boolean;
  showBestWorst: boolean;
  showWinLoss: boolean;
  showTotalValue: boolean;
  showAllocation: boolean;
  showChart: boolean;
};

export type SocialAIAnalysis = {
  probability: number;
  marketProbability: number;
  edge: number;
  verdict: AIVerdict;
  confidence: AIConfidence;
  summary: string;
};

export type SocialPost = {
  id: string;
  author: SocialUser;
  type: SocialPostType;
  content: string;
  createdAt: string;
  marketId?: string;
  position?: PublicPosition;
  portfolio?: PublicPortfolioSnapshot;
  aiAnalysis?: SocialAIAnalysis;
  quotePostId?: string;
  likes: number;
  replies: number;
  reposts: number;
  liked: boolean;
  saved: boolean;
  reposted: boolean;
  performanceSincePosted?: number;
};

export type SocialReply = {
  id: string;
  postId: string;
  author: SocialUser;
  content: string;
  createdAt: string;
  likes: number;
  liked: boolean;
  replyingTo?: string;
};

export type SocialPrivacySettings = {
  publicProfile: boolean;
  showPortfolioPerformance: boolean;
  showTotalPortfolioValue: boolean;
  showHoldings: boolean;
  showPositionHistory: boolean;
  showLikedPosts: boolean;
  showFollowingList: boolean;
  allowLeaderboards: boolean;
  allowSearch: boolean;
};

export type ComposerDraft = {
  content: string;
  marketId?: string;
  position?: PublicPosition;
  portfolio?: PublicPortfolioSnapshot;
  aiAnalysis?: SocialAIAnalysis;
  quotePostId?: string;
};

export type SocialSearchResults = { users: SocialUser[]; posts: SocialPost[]; marketIds: string[] };
