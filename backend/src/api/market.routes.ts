import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  marketJson,
  pageQuery,
  parse,
  schema,
  userId,
  viewerId,
} from "./shared.js";
export const marketRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/markets",
    {
      schema: schema(
        "Markets",
        "List normalized markets with search, filters, sort, and cursor pagination.",
        false,
      ),
    },
    async (r) => {
      const q = parse(
          pageQuery.extend({
            search: z.string().optional(),
            category: z.string().optional(),
            status: z.string().optional(),
            sort: z.enum(["recent", "closing", "volume"]).optional(),
          }),
          r.query,
        ),
        result = app.container.services.markets.list(q);
      return { ...result, data: result.data.map(marketJson) };
    },
  );
  app.get(
    "/markets/suggestions",
    { schema: schema("Markets", "Return event-search suggestions.", false) },
    async (r) => {
      const q = parse(
        z.object({ search: z.string().optional(), q: z.string().optional() }),
        r.query,
      );
      return {
        data: app.container.services.markets.suggestions(q.q ?? q.search ?? ""),
      };
    },
  );
  app.get(
    "/market-categories",
    {
      schema: schema(
        "Markets",
        "List active categories and market counts.",
        false,
      ),
    },
    async () => ({ data: app.container.services.markets.categories() }),
  );
  app.get(
    "/markets/categories",
    { schema: schema("Markets", "Canonical market-category list.", false) },
    async () => ({ data: app.container.services.markets.categories() }),
  );
  app.get(
    "/markets/:id",
    {
      schema: schema(
        "Markets",
        "Get a market and its normalized outcomes.",
        false,
      ),
    },
    async (r) => ({
      data: marketJson(
        app.container.services.markets.get(
          parse(z.object({ id: z.string() }), r.params).id,
        ),
      ),
    }),
  );
  app.get(
    "/markets/:id/history",
    {
      schema: schema(
        "Markets",
        "Get fixture-backed probability history for a supported time range.",
        false,
      ),
    },
    async (r) => {
      const p = parse(z.object({ id: z.string() }), r.params),
        q = parse(
          z.object({ range: z.enum(["1D", "1W", "1M", "ALL"]).default("1D") }),
          r.query,
        );
      return {
        data: app.container.services.markets
          .history(p.id, q.range)
          .map((x) => ({
            ...x,
            probabilities: Object.fromEntries(
              Object.entries(x.probabilities).map(([k, v]) => [k, v / 100]),
            ),
          })),
      };
    },
  );
  app.get(
    "/markets/:id/community",
    {
      schema: schema(
        "Markets",
        "Get server-computed community post sentiment summary.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.markets.community(
        parse(z.object({ id: z.string() }), r.params).id,
      ),
    }),
  );
  app.get(
    "/markets/:id/posts",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Markets",
        "Get visible community posts attached to a market.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.social.marketPosts(
        viewerId(r),
        parse(z.object({ id: z.string() }), r.params).id,
      ),
    }),
  );
  app.get(
    "/alerts",
    {
      preHandler: app.authenticate,
      schema: schema("Alerts", "List current market alert rules."),
    },
    async (r) => ({ data: app.container.services.alerts.list(userId(r)) }),
  );
  app.put(
    "/markets/:id/alert",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Alerts",
        "Create or update movement, closing, resolution, and target alerts.",
      ),
    },
    async (r) => {
      const p = parse(z.object({ id: z.string() }), r.params),
        b = parse(
          z.object({
            movementThreshold: z
              .union([z.literal(5), z.literal(10), z.literal(15)])
              .optional(),
            closingSoon: z.boolean().optional(),
            resolved: z.boolean().optional(),
            targetProbability: z.number().min(0).max(100).optional(),
          }),
          r.body,
        );
      return { data: app.container.services.alerts.put(userId(r), p.id, b) };
    },
  );
  app.delete(
    "/alerts/:id",
    {
      preHandler: app.authenticate,
      schema: schema("Alerts", "Delete an owned market alert."),
    },
    async (r) => {
      app.container.services.alerts.remove(
        userId(r),
        parse(z.object({ id: z.string() }), r.params).id,
      );
      return { data: { deleted: true } };
    },
  );
  app.get(
    "/markets/:id/alerts/me",
    {
      preHandler: app.authenticate,
      schema: schema("Alerts", "Get the current user’s alert for a market."),
    },
    async (r) => {
      const marketId = parse(z.object({ id: z.string() }), r.params).id;
      app.container.services.markets.get(marketId);
      return {
        data:
          app.container.services.alerts
            .list(userId(r))
            .find((a) => a.marketId === marketId) ?? null,
      };
    },
  );
  app.put(
    "/markets/:id/alerts/me",
    {
      preHandler: app.authenticate,
      schema: schema("Alerts", "Canonical create-or-update market alert."),
    },
    async (r) => {
      const marketId = parse(z.object({ id: z.string() }), r.params).id,
        body = parse(
          z.object({
            movementThreshold: z
              .union([z.literal(5), z.literal(10), z.literal(15)])
              .optional(),
            closingSoon: z.boolean().optional(),
            resolved: z.boolean().optional(),
            targetProbability: z.number().min(0).max(100).optional(),
          }),
          r.body,
        );
      return {
        data: app.container.services.alerts.put(userId(r), marketId, body),
      };
    },
  );
};
