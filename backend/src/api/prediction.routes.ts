import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pageQuery, parse, schema, userId } from "./shared.js";
import { AppError } from "../core/errors.js";
import { page } from "../core/utils.js";
export const predictionRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/predictions/quote",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Predictions",
        "Create a short-lived paper prediction quote with potential winnings.",
      ),
    },
    async (r) => ({
      data: app.container.services.predictions.quote(
        userId(r),
        parse(
          z.object({
            marketId: z.string(),
            outcomeId: z.string(),
            amount: z.string(),
          }),
          r.body,
        ),
      ),
    }),
  );
  app.post(
    "/predictions",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Predictions",
        "Atomically place an idempotent paper prediction from a quote.",
      ),
    },
    async (r, reply) => {
      const key = r.headers["idempotency-key"];
      if (typeof key !== "string")
        throw new AppError(
          "IDEMPOTENCY_KEY_REQUIRED",
          "Idempotency-Key header is required",
          400,
        );
      const data = await app.container.services.predictions.place(
        userId(r),
        parse(z.object({ quoteId: z.string() }), r.body).quoteId,
        key,
      );
      return reply.code(201).send({ data });
    },
  );
  app.get(
    "/predictions",
    {
      preHandler: app.authenticate,
      schema: schema("Predictions", "List owned predictions by status."),
    },
    async (r) => ({
      data: app.container.services.predictions.list(
        userId(r),
        parse(
          z.object({
            status: z.enum(["open", "won", "lost", "refunded"]).optional(),
          }),
          r.query,
        ).status,
      ),
    }),
  );
  app.get(
    "/predictions/:id",
    {
      preHandler: app.authenticate,
      schema: schema("Predictions", "Get one owned prediction."),
    },
    async (r) => ({
      data: app.container.services.predictions.get(
        userId(r),
        parse(z.object({ id: z.string() }), r.params).id,
      ),
    }),
  );
  app.get(
    "/positions",
    {
      preHandler: app.authenticate,
      schema: schema("Predictions", "List current paper positions."),
    },
    async (r) => ({
      data: app.container.services.predictions.positions(userId(r)),
    }),
  );
  app.get(
    "/wallet/summary",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Wallet",
        "Get paper balance and prediction performance summary.",
      ),
    },
    async (r) => ({
      data: app.container.services.predictions.summary(userId(r)),
    }),
  );
  app.get(
    "/wallet/history",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Wallet",
        "Get the paper prediction ledger; custody history is disabled.",
      ),
    },
    async (r) => {
      const query = parse(pageQuery, r.query);
      return page(
        app.container.services.predictions.history(userId(r)),
        query.cursor,
        query.limit,
      );
    },
  );
};
