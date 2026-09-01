import type { AlertService } from "../services/alert.service.js";
import type { NotificationService } from "../services/notification.service.js";
import type { Repository } from "../repositories/interfaces.js";
import type { MarketProvider } from "../core/providers.js";
export interface Scheduler {
  start(): void;
  stop(): void;
}
export class InProcessScheduler implements Scheduler {
  private timers: NodeJS.Timeout[] = [];
  constructor(
    private alerts: AlertService,
    private notifications: NotificationService,
    private repo: Repository,
    private marketProvider: MarketProvider,
  ) {}
  start() {
    this.timers.push(
      setInterval(() => this.alerts.evaluate(), 30_000),
      setInterval(
        () => void this.notifications.deliver().catch(() => undefined),
        15_000,
      ),
      setInterval(() => this.cleanup(), 60_000),
      setInterval(
        () => void this.syncMarkets().catch(() => undefined),
        300_000,
      ),
    );
    for (const t of this.timers) t.unref();
  }
  stop() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }
  private async syncMarkets() {
    for (const incoming of await this.marketProvider.sync()) {
      const current = this.repo.markets.get(incoming.id);
      if (!current || incoming.revision >= current.revision)
        this.repo.markets.set(incoming.id, incoming);
    }
    this.alerts.evaluate();
  }
  private cleanup() {
    const stamp = Date.now();
    for (const [k, q] of this.repo.quotes)
      if (Date.parse(q.expiresAt) + 60_000 < stamp) this.repo.quotes.delete(k);
    for (const [k, v] of this.repo.analysisCache)
      if (v.expiresAt < stamp) this.repo.analysisCache.delete(k);
  }
}
