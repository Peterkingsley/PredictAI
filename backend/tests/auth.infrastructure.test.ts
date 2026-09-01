import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { bearer, login, testApp } from "./helpers.js";
let app: FastifyInstance;
afterEach(async () => {
  if (app) await app.close();
});
describe("infrastructure and authentication", () => {
  it("serves health, readiness, OpenAPI, and request IDs", async () => {
    app = await testApp();
    const health = await app.inject({
      url: "/health",
      headers: { "x-request-id": "contract-123" },
    });
    expect(health.statusCode).toBe(200);
    expect(health.headers["x-request-id"]).toBe("contract-123");
    expect((await app.inject({ url: "/ready" })).json().data.repository).toBe(
      "memory",
    );
    expect((await app.inject({ url: "/docs/json" })).statusCode).toBe(200);
  });
  it("supports Google-only login and authenticated sessions", async () => {
    app = await testApp();
    const auth = await login(app);
    expect(auth.accessToken).toBeTruthy();
    const me = await app.inject({
      url: "/v1/me",
      headers: bearer(auth.accessToken),
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().data.email).toBe("user1@example.com");
    const sessions = await app.inject({
      url: "/v1/auth/sessions",
      headers: bearer(auth.accessToken),
    });
    expect(sessions.json().data).toHaveLength(1);
  });
  it("rotates refresh tokens and detects reuse", async () => {
    app = await testApp();
    const auth = await login(app);
    const rotated = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: auth.refreshToken },
    });
    expect(rotated.statusCode).toBe(200);
    const reuse = await app.inject({
      method: "POST",
      url: "/v1/auth/refresh",
      payload: { refreshToken: auth.refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json().error.message).toContain("reuse");
    const me = await app.inject({
      url: "/v1/me",
      headers: bearer(rotated.json().data.accessToken),
    });
    expect(me.statusCode).toBe(401);
  });
  it("rejects non-Google providers with a stable code", async () => {
    app = await testApp();
    const res = await app.inject({
      method: "POST",
      url: "/v1/auth/password",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("AUTH_PROVIDER_NOT_ENABLED");
  });
});
