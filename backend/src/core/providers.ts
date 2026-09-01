import { OAuth2Client } from "google-auth-library";
import type { AIAnalysis, Market, Platform } from "../models/domain.js";
import { marketFixtures } from "../fixtures/markets.js";
import { AppError, ProviderDisabledError } from "./errors.js";
import { id, now } from "./utils.js";

export interface VerifiedGoogleIdentity {
  subject: string;
  email: string;
  displayName: string;
}
export interface GoogleIdentityVerifier {
  verify(idToken: string, platform: Platform): Promise<VerifiedGoogleIdentity>;
}
export class GoogleTokenVerifier implements GoogleIdentityVerifier {
  constructor(private audiences: Record<Platform, string>) {}
  async verify(idToken: string, platform: Platform) {
    try {
      const audience = this.audiences[platform];
      if (!audience)
        throw new AppError(
          "AUTH_PLATFORM_NOT_CONFIGURED",
          `Google authentication is not configured for ${platform}`,
          503,
        );
      const ticket = await new OAuth2Client().verifyIdToken({
        idToken,
        audience,
      });
      const p = ticket.getPayload();
      if (
        !p?.sub ||
        !p.email ||
        !p.email_verified ||
        !["accounts.google.com", "https://accounts.google.com"].includes(
          p.iss,
        ) ||
        !p.exp ||
        p.exp * 1000 < Date.now()
      )
        throw new AppError(
          "INVALID_GOOGLE_TOKEN",
          "Google identity token is invalid",
          401,
        );
      return {
        subject: p.sub,
        email: p.email,
        displayName: p.name ?? p.email.split("@")[0]!,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "INVALID_GOOGLE_TOKEN",
        "Google identity token is invalid",
        401,
      );
    }
  }
}
export class DevelopmentGoogleVerifier implements GoogleIdentityVerifier {
  async verify(token: string) {
    if (!token.startsWith("dev:"))
      throw new AppError(
        "INVALID_GOOGLE_TOKEN",
        "Use a configured Google token (development accepts dev:email:subject:name)",
        401,
      );
    const [, email, subject, name] = token.split(":");
    if (!email || !subject)
      throw new AppError(
        "INVALID_GOOGLE_TOKEN",
        "Malformed development identity token",
        401,
      );
    return { email, subject, displayName: name || email.split("@")[0]! };
  }
}
export interface AIProvider {
  analyze(
    market: Market,
    outcomeId: string,
  ): Promise<Omit<AIAnalysis, "id" | "generatedAt">>;
}
export class DeterministicAIProvider implements AIProvider {
  async analyze(
    m: Market,
    outcomeId: string,
  ): Promise<Omit<AIAnalysis, "id" | "generatedAt">> {
    const o = m.outcomes.find((x) => x.id === outcomeId);
    if (!o) throw new AppError("OUTCOME_NOT_FOUND", "Outcome not found", 404);
    const drift = [-350, 250, 600][
      [...m.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 3
    ]!;
    const probabilityBps = Math.max(
      500,
      Math.min(9500, o.probabilityBps + drift),
    );
    const edgeBps = probabilityBps - o.probabilityBps;
    return {
      marketId: m.id,
      outcomeId,
      revision: m.revision,
      probabilityBps,
      marketProbabilityBps: o.probabilityBps,
      edgeBps,
      verdict:
        edgeBps > 200 ? "lean_yes" : edgeBps < -200 ? "lean_no" : "neutral",
      confidence:
        Math.abs(edgeBps) > 500
          ? "high"
          : Math.abs(edgeBps) > 200
            ? "medium"
            : "low",
      summary:
        "Fixture-backed market structure and current probability were compared by the deterministic development provider.",
      signals: [
        {
          name: "Market consensus",
          score: o.probabilityBps / 100,
          explanation: "Uses the current normalized market probability.",
        },
        {
          name: "Fixture momentum",
          score: probabilityBps / 100,
          explanation:
            "Uses deterministic fixture revision signals for development.",
        },
      ],
      risks: [
        "Market fixtures are not live data.",
        "Outcome conditions may change before resolution.",
      ],
      sources: [
        {
          label: "PredictAI normalized market fixture",
          kind: "market_fixture",
        },
      ],
    };
  }
}
export interface MediaProvider {
  save(input: { bytes: Buffer; mime: string; userId: string }): Promise<string>;
  remove(url: string): Promise<void>;
  read?(url: string): Promise<{ bytes: Buffer; mime: string } | undefined>;
}
export class InMemoryMediaProvider implements MediaProvider {
  objects = new Map<string, { bytes: Buffer; mime: string }>();
  async save(i: { bytes: Buffer; mime: string; userId: string }) {
    const key = `/v1/media/${id("media")}`;
    this.objects.set(key, { bytes: i.bytes, mime: i.mime });
    return key;
  }
  async remove(url: string) {
    this.objects.delete(url);
  }
  async read(url: string) {
    return this.objects.get(url);
  }
}
export interface ContentModerationProvider {
  assertAllowed(content: string): Promise<void>;
}
export class BasicContentModerationProvider implements ContentModerationProvider {
  async assertAllowed(content: string) {
    if (/\b(seed phrase|private key)\b/i.test(content))
      throw new AppError(
        "CONTENT_REJECTED",
        "Sensitive wallet credentials must not be posted",
        422,
      );
  }
}
export interface PushProvider {
  send(
    deviceToken: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<void>;
}
export class ConsolePushProvider implements PushProvider {
  async send(_token: string, _payload: { title: string; body: string }) {}
}
export class ExpoPushProvider implements PushProvider {
  constructor(
    private sender: (
      token: string,
      payload: { title: string; body: string; data?: Record<string, string> },
    ) => Promise<void>,
  ) {}
  send(
    token: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ) {
    return this.sender(token, payload);
  }
}
export class WebPushProvider implements PushProvider {
  constructor(
    private sender: (
      token: string,
      payload: { title: string; body: string; data?: Record<string, string> },
    ) => Promise<void>,
  ) {}
  send(
    token: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ) {
    return this.sender(token, payload);
  }
}
export class CompositePushProvider implements PushProvider {
  constructor(private providers: PushProvider[]) {}
  async send(
    token: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ) {
    await Promise.all(this.providers.map((p) => p.send(token, payload)));
  }
}
export interface MarketProvider {
  sync(): Promise<Market[]>;
}
export class FixtureMarketProvider implements MarketProvider {
  async sync() {
    return structuredClone(marketFixtures);
  }
}
export interface ExecutionProvider {
  execute(): Promise<never>;
}
export class DisabledExecutionProvider implements ExecutionProvider {
  async execute(): Promise<never> {
    throw new ProviderDisabledError("Real-money execution");
  }
}
export interface CustodyProvider {
  depositAddress(): Promise<never>;
  withdraw(): Promise<never>;
  connect(): Promise<never>;
}
export class DisabledCustodyProvider implements CustodyProvider {
  async depositAddress(): Promise<never> {
    throw new ProviderDisabledError("Custody");
  }
  async withdraw(): Promise<never> {
    throw new ProviderDisabledError("Custody");
  }
  async connect(): Promise<never> {
    throw new ProviderDisabledError("External wallet connections");
  }
}
export const analysisId = () => id("analysis");
export const generatedAt = now;
