import type { Repository } from "../repositories/interfaces.js";
import type { MarketService } from "./market.service.js";
import type { NotificationService } from "./notification.service.js";
import { id, now } from "../core/utils.js";
import { notFound } from "../core/errors.js";
export class AlertService {
  constructor(
    private repo: Repository,
    private markets: MarketService,
    private notify: NotificationService,
  ) {}
  list(userId: string) {
    return [...this.repo.alerts.values()].filter((a) => a.userId === userId);
  }
  put(
    userId: string,
    marketId: string,
    input: {
      movementThreshold?: 5 | 10 | 15;
      closingSoon?: boolean;
      resolved?: boolean;
      targetProbability?: number;
    },
  ) {
    const m = this.markets.get(marketId),
      existing = [...this.repo.alerts.values()].find(
        (a) => a.userId === userId && a.marketId === marketId,
      );
    const a = existing ?? {
      id: id("alert"),
      userId,
      marketId,
      closingSoon: false,
      resolved: false,
      baselineProbabilities: Object.fromEntries(
        m.outcomes.map((o) => [o.id, o.probabilityBps]),
      ),
      lastRevision: m.revision,
      updatedAt: now(),
    };
    Object.assign(a, input, { updatedAt: now() });
    this.repo.alerts.set(a.id, a);
    return a;
  }
  remove(userId: string, id_: string) {
    const a = this.repo.alerts.get(id_);
    if (!a || a.userId !== userId) throw notFound("Alert");
    this.repo.alerts.delete(id_);
  }
  evaluate() {
    for (const a of this.repo.alerts.values()) {
      const m = this.repo.markets.get(a.marketId);
      if (!m) continue;
      if (a.resolved && m.status === "resolved")
        this.notify.create(
          a.userId,
          "market",
          "Market resolved",
          m.title,
          { marketId: m.id },
          `alert:resolved:${a.id}:${m.revision}`,
        );
      if (
        a.closingSoon &&
        m.status === "open" &&
        Date.parse(m.closesAt) - Date.now() < 86_400_000
      )
        this.notify.create(
          a.userId,
          "market",
          "Market closing soon",
          m.title,
          { marketId: m.id },
          `alert:closing:${a.id}:${m.revision}`,
        );
      if (
        a.targetProbability !== undefined &&
        m.outcomes.some((o) => o.probabilityBps >= a.targetProbability! * 100)
      )
        this.notify.create(
          a.userId,
          "market",
          "Target probability reached",
          m.title,
          { marketId: m.id },
          `alert:target:${a.id}:${m.revision}`,
        );
      if (
        a.lastRevision !== m.revision &&
        a.movementThreshold &&
        m.outcomes.some(
          (o) =>
            Math.abs(
              o.probabilityBps -
                (a.baselineProbabilities[o.id] ?? o.probabilityBps),
            ) >=
            a.movementThreshold! * 100,
        )
      )
        this.notify.create(
          a.userId,
          "market",
          "Market probability moved",
          m.title,
          { marketId: m.id },
          `alert:movement:${a.id}:${m.revision}`,
        );
      if (a.lastRevision !== m.revision) {
        a.baselineProbabilities = Object.fromEntries(
          m.outcomes.map((o) => [o.id, o.probabilityBps]),
        );
        a.lastRevision = m.revision;
      }
    }
  }
}
