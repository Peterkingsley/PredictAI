import type { AIProvider } from "../core/providers.js";
import { analysisId, generatedAt } from "../core/providers.js";
import type { Config } from "../core/config.js";
import type { Repository } from "../repositories/interfaces.js";
import type { MarketService } from "./market.service.js";
export class IntelligenceService {
  constructor(
    private repo: Repository,
    private markets: MarketService,
    private provider: AIProvider,
    private config: Config,
  ) {}
  preview(marketId: string, outcomeId?: string) {
    const m = this.markets.get(marketId),
      o = m.outcomes.find((x) => x.id === (outcomeId ?? m.outcomes[0]?.id));
    return {
      marketId: m.id,
      outcomeId: o?.id,
      marketProbability: o ? o.probabilityBps / 100 : 0,
      available: true,
    };
  }
  async analyze(marketId: string, outcomeId?: string, refresh = false) {
    const m = this.markets.get(marketId),
      oid = outcomeId ?? m.outcomes[0]!.id,
      key = `${m.id}:${oid}:${m.revision}`,
      cached = this.repo.analysisCache.get(key);
    if (!refresh && cached && cached.expiresAt > Date.now())
      return cached.value;
    const raw = await this.provider.analyze(m, oid),
      value = { ...raw, id: analysisId(), generatedAt: generatedAt() };
    this.repo.analyses.set(value.id, value);
    this.repo.analysisCache.set(key, {
      value,
      expiresAt: Date.now() + this.config.AI_CACHE_TTL_SECONDS * 1000,
    });
    return value;
  }
  get(id: string) {
    return this.repo.analyses.get(id);
  }
}
