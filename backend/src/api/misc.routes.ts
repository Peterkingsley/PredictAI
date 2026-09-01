import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { marketJson, pageQuery, parse, schema, userId } from "./shared.js";
export const miscRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/media/:id",
    {
      schema: {
        tags: ["Media"],
        description: "Read an avatar from the development media provider.",
        security: [],
      },
    },
    async (r, reply) => {
      const id = parse(z.object({ id: z.string() }), r.params).id,
        item = await app.container.providers.media.read?.(`/v1/media/${id}`);
      if (!item)
        return reply.code(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Media not found",
            requestId: r.id,
          },
        });
      return reply.type(item.mime).send(item.bytes);
    },
  );
  app.get(
    "/notifications",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Notifications",
        "List owned notifications with cursor pagination.",
      ),
    },
    async (r) => {
      const q = parse(pageQuery, r.query);
      return app.container.services.notifications.list(
        userId(r),
        q.cursor,
        q.limit,
      );
    },
  );
  app.get(
    "/notifications/unread-count",
    {
      preHandler: app.authenticate,
      schema: schema("Notifications", "Get unread notification count."),
    },
    async (r) => ({
      data: { count: app.container.services.notifications.unread(userId(r)) },
    }),
  );
  app.put(
    "/notifications/:id/read",
    {
      preHandler: app.authenticate,
      schema: schema("Notifications", "Mark an owned notification as read."),
    },
    async (r) => ({
      data: app.container.services.notifications.read(
        userId(r),
        parse(z.object({ id: z.string() }), r.params).id,
      ),
    }),
  );
  app.put(
    "/notifications/read-all",
    {
      preHandler: app.authenticate,
      schema: schema("Notifications", "Mark all owned notifications as read."),
    },
    async (r) => {
      app.container.services.notifications.readAll(userId(r));
      return { data: { read: true } };
    },
  );
  app.post(
    "/devices",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Notifications",
        "Register an Android, iOS, or web push device.",
      ),
    },
    async (r) => {
      const b = parse(
        z.object({
          platform: z.enum(["android", "ios", "web"]),
          token: z.string().min(8),
        }),
        r.body,
      );
      return {
        data: app.container.services.notifications.register(
          userId(r),
          b.platform,
          b.token,
        ),
      };
    },
  );
  app.delete(
    "/devices/:id",
    {
      preHandler: app.authenticate,
      schema: schema("Notifications", "Remove an owned push device."),
    },
    async (r) => {
      app.container.services.notifications.remove(
        userId(r),
        parse(z.object({ id: z.string() }), r.params).id,
      );
      return { data: { deleted: true } };
    },
  );
  app.get(
    "/notification-preferences",
    {
      preHandler: app.authenticate,
      schema: schema("Notifications", "Get notification category preferences."),
    },
    async (r) => ({
      data: app.container.services.users.prefs(userId(r)).notifications,
    }),
  );
  app.put(
    "/notification-preferences",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Notifications",
        "Replace notification category preferences.",
      ),
    },
    async (r) => {
      const b = parse(
        z.object({
          market: z.boolean(),
          predictions: z.boolean(),
          social: z.boolean(),
          security: z.boolean(),
          wallet: z.boolean(),
          push: z.boolean(),
        }),
        r.body,
      );
      app.container.services.users.prefs(userId(r)).notifications = b;
      return { data: b };
    },
  );
  app.post(
    "/notifications/devices",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Notifications",
        "Canonical push-device registration contract.",
      ),
    },
    async (r) => {
      const b = parse(
        z.object({
          platform: z.enum(["android", "ios", "web"]),
          token: z.string().min(8),
        }),
        r.body,
      );
      return {
        data: app.container.services.notifications.register(
          userId(r),
          b.platform,
          b.token,
        ),
      };
    },
  );
  app.delete(
    "/notifications/devices/:id",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Notifications",
        "Canonical push-device removal contract.",
      ),
    },
    async (r) => {
      app.container.services.notifications.remove(
        userId(r),
        parse(z.object({ id: z.string() }), r.params).id,
      );
      return { data: { deleted: true } };
    },
  );
  app.get(
    "/notifications/preferences",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Notifications",
        "Canonical notification preferences contract.",
      ),
    },
    async (r) => ({
      data: app.container.services.users.prefs(userId(r)).notifications,
    }),
  );
  app.put(
    "/notifications/preferences",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Notifications",
        "Replace canonical notification preferences.",
      ),
    },
    async (r) => {
      const b = parse(
        z.object({
          market: z.boolean(),
          predictions: z.boolean(),
          social: z.boolean(),
          security: z.boolean(),
          wallet: z.boolean(),
          push: z.boolean(),
        }),
        r.body,
      );
      app.container.services.users.prefs(userId(r)).notifications = b;
      return { data: b };
    },
  );
  app.post(
    "/support/tickets",
    {
      preHandler: app.authenticate,
      schema: schema("Support", "Create an owned support ticket."),
    },
    async (r) => {
      const b = parse(
        z.object({ subject: z.string(), message: z.string() }),
        r.body,
      );
      return {
        data: app.container.services.support.create(
          userId(r),
          b.subject,
          b.message,
        ),
      };
    },
  );
  app.get(
    "/support/tickets",
    {
      preHandler: app.authenticate,
      schema: schema("Support", "List the current user’s support tickets."),
    },
    async (r) => ({ data: app.container.services.support.list(userId(r)) }),
  );
  app.get(
    "/app-config",
    {
      schema: schema(
        "Configuration",
        "Get public capabilities, supported client options, and legal URLs.",
        false,
      ),
    },
    async () => ({
      data: {
        features: {
          paperPredictions: true,
          realMoneyExecution: false,
          custody: false,
          externalWalletConnections: false,
          aiAnalysis: true,
          social: true,
          wallet: {
            enabled: true,
            mode: "sandbox",
            liveDeposits: false,
            liveWithdrawals: false,
          },
        },
        wallet: {
          enabled: true,
          mode: "sandbox",
          liveDeposits: false,
          liveWithdrawals: false,
        },
        networks: ["ethereum", "polygon", "arbitrum", "base"],
        currencies: ["USD", "NGN", "USDC"],
        languages: ["en", "fr"],
        legal: {
          termsUrl: "https://predictai.example/terms",
          privacyUrl: "https://predictai.example/privacy",
        },
      },
    }),
  );
  app.get(
    "/app/config",
    {
      schema: schema(
        "Configuration",
        "Canonical public application configuration.",
        false,
      ),
    },
    async () => ({
      data: {
        features: {
          paperPredictions: true,
          realMoneyExecution: false,
          custody: false,
          externalWalletConnections: false,
          aiAnalysis: true,
          social: true,
          wallet: {
            enabled: true,
            mode: "sandbox",
            liveDeposits: false,
            liveWithdrawals: false,
          },
        },
        wallet: {
          enabled: true,
          mode: "sandbox",
          liveDeposits: false,
          liveWithdrawals: false,
        },
        networks: ["ethereum", "polygon", "arbitrum", "base"],
        currencies: ["USD", "NGN", "USDC"],
        languages: ["en", "fr"],
        legal: {
          termsUrl: "https://predictai.example/terms",
          privacyUrl: "https://predictai.example/privacy",
        },
      },
    }),
  );
  app.get(
    "/events",
    {
      schema: schema(
        "Markets",
        "Compatibility alias for the normalized market list.",
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
    "/bootstrap",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Configuration",
        "Bootstrap both clients with user, preferences, privacy, unread count, paper balance, and feature flags.",
      ),
    },
    async (r) => {
      const uid = userId(r);
      return {
        data: {
          user: app.container.services.users.get(uid),
          preferences: app.container.services.users.prefs(uid),
          privacy: app.container.services.users.privacy(uid),
          walletSettings: app.container.services.wallet.settings(uid),
          unreadNotifications: app.container.services.notifications.unread(uid),
          wallet: app.container.services.wallet.overview(uid),
          features: {
            paperPredictions: true,
            realMoneyExecution: false,
            custody: false,
            externalWalletConnections: false,
            wallet: {
              enabled: true,
              mode: "sandbox",
              liveDeposits: false,
              liveWithdrawals: false,
            },
          },
        },
      };
    },
  );
};
