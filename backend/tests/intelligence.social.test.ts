import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { bearer, login, testApp } from "./helpers.js";
let app: FastifyInstance;
afterEach(async () => {
  if (app) await app.close();
});
describe("intelligence and social", () => {
  it("returns deterministic evidence-backed analysis and cache hits", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken),
      payload = { marketId: "bitcoin-2026", outcomeId: "up-85000" };
    const first = await app.inject({
        method: "POST",
        url: "/v1/intelligence/analysis",
        headers,
        payload,
      }),
      second = await app.inject({
        method: "POST",
        url: "/v1/intelligence/analysis",
        headers,
        payload,
      });
    expect(first.statusCode).toBe(200);
    expect(first.json().data.sources[0].kind).toBe("market_fixture");
    expect(second.json().data.id).toBe(first.json().data.id);
    expect(first.json().data.signals.length).toBeGreaterThan(0);
  });
  it("creates server-validated market and AI posts and interactions", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken);
    const ai = (
      await app.inject({
        method: "POST",
        url: "/v1/intelligence/analysis",
        headers,
        payload: { marketId: "bitcoin-2026" },
      })
    ).json().data;
    const made = await app.inject({
      method: "POST",
      url: "/v1/posts",
      headers,
      payload: {
        type: "ai_analysis",
        content: "A transparent fixture-backed view.",
        aiAnalysisId: ai.id,
      },
    });
    expect(made.statusCode).toBe(201);
    const id = made.json().data.id;
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/v1/posts/${id}/like`,
          headers,
        })
      ).json().data.likes,
    ).toBe(1);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/v1/posts/${id}/save`,
          headers,
        })
      ).json().data.saved,
    ).toBe(true);
    expect(
      (await app.inject({ url: "/v1/posts/saved", headers })).json().data,
    ).toHaveLength(1);
  });
  it("enforces private profiles and block visibility", async () => {
    app = await testApp();
    const one = await login(app, "token-1"),
      two = await login(app, "token-2");
    await app.inject({
      method: "POST",
      url: "/v1/posts",
      headers: bearer(one.accessToken),
      payload: { type: "insight", content: "private later" },
    });
    await app.inject({
      method: "PATCH",
      url: "/v1/me/privacy",
      headers: bearer(one.accessToken),
      payload: { publicProfile: false },
    });
    expect(
      (
        await app.inject({
          url: `/v1/users/${one.user.id}`,
          headers: bearer(two.accessToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          url: "/v1/posts/feed",
          headers: bearer(two.accessToken),
        })
      ).json().data,
    ).toHaveLength(0);
  });
  it("moderates wallet secrets and validates one attachment", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken);
    const rejected = await app.inject({
      method: "POST",
      url: "/v1/posts",
      headers,
      payload: { type: "insight", content: "Here is my private key" },
    });
    expect(rejected.statusCode).toBe(422);
    const tooMany = await app.inject({
      method: "POST",
      url: "/v1/posts",
      headers,
      payload: {
        type: "market",
        content: "x",
        marketId: "bitcoin-2026",
        quotePostId: "missing",
      },
    });
    expect(tooMany.json().error.code).toBe("TOO_MANY_ATTACHMENTS");
    const missing = await app.inject({
      method: "POST",
      url: "/v1/posts",
      headers,
      payload: { type: "market", content: "No market attached" },
    });
    expect(missing.json().error.code).toBe("ATTACHMENT_REQUIRED");
  });
});
