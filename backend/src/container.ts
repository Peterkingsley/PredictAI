import type { Config } from "./core/config.js";
import {
  GoogleTokenVerifier,
  DevelopmentGoogleVerifier,
  DeterministicAIProvider,
  InMemoryMediaProvider,
  BasicContentModerationProvider,
  ConsolePushProvider,
  DisabledExecutionProvider,
  DisabledCustodyProvider,
  FixtureMarketProvider,
  type GoogleIdentityVerifier,
} from "./core/providers.js";
import { MemoryRepository } from "./repositories/memory/memory.repository.js";
import { AuthService } from "./services/auth.service.js";
import { UserService } from "./services/user.service.js";
import { MarketService } from "./services/market.service.js";
import { PredictionService } from "./services/prediction.service.js";
import { IntelligenceService } from "./services/intelligence.service.js";
import { NotificationService } from "./services/notification.service.js";
import { SocialService } from "./services/social.service.js";
import { WalletService } from "./services/wallet.service.js";
import { AlertService } from "./services/alert.service.js";
import { SupportService } from "./services/support.service.js";
import { EventBus } from "./core/events.js";
import { InProcessScheduler } from "./workers/scheduler.js";
export interface ContainerOverrides {
  repository?: MemoryRepository;
  googleVerifier?: GoogleIdentityVerifier;
}
export function createContainer(
  config: Config,
  signAccess: (claims: { sub: string; sid: string }, ttl: number) => string,
  overrides: ContainerOverrides = {},
) {
  const repository = overrides.repository ?? new MemoryRepository();
  const googleVerifier =
    overrides.googleVerifier ??
    (config.NODE_ENV === "development"
      ? new DevelopmentGoogleVerifier()
      : new GoogleTokenVerifier({
          android: config.GOOGLE_ANDROID_CLIENT_ID,
          ios: config.GOOGLE_IOS_CLIENT_ID,
          web: config.GOOGLE_WEB_CLIENT_ID,
        }));
  const media = new InMemoryMediaProvider(),
    push = new ConsolePushProvider(),
    moderation = new BasicContentModerationProvider(),
    aiProvider = new DeterministicAIProvider(),
    marketProvider = new FixtureMarketProvider(),
    execution = new DisabledExecutionProvider(),
    custody = new DisabledCustodyProvider();
  const notifications = new NotificationService(repository, push),
    users = new UserService(repository, media),
    markets = new MarketService(repository),
    intelligence = new IntelligenceService(
      repository,
      markets,
      aiProvider,
      config,
    ),
    auth = new AuthService(repository, googleVerifier, config, signAccess),
    predictions = new PredictionService(
      repository,
      markets,
      users,
      config,
      notifications,
    ),
    social = new SocialService(
      repository,
      users,
      markets,
      intelligence,
      moderation,
    ),
    wallet = new WalletService(repository, users, custody),
    alerts = new AlertService(repository, markets, notifications),
    support = new SupportService(repository),
    events = new EventBus(),
    scheduler = new InProcessScheduler(
      alerts,
      notifications,
      repository,
      marketProvider,
    );
  return {
    config,
    repository,
    providers: {
      googleVerifier,
      media,
      push,
      moderation,
      aiProvider,
      marketProvider,
      execution,
      custody,
    },
    services: {
      auth,
      users,
      markets,
      predictions,
      intelligence,
      notifications,
      social,
      wallet,
      alerts,
      support,
    },
    events,
    scheduler,
  };
}
export type Container = ReturnType<typeof createContainer>;
