import Fastify, { type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { loadConfig, type Config } from "./core/config.js";
import { AppError, unauthorized } from "./core/errors.js";
import { publicBigInt } from "./core/utils.js";
import { createContainer, type ContainerOverrides } from "./container.js";
import { authRoutes } from "./api/auth.routes.js";
import { userRoutes } from "./api/user.routes.js";
import { marketRoutes } from "./api/market.routes.js";
import { predictionRoutes } from "./api/prediction.routes.js";
import { intelligenceRoutes } from "./api/intelligence.routes.js";
import { socialRoutes } from "./api/social.routes.js";
import { miscRoutes } from "./api/misc.routes.js";
export interface BuildOptions {
  config?: Config;
  overrides?: ContainerOverrides;
  logger?: boolean;
}
export async function buildApp(options: BuildOptions = {}) {
  const config = options.config ?? loadConfig();
  const app = Fastify({
    logger: options.logger ?? config.NODE_ENV !== "test",
    genReqId: (req) => {
      const v = req.headers["x-request-id"];
      return typeof v === "string" && /^[a-zA-Z0-9._:-]{1,100}$/.test(v)
        ? v
        : crypto.randomUUID();
    },
    requestIdHeader: "x-request-id",
  });
  await app.register(cors, {
    origin: (origin, cb) =>
      cb(null, !origin || config.corsOrigins.includes(origin)),
    credentials: true,
  });
  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(jwt, { secret: config.ACCESS_TOKEN_SECRET });
  await app.register(multipart, {
    limits: { fileSize: config.AVATAR_MAX_BYTES, files: 1 },
  });
  app.addSchema({
    $id: "Error",
    type: "object",
    required: ["error"],
    properties: {
      error: {
        type: "object",
        required: ["code", "message", "requestId"],
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          details: {},
          requestId: { type: "string" },
        },
      },
    },
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "PredictAI Unified Backend",
        version: "1.0.0",
        description:
          "Backend for PredictAI mobile and desktop clients. Paper predictions only; custody and real execution are disabled.",
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });
  const container = createContainer(
    config,
    (claims, ttl) => app.jwt.sign(claims, { expiresIn: ttl }),
    options.overrides,
  );
  app.decorate("container", container);
  app.decorate("authenticate", async function (request: FastifyRequest) {
    try {
      await request.jwtVerify();
      const p = request.user as { sub?: string; sid?: string };
      if (!p.sub || !p.sid) throw unauthorized();
      container.services.auth.authenticate(p.sub, p.sid);
      request.authUser = { userId: p.sub, sessionId: p.sid };
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw unauthorized();
    }
  });
  app.decorate(
    "optionalAuthenticate",
    async function (request: FastifyRequest) {
      if (!request.headers.authorization) return;
      await app.authenticate(request);
    },
  );
  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-request-id", request.id);
    return payload;
  });
  app.addHook("onResponse", async (request, reply) => {
    if (request.method !== "GET" && request.url.startsWith("/v1/"))
      request.log.info(
        {
          audit: true,
          actorId: request.authUser?.userId,
          method: request.method,
          path: request.routeOptions.url,
          statusCode: reply.statusCode,
          requestId: request.id,
        },
        "sensitive action audit",
      );
  });
  app.setErrorHandler((error, request, reply) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    const e =
      error instanceof ZodError
        ? new AppError(
            "VALIDATION_ERROR",
            "Request validation failed",
            422,
            error.issues,
          )
        : error instanceof AppError
          ? error
          : new AppError(
              "INTERNAL_ERROR",
              config.NODE_ENV === "production"
                ? "An unexpected error occurred"
                : message,
              500,
            );
    if (e.statusCode >= 500)
      request.log.error(
        { err: error, requestId: request.id },
        "request failed",
      );
    reply.code(e.statusCode).send({
      error: {
        code: e.code,
        message: e.message,
        details: e.details,
        requestId: request.id,
      },
    });
  });
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "Route not found",
        requestId: request.id,
      },
    }),
  );
  app.get(
    "/health",
    { schema: { tags: ["Infrastructure"], description: "Liveness check." } },
    async () => ({ data: { status: "ok" } }),
  );
  app.get(
    "/ready",
    {
      schema: {
        tags: ["Infrastructure"],
        description: "Readiness check for repository and providers.",
      },
    },
    async () => ({ data: { status: "ready", repository: "memory" } }),
  );
  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(userRoutes);
      await api.register(marketRoutes);
      await api.register(predictionRoutes);
      await api.register(intelligenceRoutes);
      await api.register(socialRoutes);
      await api.register(miscRoutes);
    },
    { prefix: "/v1" },
  );
  app.addHook("onClose", async () => container.scheduler.stop());
  app.addHook("onReady", async () => {
    if (config.NODE_ENV !== "test") container.scheduler.start();
  });
  return app;
}
export const stringifyResponse = (value: unknown) =>
  JSON.stringify(value, publicBigInt);
