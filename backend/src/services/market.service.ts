import type { Repository } from "../repositories/interfaces.js";
import { notFound } from "../core/errors.js";
import { normalizeSearch, page } from "../core/utils.js";
export class MarketService {
  constructor(private repo: Repository) {}
  get(id: string) {
    const m = this.repo.markets.get(id);
    if (!m) throw notFound("Market");
    return m;
  }
  list(q: {
    search?: string;
    category?: string;
    status?: string;
    sort?: string;
    cursor?: string;
    limit?: number;
  }) {
    let items = [...this.repo.markets.values()];
    const s = normalizeSearch(q.search ?? "");
    if (s)
      items = items.filter((m) =>
        normalizeSearch(
          `${m.title} ${m.category} ${m.subcategory} ${m.outcomes.map((o) => o.label).join(" ")}`,
        ).includes(s),
      );
    if (q.category)
      items = items.filter(
        (m) => m.category.toLowerCase() === q.category!.toLowerCase(),
      );
    if (q.status) items = items.filter((m) => m.status === q.status);
    items.sort(
      q.sort === "closing"
        ? (a, b) => a.closesAt.localeCompare(b.closesAt)
        : q.sort === "volume"
          ? (a, b) => Number(b.volume) - Number(a.volume)
          : (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    );
    return page(items, q.cursor, q.limit);
  }
  suggestions(search: string) {
    const s = normalizeSearch(search);
    return [...this.repo.markets.values()]
      .filter((m) => !s || normalizeSearch(m.title).includes(s))
      .slice(0, 8)
      .map((m) => ({ id: m.id, title: m.title, category: m.category }));
  }
  categories() {
    return ["Recommend", "Sports", "Crypto"].map((name) => ({
      name,
      count: [...this.repo.markets.values()].filter((m) => m.category === name)
        .length,
    }));
  }
  history(id: string, range = "1D") {
    this.get(id);
    const points = this.repo.marketHistory.get(id) ?? [];
    const count =
      range === "1W"
        ? 168
        : range === "1M"
          ? 720
          : range === "ALL"
            ? points.length
            : 24;
    return points.slice(-count);
  }
  community(id: string) {
    this.get(id);
    const posts = [...this.repo.posts.values()].filter(
      (p) => p.marketId === id && !p.deletedAt,
    );
    return {
      postCount: posts.length,
      bullishPercent: posts.length ? 58 : 0,
      neutralPercent: posts.length ? 24 : 0,
      bearishPercent: posts.length ? 18 : 0,
    };
  }
}
