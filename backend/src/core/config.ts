import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:8081"),
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32)
    .default("development-only-secret-change-me-now"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(2592000),
  GOOGLE_ANDROID_CLIENT_ID: z.string().default(""),
  GOOGLE_IOS_CLIENT_ID: z.string().default(""),
  GOOGLE_WEB_CLIENT_ID: z.string().default(""),
  AVATAR_MAX_BYTES: z.coerce.number().positive().default(5_242_880),
  PAPER_STARTING_BALANCE: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .default("1000.00"),
  AI_CACHE_TTL_SECONDS: z.coerce.number().positive().default(300),
  PAYMENT_PROVIDER: z.literal("sandbox").default("sandbox"),
  PAYMENT_API_KEY: z.string().default(""),
  PAYMENT_IPN_SECRET: z.string().default(""),
  PAYMENT_API_BASE_URL: z.string().default(""),
});
export type Config = z.infer<typeof schema> & { corsOrigins: string[] };
export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.parse(source);
  if (parsed.NODE_ENV === "production") {
    if (parsed.ACCESS_TOKEN_SECRET.startsWith("development-"))
      throw new Error("ACCESS_TOKEN_SECRET is required in production");
    if (
      !parsed.GOOGLE_ANDROID_CLIENT_ID &&
      !parsed.GOOGLE_IOS_CLIENT_ID &&
      !parsed.GOOGLE_WEB_CLIENT_ID
    )
      throw new Error(
        "At least one Google client ID is required in production",
      );
  }
  return {
    ...parsed,
    corsOrigins: parsed.CORS_ORIGINS.split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  };
}
