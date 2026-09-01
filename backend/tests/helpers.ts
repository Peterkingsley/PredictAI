import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/core/config.js";
import type {
  GoogleIdentityVerifier,
  VerifiedGoogleIdentity,
} from "../src/core/providers.js";
import type { Platform } from "../src/models/domain.js";
export class FakeGoogle implements GoogleIdentityVerifier {
  async verify(
    token: string,
    _platform: Platform,
  ): Promise<VerifiedGoogleIdentity> {
    const n = token.replace(/\D/g, "") || "1";
    return {
      subject: `google-${n}`,
      email: `user${n}@example.com`,
      displayName: `User ${n}`,
    };
  }
}
export async function testApp() {
  return buildApp({
    config: loadConfig({
      NODE_ENV: "test",
      ACCESS_TOKEN_SECRET: "test-secret-that-is-at-least-32-characters",
    }),
    overrides: { googleVerifier: new FakeGoogle() },
    logger: false,
  });
}
export async function login(app: FastifyInstance, token = "token-1") {
  const res = await app.inject({
    method: "POST",
    url: "/v1/auth/google",
    payload: { idToken: token, platform: "web" },
  });
  if (res.statusCode !== 200) throw new Error(res.body);
  return res.json().data as {
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    user: { id: string };
  };
}
export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
