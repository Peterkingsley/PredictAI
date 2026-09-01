import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { parse, schema, userId } from "./shared.js";
export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/auth/google",
    {
      schema: schema(
        "Auth",
        "Exchange a verified Google identity token for an access token and rotating refresh token.",
        false,
      ),
    },
    async (r) => {
      const b = parse(
        z.object({
          idToken: z.string().min(1),
          platform: z.enum(["android", "ios", "web"]),
        }),
        r.body,
      );
      const data = await app.container.services.auth.googleLogin({
        ...b,
        ip: r.ip,
        userAgent: r.headers["user-agent"],
      });
      app.container.services.notifications.create(
        data.user.id,
        "security",
        "New sign-in",
        `A new ${b.platform} session was created.`,
        { sessionId: data.sessionId },
        `session:${data.sessionId}`,
      );
      return { data };
    },
  );
  app.post(
    "/auth/refresh",
    {
      schema: schema(
        "Auth",
        "Rotate a refresh token and issue a new access token.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.auth.refresh(
        parse(z.object({ refreshToken: z.string().min(20) }), r.body)
          .refreshToken,
      ),
    }),
  );
  app.post(
    "/auth/logout",
    {
      preHandler: app.authenticate,
      schema: schema("Auth", "Revoke the current session."),
    },
    async (r) => {
      app.container.services.auth.logout(r.authUser!.sessionId);
      return { data: { revoked: true } };
    },
  );
  app.post(
    "/auth/logout-all",
    {
      preHandler: app.authenticate,
      schema: schema("Auth", "Revoke every session for the current user."),
    },
    async (r) => {
      app.container.services.auth.logoutAll(userId(r));
      return { data: { revoked: true } };
    },
  );
  app.get(
    "/auth/sessions",
    {
      preHandler: app.authenticate,
      schema: schema("Auth", "List active sessions without token material."),
    },
    async (r) => ({ data: app.container.services.auth.list(userId(r)) }),
  );
  app.delete(
    "/auth/sessions/:id",
    {
      preHandler: app.authenticate,
      schema: schema("Auth", "Revoke one owned session."),
    },
    async (r) => {
      app.container.services.auth.revoke(
        userId(r),
        parse(z.object({ id: z.string() }), r.params).id,
      );
      return { data: { revoked: true } };
    },
  );
  app.all(
    "/auth/:provider",
    {
      schema: schema(
        "Auth",
        "Reject unsupported authentication providers.",
        false,
      ),
    },
    async (_r, reply) =>
      reply.code(400).send({
        error: {
          code: "AUTH_PROVIDER_NOT_ENABLED",
          message: "Only Google authentication is enabled",
          requestId: _r.id,
        },
      }),
  );
};
