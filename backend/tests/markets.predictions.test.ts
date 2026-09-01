import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { bearer, login, testApp } from "./helpers.js";
let app: FastifyInstance;
afterEach(async () => {
  if (app) await app.close();
});
describe("markets, alerts, and paper predictions", () => {
  it("searches and serializes client-ready markets", async () => {
    app = await testApp();
    const res = await app.inject({ url: "/v1/markets?search=bitcoin&limit=2" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data[0].title).toContain("Bitcoin");
    expect(res.json().data[0].outcomes[0].probability).toBeTypeOf("number");
    expect(res.json().meta.limit).toBe(2);
    expect(
      (
        await app.inject({ url: "/v1/markets/bitcoin-2026/history?range=1D" })
      ).json().data,
    ).toHaveLength(24);
  });
  it("creates alert preferences for normalized markets", async () => {
    app = await testApp();
    const auth = await login(app);
    const res = await app.inject({
      method: "PUT",
      url: "/v1/markets/bitcoin-2026/alert",
      headers: bearer(auth.accessToken),
      payload: { movementThreshold: 10, closingSoon: true, resolved: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.movementThreshold).toBe(10);
    expect(
      (
        await app.inject({
          url: "/v1/alerts",
          headers: bearer(auth.accessToken),
        })
      ).json().data,
    ).toHaveLength(1);
  });
  it("quotes potential win and idempotently places one paper prediction", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken);
    const quote = await app.inject({
      method: "POST",
      url: "/v1/predictions/quote",
      headers,
      payload: {
        marketId: "bitcoin-2026",
        outcomeId: "up-85000",
        amount: "10.00",
      },
    });
    expect(quote.statusCode).toBe(200);
    expect(Number(quote.json().data.potentialWin)).toBeGreaterThan(10);
    const place = () =>
      app.inject({
        method: "POST",
        url: "/v1/predictions",
        headers: { ...headers, "idempotency-key": "order-1" },
        payload: { quoteId: quote.json().data.id },
      });
    const first = await place(),
      second = await place();
    expect(first.statusCode).toBe(201);
    expect(second.json().data.id).toBe(first.json().data.id);
    expect(
      (await app.inject({ url: "/v1/predictions", headers })).json().data,
    ).toHaveLength(1);
    expect(
      (await app.inject({ url: "/v1/positions", headers })).json().data,
    ).toHaveLength(1);
    const wallet = (
      await app.inject({ url: "/v1/wallet/summary", headers })
    ).json().data;
    expect(
      wallet.balances.find(
        (balance: { asset: string }) => balance.asset === "USDC",
      ).available,
    ).toBe("990.00");
  });
  it("requires an idempotency key and enforces daily limits", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken);
    await app.inject({
      method: "PATCH",
      url: "/v1/me/preferences",
      headers,
      payload: { dailyPaperLimit: "5.00" },
    });
    const q = await app.inject({
      method: "POST",
      url: "/v1/predictions/quote",
      headers,
      payload: {
        marketId: "bitcoin-2026",
        outcomeId: "up-85000",
        amount: "10.00",
      },
    });
    const missing = await app.inject({
      method: "POST",
      url: "/v1/predictions",
      headers,
      payload: { quoteId: q.json().data.id },
    });
    expect(missing.json().error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
    const limited = await app.inject({
      method: "POST",
      url: "/v1/predictions",
      headers: { ...headers, "idempotency-key": "limited" },
      payload: { quoteId: q.json().data.id },
    });
    expect(limited.statusCode).toBe(409);
    expect(limited.json().error.code).toBe("DAILY_PAPER_LIMIT_EXCEEDED");
  });
});
