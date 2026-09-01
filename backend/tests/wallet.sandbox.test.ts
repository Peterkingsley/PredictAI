import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/core/config.js";
import { bearer, FakeGoogle, login, testApp } from "./helpers.js";

let app: FastifyInstance;
afterEach(async () => {
  if (app) await app.close();
});

const address = "0x1111111111111111111111111111111111111111";
const balance = (wallet: {
  balances: { asset: string; available: string }[];
}) => wallet.balances.find((value) => value.asset === "USDC")!.available;

async function createDeposit(
  target: FastifyInstance,
  accessToken: string,
  key = "deposit-1",
) {
  return target.inject({
    method: "POST",
    url: "/v1/wallet/deposits",
    headers: { ...bearer(accessToken), "idempotency-key": key },
    payload: { asset: "USDC", network: "polygon" },
  });
}

async function quoteWithdrawal(
  target: FastifyInstance,
  accessToken: string,
  amount = "50.00",
) {
  return target.inject({
    method: "POST",
    url: "/v1/wallet/withdrawals/quote",
    headers: bearer(accessToken),
    payload: { asset: "USDC", network: "polygon", address, amount },
  });
}

describe("sandbox wallet", () => {
  it("creates one wallet with an immutable initial sandbox credit", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken);
    const response = await app.inject({ url: "/v1/wallet", headers });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({
      mode: "sandbox",
      status: "active",
      balances: [
        { asset: "USDC", available: "1000.00", total: "1000.00" },
        { asset: "USDT", available: "0.00", total: "0.00" },
      ],
    });
    expect(app.container.repository.walletAccounts.size).toBe(1);
    expect(app.container.repository.walletLedger).toHaveLength(1);
    expect(app.container.repository.walletLedger[0]?.type).toBe(
      "sandbox_credit",
    );
    expect(Object.isFrozen(app.container.repository.walletLedger[0])).toBe(
      true,
    );
    expect(app.container.repository.walletAuditEvents[0]?.action).toBe(
      "wallet_created",
    );
  });

  it("requires authentication for wallet resources", async () => {
    app = await testApp();
    expect((await app.inject({ url: "/v1/wallet" })).statusCode).toBe(401);
    expect((await app.inject({ url: "/v1/wallet/deposits" })).statusCode).toBe(
      401,
    );
    expect(
      (await app.inject({ url: "/v1/wallet/withdrawals" })).statusCode,
    ).toBe(401);
  });

  it("creates an idempotent, obviously non-production deposit intent", async () => {
    app = await testApp();
    const auth = await login(app);
    const first = await createDeposit(app, auth.accessToken),
      repeated = await createDeposit(app, auth.accessToken);
    expect(first.statusCode).toBe(201);
    expect(first.json().data.address).toMatch(/^sandbox_polygon_usdc_/);
    expect(first.json().data.mode).toBe("sandbox");
    expect(repeated.json().data.id).toBe(first.json().data.id);
    expect(app.container.repository.deposits.size).toBe(1);
  });

  it("simulates a deposit once, credits the ledger, and notifies", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken),
      created = await createDeposit(app, auth.accessToken),
      depositId = created.json().data.id;
    const complete = () =>
      app.inject({
        method: "POST",
        url: `/v1/dev/wallet/deposits/${depositId}/simulate`,
        headers,
        payload: { amount: "100.00" },
      });
    expect((await complete()).json().data.status).toBe("completed");
    await complete();
    const wallet = (await app.inject({ url: "/v1/wallet", headers })).json()
      .data;
    expect(balance(wallet)).toBe("1100.00");
    expect(
      app.container.repository.walletLedger.filter(
        (entry) => entry.type === "sandbox_deposit",
      ),
    ).toHaveLength(1);
    const notifications = (
      await app.inject({ url: "/v1/notifications", headers })
    ).json().data;
    expect(
      notifications.map((value: { title: string }) => value.title),
    ).toEqual(
      expect.arrayContaining(["Deposit detected", "Deposit completed"]),
    );
  });

  it("filters deposit history and rejects cross-user access", async () => {
    app = await testApp();
    const one = await login(app, "token-1"),
      two = await login(app, "token-2"),
      created = await createDeposit(app, one.accessToken),
      id = created.json().data.id;
    const history = await app.inject({
      url: "/v1/wallet/deposits?asset=USDC&network=polygon&status=waiting",
      headers: bearer(one.accessToken),
    });
    expect(history.json().data).toHaveLength(1);
    expect(
      (
        await app.inject({
          url: `/v1/wallet/deposits/${id}`,
          headers: bearer(two.accessToken),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/dev/wallet/deposits/${id}/simulate`,
          headers: bearer(two.accessToken),
          payload: { amount: "1.00" },
        })
      ).statusCode,
    ).toBe(404);
  });

  it("validates withdrawal addresses, networks, balances, and daily limits", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken);
    const invalid = await app.inject({
      method: "POST",
      url: "/v1/wallet/withdrawals/quote",
      headers,
      payload: {
        asset: "USDC",
        network: "polygon",
        address: "not-an-address",
        amount: "10.00",
      },
    });
    expect(invalid.json().error.code).toBe("INVALID_WALLET_ADDRESS");
    const unsupported = await app.inject({
      method: "POST",
      url: "/v1/wallet/withdrawals/quote",
      headers,
      payload: { asset: "USDC", network: "solana", address, amount: "10.00" },
    });
    expect(unsupported.statusCode).toBe(422);
    const insufficient = await quoteWithdrawal(
      app,
      auth.accessToken,
      "1001.00",
    );
    expect(insufficient.json().error.code).toBe("INSUFFICIENT_WALLET_BALANCE");
    await app.inject({
      method: "PATCH",
      url: "/v1/wallet/settings",
      headers,
      payload: { withdrawalLimit: "40.00" },
    });
    const limited = await quoteWithdrawal(app, auth.accessToken, "50.00");
    expect(limited.json().error.code).toBe("DAILY_WITHDRAWAL_LIMIT_EXCEEDED");
  });

  it("quotes, creates idempotently, completes, and lists a withdrawal", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken),
      quote = await quoteWithdrawal(app, auth.accessToken);
    expect(quote.statusCode).toBe(200);
    expect(quote.json().data).toMatchObject({
      amount: "50.00",
      estimatedFee: "0.10",
      estimatedReceive: "49.90",
    });
    const create = () =>
      app.inject({
        method: "POST",
        url: "/v1/wallet/withdrawals",
        headers: { ...headers, "idempotency-key": "withdrawal-1" },
        payload: { quoteId: quote.json().data.quoteId },
      });
    const first = await create(),
      repeated = await create();
    expect(first.statusCode).toBe(201);
    expect(first.json().data.status).toBe("processing");
    expect(repeated.json().data.id).toBe(first.json().data.id);
    expect(
      balance((await app.inject({ url: "/v1/wallet", headers })).json().data),
    ).toBe("950.00");
    const completed = await app.inject({
      method: "POST",
      url: `/v1/dev/wallet/withdrawals/${first.json().data.id}/complete`,
      headers,
    });
    expect(completed.json().data.status).toBe("completed");
    expect(completed.json().data.transactionId).toMatch(/^sandbox_tx_/);
    expect(
      (await app.inject({ url: "/v1/wallet/withdrawals", headers })).json()
        .data,
    ).toHaveLength(1);
    expect(
      app.container.repository.walletLedger.filter(
        (entry) => entry.type === "sandbox_withdrawal",
      ),
    ).toHaveLength(1);
  });

  it("rejects cross-user withdrawal access", async () => {
    app = await testApp();
    const one = await login(app, "token-1"),
      two = await login(app, "token-2"),
      quote = await quoteWithdrawal(app, one.accessToken),
      created = await app.inject({
        method: "POST",
        url: "/v1/wallet/withdrawals",
        headers: {
          ...bearer(one.accessToken),
          "idempotency-key": "cross-user",
        },
        payload: { quoteId: quote.json().data.quoteId },
      });
    expect(
      (
        await app.inject({
          url: `/v1/wallet/withdrawals/${created.json().data.id}`,
          headers: bearer(two.accessToken),
        })
      ).statusCode,
    ).toBe(404);
  });

  it("restores the debited balance once when a provider reports withdrawal failure", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken),
      quote = await quoteWithdrawal(app, auth.accessToken),
      created = await app.inject({
        method: "POST",
        url: "/v1/wallet/withdrawals",
        headers: { ...headers, "idempotency-key": "failed-withdrawal" },
        payload: { quoteId: quote.json().data.quoteId },
      }),
      event = {
        providerEventId: "sandbox-withdrawal-failed",
        type: "withdrawal.failed",
        externalId: created.json().data.externalId,
      };
    const deliver = () =>
      app.inject({
        method: "POST",
        url: "/v1/webhooks/payments/sandbox",
        headers: { "x-sandbox-webhook": "true" },
        payload: event,
      });
    expect((await deliver()).statusCode).toBe(200);
    expect((await deliver()).json().data.duplicate).toBe(true);
    expect(
      balance((await app.inject({ url: "/v1/wallet", headers })).json().data),
    ).toBe("1000.00");
    expect(
      app.container.repository.walletLedger.filter(
        (entry) =>
          entry.type === "adjustment" &&
          entry.referenceId === created.json().data.id,
      ),
    ).toHaveLength(1);
    const notices = (
      await app.inject({ url: "/v1/notifications", headers })
    ).json().data;
    expect(notices.map((value: { title: string }) => value.title)).toContain(
      "Withdrawal failed",
    );
  });

  it("manages trusted addresses and enforces at least one enabled asset", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken);
    const trusted = await app.inject({
      method: "POST",
      url: "/v1/wallet/trusted-addresses",
      headers,
      payload: { label: "Cold", address, network: "base" },
    });
    expect(trusted.statusCode).toBe(201);
    expect(
      (
        await app.inject({ url: "/v1/wallet/trusted-addresses", headers })
      ).json().data,
    ).toHaveLength(1);
    const rejected = await app.inject({
      method: "PATCH",
      url: "/v1/wallet/settings",
      headers,
      payload: { supportedAssets: { USDC: false, USDT: false } },
    });
    expect(rejected.json().error.code).toBe("ONE_ASSET_REQUIRED");
    const settings = await app.inject({
      method: "PATCH",
      url: "/v1/wallet/settings",
      headers,
      payload: {
        hideBalances: true,
        defaultNetwork: "base",
        supportedAssets: { USDT: false },
      },
    });
    expect(settings.json().data).toMatchObject({
      hideBalances: true,
      defaultNetwork: "base",
      supportedAssets: { USDC: true, USDT: false },
    });
    await app.inject({
      method: "DELETE",
      url: `/v1/wallet/trusted-addresses/${trusted.json().data.id}`,
      headers,
    });
    expect(
      app.container.repository.walletAuditEvents.map((event) => event.action),
    ).toEqual(
      expect.arrayContaining([
        "trusted_address_added",
        "wallet_setting_changed",
        "trusted_address_removed",
      ]),
    );
  });

  it("integrates prediction stakes, settlement, history, and notifications", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken),
      quote = await app.inject({
        method: "POST",
        url: "/v1/predictions/quote",
        headers,
        payload: {
          marketId: "bitcoin-2026",
          outcomeId: "up-85000",
          amount: "10.00",
        },
      }),
      placed = await app.inject({
        method: "POST",
        url: "/v1/predictions",
        headers: { ...headers, "idempotency-key": "wallet-prediction" },
        payload: { quoteId: quote.json().data.id },
      });
    expect(
      balance((await app.inject({ url: "/v1/wallet", headers })).json().data),
    ).toBe("990.00");
    app.container.services.predictions.resolveMarket(
      "bitcoin-2026",
      "up-85000",
    );
    expect(
      app.container.repository.walletLedger.map((entry) => entry.type),
    ).toEqual(
      expect.arrayContaining(["prediction_stake", "prediction_return"]),
    );
    const history = await app.inject({
      url: "/v1/wallet/history?type=prediction&asset=USDC",
      headers,
    });
    expect(history.json().data).toHaveLength(2);
    const notices = (
      await app.inject({ url: "/v1/notifications", headers })
    ).json().data;
    expect(notices.map((value: { title: string }) => value.title)).toEqual(
      expect.arrayContaining([
        "Prediction stake deducted",
        "Prediction settled",
      ]),
    );
    expect(placed.statusCode).toBe(201);
  });

  it("refunds an open prediction exactly once through the wallet ledger", async () => {
    app = await testApp();
    const auth = await login(app),
      headers = bearer(auth.accessToken),
      quote = await app.inject({
        method: "POST",
        url: "/v1/predictions/quote",
        headers,
        payload: {
          marketId: "bitcoin-2026",
          outcomeId: "up-85000",
          amount: "10.00",
        },
      }),
      placed = await app.inject({
        method: "POST",
        url: "/v1/predictions",
        headers: { ...headers, "idempotency-key": "refund-prediction" },
        payload: { quoteId: quote.json().data.id },
      });
    app.container.services.predictions.refund(placed.json().data.id);
    app.container.services.predictions.refund(placed.json().data.id);
    expect(
      balance((await app.inject({ url: "/v1/wallet", headers })).json().data),
    ).toBe("1000.00");
    expect(
      app.container.repository.walletLedger.filter(
        (entry) => entry.type === "prediction_refund",
      ),
    ).toHaveLength(1);
  });

  it("processes sandbox webhooks idempotently", async () => {
    app = await testApp();
    const auth = await login(app),
      created = await createDeposit(app, auth.accessToken),
      event = {
        providerEventId: "sandbox-event-1",
        type: "deposit.completed",
        externalId: created.json().data.externalId,
        amount: "25.00",
      };
    const deliver = () =>
      app.inject({
        method: "POST",
        url: "/v1/webhooks/payments/sandbox",
        headers: { "x-sandbox-webhook": "true" },
        payload: event,
      });
    expect((await deliver()).json().data.duplicate).toBe(false);
    expect((await deliver()).json().data.duplicate).toBe(true);
    expect(
      balance(
        (
          await app.inject({
            url: "/v1/wallet",
            headers: bearer(auth.accessToken),
          })
        ).json().data,
      ),
    ).toBe("1025.00");
  });

  it("does not register development simulators in production", async () => {
    app = await buildApp({
      config: loadConfig({
        NODE_ENV: "production",
        ACCESS_TOKEN_SECRET:
          "production-test-secret-that-is-at-least-32-characters",
        GOOGLE_WEB_CLIENT_ID: "test-web-client",
      }),
      overrides: { googleVerifier: new FakeGoogle() },
      logger: false,
    });
    const auth = await login(app),
      created = await createDeposit(app, auth.accessToken);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/dev/wallet/deposits/${created.json().data.id}/simulate`,
          headers: bearer(auth.accessToken),
          payload: { amount: "1.00" },
        })
      ).statusCode,
    ).toBe(404);
    const webhook = await app.inject({
      method: "POST",
      url: "/v1/webhooks/payments/sandbox",
      headers: { "x-sandbox-webhook": "true" },
      payload: {
        providerEventId: "event-production",
        type: "deposit.completed",
        externalId: created.json().data.externalId,
        amount: "1.00",
      },
    });
    expect(webhook.statusCode).toBe(403);
    expect(webhook.json().error.code).toBe("SANDBOX_WEBHOOK_DISABLED");
  });
});
