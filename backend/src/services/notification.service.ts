import type {
  Notification,
  NotificationPreferences,
  Platform,
} from "../models/domain.js";
import type { Repository } from "../repositories/interfaces.js";
import type { PushProvider } from "../core/providers.js";
import { id, now, page } from "../core/utils.js";
import { notFound } from "../core/errors.js";
export class NotificationService {
  constructor(
    private repo: Repository,
    private push: PushProvider,
  ) {}
  create(
    userId: string,
    type: Notification["type"],
    title: string,
    message: string,
    data?: Record<string, string>,
    dedupeKey?: string,
  ) {
    const preferences = this.repo.preferences.get(userId)?.notifications;
    const category = type === "prediction" ? "predictions" : type;
    if (preferences && !preferences[category]) return;
    if (
      dedupeKey &&
      [...this.repo.notifications.values()].some(
        (n) => n.userId === userId && n.dedupeKey === dedupeKey,
      )
    )
      return;
    const n: Notification = {
      id: id("notification"),
      userId,
      type,
      title,
      message,
      data,
      createdAt: now(),
      dedupeKey,
      deliveryAttempts: 0,
    };
    this.repo.notifications.set(n.id, n);
    return n;
  }
  list(userId: string, cursor?: string, limit?: number) {
    return page(
      [...this.repo.notifications.values()]
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      cursor,
      limit,
    );
  }
  unread(userId: string) {
    return [...this.repo.notifications.values()].filter(
      (n) => n.userId === userId && !n.readAt,
    ).length;
  }
  read(userId: string, id_: string) {
    const n = this.repo.notifications.get(id_);
    if (!n || n.userId !== userId) throw notFound("Notification");
    n.readAt = now();
    return n;
  }
  readAll(userId: string) {
    for (const n of this.repo.notifications.values())
      if (n.userId === userId && !n.readAt) n.readAt = now();
  }
  register(userId: string, platform: Platform, token: string) {
    const existing = [...this.repo.devices.values()].find(
      (d) => d.userId === userId && d.token === token,
    );
    if (existing) return existing;
    const d = { id: id("device"), userId, platform, token, createdAt: now() };
    this.repo.devices.set(d.id, d);
    return d;
  }
  remove(userId: string, id_: string) {
    const d = this.repo.devices.get(id_);
    if (d?.userId === userId) this.repo.devices.delete(id_);
  }
  async deliver() {
    for (const n of this.repo.notifications.values()) {
      if (
        n.deliveredAt ||
        n.deliveryAttempts >= 3 ||
        (n.nextAttemptAt && Date.parse(n.nextAttemptAt) > Date.now())
      )
        continue;
      if (this.repo.preferences.get(n.userId)?.notifications.push === false) {
        n.deliveredAt = now();
        continue;
      }
      try {
        for (const d of this.repo.devices.values())
          if (d.userId === n.userId)
            await this.push.send(d.token, {
              title: n.title,
              body: n.message,
              data: n.data,
            });
        n.deliveryAttempts++;
        n.deliveredAt = now();
        delete n.lastDeliveryError;
        delete n.nextAttemptAt;
      } catch (error) {
        n.deliveryAttempts++;
        n.lastDeliveryError =
          error instanceof Error ? error.message.slice(0, 200) : "Push failed";
        n.nextAttemptAt = new Date(
          Date.now() + 2 ** n.deliveryAttempts * 1_000,
        ).toISOString();
      }
    }
  }
  preferences(userId: string, prefs: NotificationPreferences) {
    return prefs;
  }
}
