import type { Post, PostType } from "../models/domain.js";
import type { Repository } from "../repositories/interfaces.js";
import type { ContentModerationProvider } from "../core/providers.js";
import type { UserService } from "./user.service.js";
import type { MarketService } from "./market.service.js";
import type { IntelligenceService } from "./intelligence.service.js";
import { AppError, forbidden, notFound } from "../core/errors.js";
import { id, normalizeSearch, now, page } from "../core/utils.js";
type Draft = {
  type: PostType;
  content: string;
  marketId?: string;
  positionId?: string;
  portfolioTimeframe?: "24H" | "7D" | "30D" | "ALL";
  portfolioPositionIds?: string[];
  aiAnalysisId?: string;
  quotePostId?: string;
};
export class SocialService {
  constructor(
    private repo: Repository,
    private users: UserService,
    private markets: MarketService,
    private ai: IntelligenceService,
    private moderation: ContentModerationProvider,
  ) {}
  private visible(viewer: string | undefined, p: Post) {
    if (p.deletedAt) return false;
    const privacy = this.users.privacy(p.authorId);
    if (viewer !== p.authorId && !privacy.publicProfile) return false;
    if (
      viewer &&
      (this.repo.social.blocks.has(`${viewer}:${p.authorId}`) ||
        this.repo.social.blocks.has(`${p.authorId}:${viewer}`) ||
        this.repo.social.mutes.has(`${viewer}:${p.authorId}`))
    )
      return false;
    return true;
  }
  private counts(viewer: string | undefined, p: Post) {
    const privacy = this.users.privacy(p.authorId);
    const mayShowHoldings = viewer === p.authorId || privacy.showHoldings;
    const position =
      p.positionId && mayShowHoldings
        ? this.repo.positions.get(p.positionId)
        : undefined;
    const portfolio = p.portfolioPositionIds
      ? {
          timeframe: p.portfolioTimeframe ?? "30D",
          positions: mayShowHoldings
            ? p.portfolioPositionIds
                .map((positionId) => this.repo.positions.get(positionId))
                .filter(Boolean)
            : [],
          performance:
            viewer === p.authorId || privacy.showPortfolioPerformance
              ? p.portfolioPositionIds.reduce(
                  (total, positionId) =>
                    total +
                    (this.repo.positions.get(positionId)?.performanceBps ?? 0),
                  0,
                ) /
                Math.max(p.portfolioPositionIds.length, 1) /
                100
              : undefined,
        }
      : undefined;
    return {
      ...p,
      author: this.users.publicProfile(viewer, p.authorId),
      position,
      portfolio,
      aiAnalysis: p.aiAnalysisId ? this.ai.get(p.aiAnalysisId) : undefined,
      likes: [...this.repo.social.likes].filter((x) => x.endsWith(`:${p.id}`))
        .length,
      reposts: [...this.repo.social.reposts].filter((x) =>
        x.endsWith(`:${p.id}`),
      ).length,
      replies: [...this.repo.replies.values()].filter(
        (r) => r.postId === p.id && !r.deletedAt,
      ).length,
      liked: !!viewer && this.repo.social.likes.has(`${viewer}:${p.id}`),
      saved: !!viewer && this.repo.social.saves.has(`${viewer}:${p.id}`),
      reposted: !!viewer && this.repo.social.reposts.has(`${viewer}:${p.id}`),
      performanceSincePosted: p.marketId ? this.performance(p) : undefined,
    };
  }
  private performance(p: Post) {
    const m = p.marketId ? this.repo.markets.get(p.marketId) : undefined;
    if (!m || !p.marketSnapshot) return undefined;
    const first = Object.keys(p.marketSnapshot)[0];
    return first
      ? ((m.outcomes.find((o) => o.id === first)?.probabilityBps ?? 0) -
          p.marketSnapshot[first]!) /
          100
      : undefined;
  }
  async create(userId: string, d: Draft) {
    await this.moderation.assertAllowed(d.content);
    if (d.content.length > 500)
      throw new AppError(
        "CONTENT_TOO_LONG",
        "Post content may not exceed 500 characters",
        422,
      );
    const attachments = [
      d.marketId,
      d.positionId,
      d.portfolioPositionIds?.length ? d.portfolioPositionIds : undefined,
      d.aiAnalysisId,
      d.quotePostId,
    ].filter(Boolean);
    if (attachments.length > 1)
      throw new AppError(
        "TOO_MANY_ATTACHMENTS",
        "A post may have one attachment",
        422,
      );
    const requiredAttachment = {
      insight: undefined,
      market: d.marketId,
      position: d.positionId,
      portfolio: d.portfolioPositionIds?.length
        ? d.portfolioPositionIds
        : undefined,
      ai_analysis: d.aiAnalysisId,
      quote: d.quotePostId,
    }[d.type];
    if (d.type === "insight" && attachments.length)
      throw new AppError(
        "ATTACHMENT_TYPE_MISMATCH",
        "Insight posts cannot carry a typed attachment",
        422,
      );
    if (d.type !== "insight" && !requiredAttachment)
      throw new AppError(
        "ATTACHMENT_REQUIRED",
        `${d.type} posts require their matching server-validated attachment`,
        422,
      );
    if (d.marketId) this.markets.get(d.marketId);
    if (d.positionId) {
      const pos = this.repo.positions.get(d.positionId);
      if (!pos || pos.userId !== userId) throw notFound("Position");
    }
    if (
      d.portfolioPositionIds?.some(
        (x) => this.repo.positions.get(x)?.userId !== userId,
      )
    )
      throw forbidden();
    if (d.aiAnalysisId && !this.ai.get(d.aiAnalysisId))
      throw notFound("AI analysis");
    if (d.quotePostId && !this.repo.posts.get(d.quotePostId))
      throw notFound("Quoted post");
    const stamp = now();
    const m = d.marketId ? this.markets.get(d.marketId) : undefined;
    const p: Post = {
      ...d,
      id: id("post"),
      authorId: userId,
      createdAt: stamp,
      updatedAt: stamp,
      marketSnapshot: m
        ? Object.fromEntries(m.outcomes.map((o) => [o.id, o.probabilityBps]))
        : undefined,
    };
    this.repo.posts.set(p.id, p);
    return this.counts(userId, p);
  }
  feed(
    viewer: string | undefined,
    type: string,
    cursor?: string,
    limit?: number,
  ) {
    let items = [...this.repo.posts.values()].filter((p) =>
      this.visible(viewer, p),
    );
    if (type === "following")
      items = items.filter(
        (p) =>
          !!viewer && this.repo.social.follows.has(`${viewer}:${p.authorId}`),
      );
    items.sort(
      type === "trending"
        ? (a, b) => this.engagement(b) - this.engagement(a)
        : (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
    const result = page(
      items.map((p) => this.counts(viewer, p)),
      cursor,
      limit,
    );
    return result;
  }
  private engagement(p: Post) {
    return [...this.repo.social.likes, ...this.repo.social.reposts].filter(
      (x) => x.endsWith(`:${p.id}`),
    ).length;
  }
  get(viewer: string | undefined, id_: string) {
    const p = this.repo.posts.get(id_);
    if (!p || !this.visible(viewer, p)) throw notFound("Post");
    return this.counts(viewer, p);
  }
  async edit(userId: string, id_: string, content: string) {
    const p = this.repo.posts.get(id_);
    if (!p) throw notFound("Post");
    if (p.authorId !== userId) throw forbidden();
    await this.moderation.assertAllowed(content);
    if (content.length > 500)
      throw new AppError(
        "CONTENT_TOO_LONG",
        "Post content may not exceed 500 characters",
        422,
      );
    p.content = content;
    p.updatedAt = now();
    return this.counts(userId, p);
  }
  delete(userId: string, id_: string) {
    const p = this.repo.posts.get(id_);
    if (!p) throw notFound("Post");
    if (p.authorId !== userId) throw forbidden();
    p.deletedAt = now();
  }
  edge(
    kind: "likes" | "saves" | "reposts",
    userId: string,
    postId: string,
    on: boolean,
  ) {
    this.get(userId, postId);
    const key = `${userId}:${postId}`;
    on ? this.repo.social[kind].add(key) : this.repo.social[kind].delete(key);
    return this.get(userId, postId);
  }
  replies(
    viewer: string | undefined,
    postId: string,
    cursor?: string,
    limit?: number,
  ) {
    this.get(viewer, postId);
    const items = [...this.repo.replies.values()]
      .filter((r) => r.postId === postId && !r.deletedAt)
      .map((r) => ({
        ...r,
        author: this.users.publicProfile(viewer, r.authorId),
        likes: [...this.repo.social.replyLikes].filter((x) =>
          x.endsWith(`:${r.id}`),
        ).length,
        liked: !!viewer && this.repo.social.replyLikes.has(`${viewer}:${r.id}`),
      }));
    return page(items, cursor, limit);
  }
  async reply(
    userId: string,
    postId: string,
    content: string,
    replyingTo?: string,
  ) {
    this.get(userId, postId);
    await this.moderation.assertAllowed(content);
    if (!content.trim() || content.length > 500)
      throw new AppError(
        "INVALID_CONTENT",
        "Reply must contain 1-500 characters",
        422,
      );
    const r = {
      id: id("reply"),
      postId,
      authorId: userId,
      content: content.trim(),
      replyingTo,
      createdAt: now(),
    };
    this.repo.replies.set(r.id, r);
    return r;
  }
  replyLike(userId: string, replyId: string, on: boolean) {
    if (!this.repo.replies.has(replyId)) throw notFound("Reply");
    const key = `${userId}:${replyId}`;
    on
      ? this.repo.social.replyLikes.add(key)
      : this.repo.social.replyLikes.delete(key);
  }
  follow(userId: string, targetId: string, on: boolean) {
    if (userId === targetId)
      throw new AppError("INVALID_FOLLOW", "You cannot follow yourself", 422);
    this.users.get(targetId);
    const key = `${userId}:${targetId}`;
    on
      ? this.repo.social.follows.add(key)
      : this.repo.social.follows.delete(key);
  }
  followers(viewer: string | undefined, userId: string) {
    this.users.publicProfile(viewer, userId);
    if (viewer !== userId && !this.users.privacy(userId).showFollowingList)
      throw forbidden("This following list is private");
    return [...this.repo.social.follows]
      .filter((k) => k.endsWith(`:${userId}`))
      .map((k) => this.users.publicProfile(viewer, k.split(":")[0]!));
  }
  following(viewer: string | undefined, userId: string) {
    this.users.publicProfile(viewer, userId);
    if (viewer !== userId && !this.users.privacy(userId).showFollowingList)
      throw forbidden("This following list is private");
    return [...this.repo.social.follows]
      .filter((k) => k.startsWith(`${userId}:`))
      .map((k) => this.users.publicProfile(viewer, k.split(":")[1]!));
  }
  userPosts(viewer: string | undefined, userId: string) {
    this.users.publicProfile(viewer, userId);
    return [...this.repo.posts.values()]
      .filter((p) => p.authorId === userId && this.visible(viewer, p))
      .map((p) => this.counts(viewer, p));
  }
  marketPosts(viewer: string | undefined, marketId: string) {
    this.markets.get(marketId);
    return [...this.repo.posts.values()]
      .filter((p) => p.marketId === marketId && this.visible(viewer, p))
      .map((p) => this.counts(viewer, p));
  }
  saved(userId: string) {
    return [...this.repo.social.saves]
      .filter((k) => k.startsWith(`${userId}:`))
      .map((k) => this.get(userId, k.split(":")[1]!));
  }
  search(viewer: string | undefined, q: string) {
    const s = normalizeSearch(q);
    return {
      users: [...this.repo.users.values()]
        .filter(
          (u) =>
            this.users.privacy(u.id).allowSearch &&
            normalizeSearch(`${u.displayName} ${u.username} ${u.bio}`).includes(
              s,
            ),
        )
        .map((u) => this.users.publicProfile(viewer, u.id)),
      posts: [...this.repo.posts.values()]
        .filter(
          (p) =>
            this.visible(viewer, p) && normalizeSearch(p.content).includes(s),
        )
        .map((p) => this.counts(viewer, p)),
      markets: this.markets.suggestions(q),
    };
  }
  leaderboard(viewer: string | undefined, metric: string) {
    return [...this.repo.users.values()]
      .filter((u) => this.users.privacy(u.id).allowLeaderboards)
      .map((u) => {
        const settled = [...this.repo.predictions.values()].filter(
            (p) =>
              p.userId === u.id && (p.status === "won" || p.status === "lost"),
          ),
          wins = settled.filter((p) => p.status === "won").length;
        return {
          ...this.users.publicProfile(viewer, u.id),
          metric,
          value:
            metric === "accuracy"
              ? settled.length
                ? (wins / settled.length) * 100
                : 0
              : metric === "performance"
                ? this.repo.walletLedger
                    .filter(
                      (entry) =>
                        entry.userId === u.id &&
                        entry.referenceType === "prediction",
                    )
                    .reduce(
                      (total, entry) =>
                        total +
                        Number(
                          entry.direction === "credit"
                            ? entry.amountMinor
                            : -entry.amountMinor,
                        ),
                      0,
                    ) / 100
                : metric === "consistency"
                  ? settled.length
                  : 0,
        };
      })
      .sort((a, b) => b.value - a.value);
  }
  mute(userId: string, target: string, on: boolean) {
    this.users.get(target);
    const k = `${userId}:${target}`;
    on ? this.repo.social.mutes.add(k) : this.repo.social.mutes.delete(k);
  }
  block(userId: string, target: string, on: boolean) {
    this.users.get(target);
    const k = `${userId}:${target}`;
    on ? this.repo.social.blocks.add(k) : this.repo.social.blocks.delete(k);
    if (on) {
      this.repo.social.follows.delete(k);
      this.repo.social.follows.delete(`${target}:${userId}`);
    }
  }
  report(
    userId: string,
    targetType: "post" | "user",
    targetId: string,
    reason: string,
  ) {
    if (targetType === "post") this.get(userId, targetId);
    else this.users.get(targetId);
    const r = {
      id: id("report"),
      reporterId: userId,
      targetType,
      targetId,
      reason,
      createdAt: now(),
    };
    this.repo.reports.set(r.id, r);
    return r;
  }
}
