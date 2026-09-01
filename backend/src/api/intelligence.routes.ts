import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { parse, schema } from "./shared.js";
const request = z.object({
  marketId: z.string(),
  outcomeId: z.string().optional(),
});
export const intelligenceRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/intelligence/preview",
    {
      schema: schema(
        "Intelligence",
        "Get lightweight PredictAI availability and market probability context.",
        false,
      ),
    },
    async (r) => {
      const q = parse(request, r.query);
      return {
        data: app.container.services.intelligence.preview(
          q.marketId,
          q.outcomeId,
        ),
      };
    },
  );
  app.post(
    "/intelligence/analysis",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Intelligence",
        "Generate or return cached structured market intelligence.",
      ),
    },
    async (r) => {
      const b = parse(request, r.body);
      return {
        data: await app.container.services.intelligence.analyze(
          b.marketId,
          b.outcomeId,
        ),
      };
    },
  );
  app.post(
    "/intelligence/analysis/refresh",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: schema(
        "Intelligence",
        "Refresh structured intelligence with a stricter rate limit.",
      ),
    },
    async (r) => {
      const b = parse(request, r.body);
      return {
        data: await app.container.services.intelligence.analyze(
          b.marketId,
          b.outcomeId,
          true,
        ),
      };
    },
  );
  app.post(
    "/intelligence/markets/:id",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Intelligence",
        "Canonical structured market analysis contract.",
      ),
    },
    async (r) => {
      const p = parse(z.object({ id: z.string() }), r.params),
        b = parse(z.object({ outcomeId: z.string().optional() }), r.body ?? {});
      return {
        data: await app.container.services.intelligence.analyze(
          p.id,
          b.outcomeId,
        ),
      };
    },
  );
  app.get(
    "/intelligence/markets/:id",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Intelligence",
        "Get or generate the current cached analysis.",
      ),
    },
    async (r) => {
      const p = parse(z.object({ id: z.string() }), r.params),
        q = parse(z.object({ outcomeId: z.string().optional() }), r.query);
      return {
        data: await app.container.services.intelligence.analyze(
          p.id,
          q.outcomeId,
        ),
      };
    },
  );
  app.post(
    "/intelligence/markets/:id/refresh",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: schema("Intelligence", "Canonical forced analysis refresh."),
    },
    async (r) => {
      const p = parse(z.object({ id: z.string() }), r.params),
        b = parse(z.object({ outcomeId: z.string().optional() }), r.body ?? {});
      return {
        data: await app.container.services.intelligence.analyze(
          p.id,
          b.outcomeId,
          true,
        ),
      };
    },
  );
  app.get(
    "/intelligence/markets/:id/preview",
    {
      schema: schema(
        "Intelligence",
        "Canonical public analysis preview.",
        false,
      ),
    },
    async (r) => {
      const p = parse(z.object({ id: z.string() }), r.params),
        q = parse(z.object({ outcomeId: z.string().optional() }), r.query);
      return {
        data: app.container.services.intelligence.preview(p.id, q.outcomeId),
      };
    },
  );
};
