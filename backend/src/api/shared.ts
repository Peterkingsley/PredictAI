import { z } from "zod";
import type { FastifyRequest } from "fastify";
import { AppError } from "../core/errors.js";
import type { Market } from "../models/domain.js";
export const pageQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AppError(
      "VALIDATION_ERROR",
      "Request validation failed",
      422,
      result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    );
  return result.data;
}
export const userId = (r: FastifyRequest) => r.authUser!.userId;
export const viewerId = (r: FastifyRequest) => r.authUser?.userId;
export const marketJson = (m: Market) => ({
  ...m,
  outcomes: m.outcomes.map((o) => ({
    ...o,
    probability: o.probabilityBps / 100,
    probabilityBps: undefined,
  })),
});
export const schema = (tag: string, description: string, auth = true) => ({
  tags: [tag],
  description,
  security: auth ? [{ bearerAuth: [] }] : [],
  response: {
    "2xx": {
      type: "object",
      required: ["data"],
      additionalProperties: false,
      properties: {
        data: {},
        meta: { type: "object", additionalProperties: true },
      },
    },
    "4xx": { $ref: "Error#" },
  },
});
