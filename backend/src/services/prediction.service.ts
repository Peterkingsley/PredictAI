import type { Config } from "../core/config.js";
import type { Repository } from "../repositories/interfaces.js";
import { AppError, notFound } from "../core/errors.js";
import { fromMinor, id, now, toMinor } from "../core/utils.js";
import type { MarketService } from "./market.service.js";
import type { UserService } from "./user.service.js";
import type { NotificationService } from "./notification.service.js";
export class PredictionService {
  constructor(
    private repo: Repository,
    private markets: MarketService,
    private users: UserService,
    private config: Config,
    private notify?: NotificationService,
  ) {}
  balanceMinor(userId: string) {
    return this.repo.ledger
      .filter((e) => e.userId === userId)
      .reduce((s, e) => s + e.amountMinor, 0n);
  }
  ensureBalance(userId: string) {
    if (
      !this.repo.ledger.some(
        (e) => e.userId === userId && e.kind === "starting_balance",
      )
    )
      this.repo.ledger.push({
        id: id("ledger"),
        userId,
        kind: "starting_balance",
        amountMinor: toMinor(this.config.PAPER_STARTING_BALANCE),
        createdAt: now(),
      });
    return this.balanceMinor(userId);
  }
  quote(
    userId: string,
    input: { marketId: string; outcomeId: string; amount: string },
  ) {
    const m = this.markets.get(input.marketId),
      o = m.outcomes.find((x) => x.id === input.outcomeId);
    if (m.status !== "open")
      throw new AppError("MARKET_NOT_OPEN", "Market is not open", 409);
    if (!o) throw notFound("Outcome");
    const amountMinor = toMinor(input.amount);
    this.ensureBalance(userId);
    const potentialWinMinor =
      (amountMinor * 10000n) / BigInt(Math.max(o.probabilityBps, 1));
    const q = {
      id: id("quote"),
      userId,
      marketId: m.id,
      outcomeId: o.id,
      amountMinor,
      probabilityBps: o.probabilityBps,
      potentialWinMinor,
      createdAt: now(),
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    };
    this.repo.quotes.set(q.id, q);
    return this.serializeQuote(q);
  }
  async place(userId: string, quoteId: string, key: string) {
    if (!key || key.length > 128)
      throw new AppError(
        "IDEMPOTENCY_KEY_REQUIRED",
        "A valid Idempotency-Key header is required",
        400,
      );
    const lookup = `${userId}:${key}`;
    const previous = this.repo.idempotency.get(lookup);
    if (previous) return this.serialize(this.repo.predictions.get(previous)!);
    let release!: () => void;
    const previousLock = this.repo.locks.get(userId) ?? Promise.resolve();
    const lock = new Promise<void>((r) => {
      release = r;
    });
    this.repo.locks.set(
      userId,
      previousLock.then(() => lock),
    );
    await previousLock;
    try {
      const q = this.repo.quotes.get(quoteId);
      if (!q || q.userId !== userId) throw notFound("Quote");
      if (Date.parse(q.expiresAt) <= Date.now())
        throw new AppError("QUOTE_EXPIRED", "Quote has expired", 409);
      const m = this.markets.get(q.marketId);
      if (
        m.status !== "open" ||
        m.outcomes.find((o) => o.id === q.outcomeId)?.probabilityBps !==
          q.probabilityBps
      )
        throw new AppError(
          "QUOTE_STALE",
          "Market changed; request a new quote",
          409,
        );
      const balance = this.ensureBalance(userId);
      if (balance < q.amountMinor)
        throw new AppError(
          "INSUFFICIENT_PAPER_BALANCE",
          "Insufficient paper balance",
          409,
        );
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const spent = [...this.repo.predictions.values()]
        .filter(
          (p) =>
            p.userId === userId && Date.parse(p.createdAt) >= start.getTime(),
        )
        .reduce((s, p) => s + p.amountMinor, 0n);
      if (
        spent + q.amountMinor >
        toMinor(this.users.prefs(userId).dailyPaperLimit)
      )
        throw new AppError(
          "DAILY_PAPER_LIMIT_EXCEEDED",
          "Daily paper prediction limit exceeded",
          409,
        );
      const prediction = {
        id: id("prediction"),
        userId,
        marketId: q.marketId,
        outcomeId: q.outcomeId,
        amountMinor: q.amountMinor,
        potentialWinMinor: q.potentialWinMinor,
        probabilityBps: q.probabilityBps,
        status: "open" as const,
        payoutMinor: 0n,
        quoteId: q.id,
        createdAt: now(),
      };
      this.repo.predictions.set(prediction.id, prediction);
      this.repo.ledger.push({
        id: id("ledger"),
        userId,
        kind: "prediction_debit",
        amountMinor: -q.amountMinor,
        predictionId: prediction.id,
        createdAt: now(),
      });
      this.repo.positions.set(prediction.id, {
        id: prediction.id,
        userId,
        marketId: q.marketId,
        outcomeId: q.outcomeId,
        entryProbabilityBps: q.probabilityBps,
        currentProbabilityBps: q.probabilityBps,
        performanceBps: 0,
        createdAt: prediction.createdAt,
      });
      this.repo.idempotency.set(lookup, prediction.id);
      this.notify?.create(
        userId,
        "prediction",
        "Prediction placed",
        "Your paper prediction has been recorded.",
        { predictionId: prediction.id },
        `placed:${prediction.id}`,
      );
      return this.serialize(prediction);
    } finally {
      release();
      if (this.repo.locks.get(userId) === lock) this.repo.locks.delete(userId);
    }
  }
  list(userId: string, status?: string) {
    return [...this.repo.predictions.values()]
      .filter((p) => p.userId === userId && (!status || p.status === status))
      .map((p) => this.serialize(p));
  }
  get(userId: string, id_: string) {
    const p = this.repo.predictions.get(id_);
    if (!p || p.userId !== userId) throw notFound("Prediction");
    return this.serialize(p);
  }
  positions(userId: string) {
    return [...this.repo.positions.values()].filter((p) => p.userId === userId);
  }
  resolveMarket(marketId: string, outcomeId: string) {
    const m = this.markets.get(marketId);
    m.status = "resolved";
    m.resolvedOutcomeId = outcomeId;
    m.revision++;
    for (const p of this.repo.predictions.values()) {
      if (p.marketId !== marketId || p.status !== "open") continue;
      p.status = p.outcomeId === outcomeId ? "won" : "lost";
      p.resolvedAt = now();
      if (p.status === "won") {
        p.payoutMinor = p.potentialWinMinor;
        this.repo.ledger.push({
          id: id("ledger"),
          userId: p.userId,
          kind: "prediction_payout",
          amountMinor: p.payoutMinor,
          predictionId: p.id,
          createdAt: now(),
        });
      }
      const position = this.repo.positions.get(p.id);
      if (position) {
        position.currentProbabilityBps = p.status === "won" ? 10_000 : 0;
        position.performanceBps =
          position.currentProbabilityBps - position.entryProbabilityBps;
      }
      this.notify?.create(
        p.userId,
        "prediction",
        "Market resolved",
        `Your prediction was resolved as ${p.status}.`,
        { predictionId: p.id },
        `resolved:${p.id}`,
      );
    }
  }
  history(userId: string) {
    this.ensureBalance(userId);
    return this.repo.ledger
      .filter((e) => e.userId === userId)
      .map((e) => ({
        ...e,
        amount: fromMinor(e.amountMinor),
        amountMinor: undefined,
      }));
  }
  summary(userId: string) {
    const balance = this.ensureBalance(userId),
      all = [...this.repo.predictions.values()].filter(
        (p) => p.userId === userId,
      );
    return {
      paperBalance: fromMinor(balance),
      positionValue: fromMinor(
        all
          .filter((p) => p.status === "open")
          .reduce((s, p) => s + p.amountMinor, 0n),
      ),
      wins: all.filter((p) => p.status === "won").length,
      losses: all.filter((p) => p.status === "lost").length,
      realizedPnl: "0.00",
      unrealizedPnl: "0.00",
    };
  }
  private serializeQuote(q: import("../models/domain.js").Quote) {
    return {
      ...q,
      amount: fromMinor(q.amountMinor),
      potentialWin: fromMinor(q.potentialWinMinor),
      probability: q.probabilityBps / 100,
      amountMinor: undefined,
      potentialWinMinor: undefined,
    };
  }
  private serialize(p: import("../models/domain.js").Prediction) {
    return {
      ...p,
      amount: fromMinor(p.amountMinor),
      potentialWin: fromMinor(p.potentialWinMinor),
      payout: fromMinor(p.payoutMinor),
      probability: p.probabilityBps / 100,
      amountMinor: undefined,
      potentialWinMinor: undefined,
      payoutMinor: undefined,
    };
  }
}
