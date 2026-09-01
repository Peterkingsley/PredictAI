import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { bearer, login, testApp } from "./helpers.js";
let app: FastifyInstance;
afterEach(async () => {
  if (app) await app.close();
});
describe("profile, wallet, notifications, support, and client contracts", () => {
  it("normalizes profile updates and rejects duplicate usernames", async () => {
    app = await testApp();
    const one = await login(app, "token-1"),
      two = await login(app, "token-2");
    const updated = await app.inject({
      method: "PATCH",
      url: "/v1/me/profile",
      headers: bearer(one.accessToken),
      payload: {
        username: "@Peter_K",
        bio: "Prediction markets",
        specializations: ["Crypto", "AI"],
      },
    });
    expect(updated.json().data.username).toBe("peter_k");
    const duplicate = await app.inject({
      method: "PATCH",
      url: "/v1/me/profile",
      headers: bearer(two.accessToken),
      payload: { username: "peter_k" },
    });
    expect(duplicate.statusCode).toBe(409);
  });
  it("uploads, reads, and deletes an avatar through the media abstraction", async () => {
    app = await testApp();
    const auth = await login(app),
      boundary = "predictai-boundary";
    const payload = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="avatar.png"\r\nContent-Type: image/png\r\n\r\nPNGDATA\r\n--${boundary}--\r\n`,
    );
    const upload = await app.inject({
      method: "POST",
      url: "/v1/me/avatar",
      headers: {
        ...bearer(auth.accessToken),
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });
    expect(upload.statusCode).toBe(200);
    const url = upload.json().data.avatarUrl;
    const image = await app.inject({ url });
    expect(image.statusCode).toBe(200);
    expect(image.headers["content-type"]).toContain("image/png");
    await app.inject({
      method: "DELETE",
      url: "/v1/me/avatar",
      headers: bearer(auth.accessToken),
    });
    expect((await app.inject({ url })).statusCode).toBe(404);
  });
  it("matches mobile and desktop wallet option unions while disabling custody", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken);
    const config = (await app.inject({ url: "/v1/app-config" })).json().data;
    expect(config.currencies).toEqual(["USD", "NGN", "USDC"]);
    expect(config.networks).toEqual([
      "Ethereum",
      "Polygon",
      "Arbitrum",
      "Base",
    ]);
    expect(config.features.realMoneyExecution).toBe(false);
    const address = await app.inject({
      method: "POST",
      url: "/v1/wallet/trusted-addresses",
      headers,
      payload: {
        label: "Cold",
        address: "0x1111111111111111111111111111111111111111",
        network: "Base",
      },
    });
    expect(address.statusCode).toBe(200);
    const withdrawal = await app.inject({
      method: "POST",
      url: "/v1/wallet/withdrawals",
      headers,
      payload: {},
    });
    expect(withdrawal.statusCode).toBe(501);
    expect(withdrawal.json().error.code).toBe("PROVIDER_DISABLED");
  });
  it("registers devices, reads notifications, and opens support tickets", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken);
    expect(
      (
        await app.inject({ url: "/v1/notifications/unread-count", headers })
      ).json().data.count,
    ).toBe(1);
    const device = await app.inject({
      method: "POST",
      url: "/v1/devices",
      headers,
      payload: { platform: "android", token: "expo-device-token" },
    });
    expect(device.statusCode).toBe(200);
    await app.inject({
      method: "PUT",
      url: "/v1/notifications/read-all",
      headers,
    });
    expect(
      (
        await app.inject({ url: "/v1/notifications/unread-count", headers })
      ).json().data.count,
    ).toBe(0);
    const ticket = await app.inject({
      method: "POST",
      url: "/v1/support/tickets",
      headers,
      payload: {
        subject: "Market question",
        message: "Please explain the resolution source.",
      },
    });
    expect(ticket.statusCode).toBe(200);
    expect(
      (await app.inject({ url: "/v1/support/tickets", headers })).json().data,
    ).toHaveLength(1);
  });
  it("returns a complete bootstrap contract for both clients", async () => {
    app = await testApp();
    const auth = await login(app);
    const res = await app.inject({
      url: "/v1/bootstrap",
      headers: bearer(auth.accessToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({
      preferences: { defaultCurrency: "USD" },
      privacy: { publicProfile: true },
      walletSettings: { defaultNetwork: "Polygon" },
      wallet: { paperBalance: "1000.00" },
      features: { custody: false, realMoneyExecution: false },
    });
  });
  it("exposes the canonical master-brief route aliases", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken);
    expect(
      (await app.inject({ url: "/v1/users/me", headers })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ url: `/v1/profiles/${auth.user.id}`, headers }))
        .statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ url: "/v1/markets/categories" })).statusCode,
    ).toBe(200);
    expect((await app.inject({ url: "/v1/app/config" })).statusCode).toBe(200);
    expect(
      (await app.inject({ url: "/v1/notifications/preferences", headers }))
        .statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          url: "/v1/intelligence/markets/bitcoin-2026/preview",
        })
      ).statusCode,
    ).toBe(200);
  });
});
