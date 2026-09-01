import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../core/errors.js";
import { pageQuery, parse, schema, userId } from "./shared.js";

const asset = z.enum(["USDC", "USDT"]);
const network = z.enum(["ethereum", "polygon", "arbitrum", "base"]);
const depositStatus = z.enum([
  "waiting",
  "confirming",
  "completed",
  "expired",
  "failed",
]);
const withdrawalStatus = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);
const walletSettings = z
  .object({
    requireBiometrics: z.boolean(),
    withdrawalConfirmation: z.boolean(),
    autoLock: z.enum(["1 min", "5 min", "15 min", "Never"]),
    defaultNetwork: network,
    withdrawalLimit: z.string().regex(/^\d+(\.\d{1,2})?$/),
    feeSpeed: z.enum(["Standard", "Fast"]),
    transactionNotifications: z.boolean(),
    currency: z.enum(["USD", "NGN", "USDC"]),
    hideBalances: z.boolean(),
    assetSort: z.enum(["Balance", "Name", "Performance"]),
    compactView: z.boolean(),
    walletMode: z.enum(["Prediction", "Trading"]),
    supportedAssets: z.object({
      USDC: z.boolean().optional(),
      USDT: z.boolean().optional(),
    }),
  })
  .partial();

export const walletRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/wallet",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Wallet",
        "Get the authenticated user’s sandbox wallet overview and calculated balances.",
      ),
    },
    async (request) => ({
      data: app.container.services.wallet.overview(userId(request)),
    }),
  );

  app.post(
    "/wallet/deposits",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: schema(
        "Wallet deposits",
        "Create an idempotent sandbox deposit intent and non-production address.",
      ),
    },
    async (request, reply) => {
      const key = request.headers["idempotency-key"];
      if (typeof key !== "string")
        throw new AppError(
          "IDEMPOTENCY_KEY_REQUIRED",
          "Idempotency-Key header is required",
          400,
        );
      const data = await app.container.services.deposits.create(
        userId(request),
        parse(z.object({ asset, network }), request.body),
        key,
      );
      return reply.code(201).send({ data });
    },
  );

  app.get(
    "/wallet/deposits",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Wallet deposits",
        "List owned sandbox deposits with filters and cursor pagination.",
      ),
    },
    async (request) =>
      app.container.services.deposits.list(
        userId(request),
        parse(
          pageQuery.extend({
            asset: asset.optional(),
            network: network.optional(),
            status: depositStatus.optional(),
          }),
          request.query,
        ),
      ),
  );

  app.get(
    "/wallet/deposits/:id",
    {
      preHandler: app.authenticate,
      schema: schema("Wallet deposits", "Get one owned sandbox deposit."),
    },
    async (request) => ({
      data: app.container.services.deposits.get(
        userId(request),
        parse(z.object({ id: z.string() }), request.params).id,
      ),
    }),
  );

  if (app.container.config.NODE_ENV !== "production")
    app.post(
      "/dev/wallet/deposits/:id/simulate",
      {
        preHandler: app.authenticate,
        config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
        schema: schema(
          "Wallet development",
          "Complete an owned sandbox deposit and credit the immutable ledger. Never registered in production.",
        ),
      },
      async (request) => ({
        data: app.container.services.deposits.simulate(
          userId(request),
          parse(z.object({ id: z.string() }), request.params).id,
          parse(z.object({ amount: z.string() }), request.body).amount,
        ),
      }),
    );

  app.post(
    "/wallet/withdrawals/quote",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: schema(
        "Wallet withdrawals",
        "Validate and quote a sandbox withdrawal without broadcasting a transaction.",
      ),
    },
    async (request) => ({
      data: app.container.services.withdrawals.quote(
        userId(request),
        parse(
          z.object({
            asset,
            network,
            address: z.string(),
            amount: z.string(),
          }),
          request.body,
        ),
      ),
    }),
  );

  app.post(
    "/wallet/withdrawals",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: schema(
        "Wallet withdrawals",
        "Confirm an idempotent sandbox withdrawal. No blockchain transaction is created.",
      ),
    },
    async (request, reply) => {
      const key = request.headers["idempotency-key"];
      if (typeof key !== "string")
        throw new AppError(
          "IDEMPOTENCY_KEY_REQUIRED",
          "Idempotency-Key header is required",
          400,
        );
      const data = await app.container.services.withdrawals.create(
        userId(request),
        parse(z.object({ quoteId: z.string() }), request.body).quoteId,
        key,
      );
      return reply.code(201).send({ data });
    },
  );

  app.get(
    "/wallet/withdrawals",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Wallet withdrawals",
        "List owned sandbox withdrawals with filters and cursor pagination.",
      ),
    },
    async (request) =>
      app.container.services.withdrawals.list(
        userId(request),
        parse(
          pageQuery.extend({
            asset: asset.optional(),
            network: network.optional(),
            status: withdrawalStatus.optional(),
          }),
          request.query,
        ),
      ),
  );

  app.get(
    "/wallet/withdrawals/:id",
    {
      preHandler: app.authenticate,
      schema: schema("Wallet withdrawals", "Get one owned sandbox withdrawal."),
    },
    async (request) => ({
      data: app.container.services.withdrawals.get(
        userId(request),
        parse(z.object({ id: z.string() }), request.params).id,
      ),
    }),
  );

  if (app.container.config.NODE_ENV !== "production")
    app.post(
      "/dev/wallet/withdrawals/:id/complete",
      {
        preHandler: app.authenticate,
        config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
        schema: schema(
          "Wallet development",
          "Complete an owned sandbox withdrawal. Never registered in production.",
        ),
      },
      async (request) => ({
        data: app.container.services.withdrawals.complete(
          userId(request),
          parse(z.object({ id: z.string() }), request.params).id,
        ),
      }),
    );

  app.get(
    "/wallet/history",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Wallet",
        "List normalized deposit, withdrawal, and prediction ledger activity.",
      ),
    },
    async (request) =>
      app.container.services.wallet.history(
        userId(request),
        parse(
          pageQuery.extend({
            type: z.enum(["deposit", "withdrawal", "prediction"]).optional(),
            status: z.string().optional(),
            asset: asset.optional(),
          }),
          request.query,
        ),
      ),
  );

  app.get(
    "/wallet/trusted-addresses",
    {
      preHandler: app.authenticate,
      schema: schema("Wallet", "List owned trusted EVM addresses."),
    },
    async (request) => ({
      data: app.container.services.wallet.trusted(userId(request)),
    }),
  );

  app.post(
    "/wallet/trusted-addresses",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: schema("Wallet", "Validate and store a trusted EVM address."),
    },
    async (request, reply) =>
      reply.code(201).send({
        data: app.container.services.wallet.addTrusted(
          userId(request),
          parse(
            z.object({
              label: z.string().min(1).max(80),
              address: z.string(),
              network,
            }),
            request.body,
          ),
        ),
      }),
  );

  app.delete(
    "/wallet/trusted-addresses/:id",
    {
      preHandler: app.authenticate,
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: schema("Wallet", "Delete an owned trusted address."),
    },
    async (request) => {
      app.container.services.wallet.deleteTrusted(
        userId(request),
        parse(z.object({ id: z.string() }), request.params).id,
      );
      return { data: { deleted: true } };
    },
  );

  app.get(
    "/wallet/settings",
    {
      preHandler: app.authenticate,
      schema: schema("Wallet", "Get current wallet preferences."),
    },
    async (request) => ({
      data: app.container.services.wallet.settings(userId(request)),
    }),
  );

  app.patch(
    "/wallet/settings",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Wallet",
        "Patch wallet preferences while keeping at least one asset enabled.",
      ),
    },
    async (request) => ({
      data: app.container.services.wallet.updateSettings(
        userId(request),
        parse(walletSettings, request.body),
      ),
    }),
  );

  app.post(
    "/webhooks/payments/:provider",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: schema(
        "Payment webhooks",
        "Process an idempotent provider event. Sandbox events require the explicit test header and are disabled in production.",
        false,
      ),
    },
    async (request) => ({
      data: await app.container.services.paymentWebhooks.process(
        parse(z.object({ provider: z.string() }), request.params).provider,
        request.headers,
        Buffer.from(JSON.stringify(request.body ?? {})),
      ),
    }),
  );
};
