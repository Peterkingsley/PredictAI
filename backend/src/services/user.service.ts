import type {
  Preferences,
  Privacy,
  User,
  WalletSettings,
} from "../models/domain.js";
import type { Repository } from "../repositories/interfaces.js";
import type { MediaProvider } from "../core/providers.js";
import { AppError, notFound } from "../core/errors.js";
import { now } from "../core/utils.js";
export const defaultPreferences = (userId: string): Preferences => ({
  userId,
  theme: "dark",
  language: "en",
  defaultCurrency: "USD",
  dailyPaperLimit: "500.00",
  notifications: {
    market: true,
    predictions: true,
    social: true,
    security: true,
    wallet: true,
    push: true,
  },
});
export const defaultPrivacy = (userId: string): Privacy => ({
  userId,
  publicProfile: true,
  showPortfolioPerformance: true,
  showTotalPortfolioValue: false,
  showHoldings: true,
  showPositionHistory: true,
  showLikedPosts: true,
  showFollowingList: true,
  allowLeaderboards: true,
  allowSearch: true,
});
export const defaultWallet = (userId: string): WalletSettings => ({
  userId,
  requireBiometrics: true,
  withdrawalConfirmation: true,
  autoLock: "5 min",
  defaultNetwork: "Polygon",
  withdrawalLimit: "1000",
  feeSpeed: "Standard",
  transactionNotifications: true,
  currency: "USD",
  hideBalances: false,
  assetSort: "Balance",
  compactView: false,
  walletMode: "Prediction",
  supportedAssets: { USDC: true, USDT: true },
  connectedWallet: null,
});
export class UserService {
  constructor(
    private repo: Repository,
    private media: MediaProvider,
  ) {}
  get(id: string) {
    const u = this.repo.users.get(id);
    if (!u) throw notFound("User");
    return u;
  }
  prefs(id: string) {
    let v = this.repo.preferences.get(id);
    if (!v) {
      v = defaultPreferences(id);
      this.repo.preferences.set(id, v);
    }
    return v;
  }
  privacy(id: string) {
    let v = this.repo.privacy.get(id);
    if (!v) {
      v = defaultPrivacy(id);
      this.repo.privacy.set(id, v);
    }
    return v;
  }
  wallet(id: string) {
    let v = this.repo.walletSettings.get(id);
    if (!v) {
      v = defaultWallet(id);
      this.repo.walletSettings.set(id, v);
    }
    return v;
  }
  patch(
    id: string,
    input: Partial<
      Pick<User, "displayName" | "bio" | "specializations" | "username">
    >,
  ) {
    const u = this.get(id);
    if (input.displayName !== undefined) {
      input.displayName = input.displayName.trim();
      if (!input.displayName)
        throw new AppError(
          "INVALID_DISPLAY_NAME",
          "Display name is required",
          422,
        );
    }
    if (input.bio !== undefined) input.bio = input.bio.trim();
    if (input.specializations)
      input.specializations = [
        ...new Set(
          input.specializations.map((value) => value.trim()).filter(Boolean),
        ),
      ];
    if (input.username) {
      const username = input.username.trim().toLowerCase().replace(/^@/, "");
      if (!/^[a-z0-9_]{3,24}$/.test(username))
        throw new AppError(
          "INVALID_USERNAME",
          "Username must be 3-24 letters, numbers, or underscores",
          422,
        );
      if (
        [...this.repo.users.values()].some(
          (x) => x.id !== id && x.username === username,
        )
      )
        throw new AppError("USERNAME_TAKEN", "Username is already used", 409);
      input.username = username;
    }
    if (input.bio !== undefined && input.bio.length > 160)
      throw new AppError(
        "BIO_TOO_LONG",
        "Bio may not exceed 160 characters",
        422,
      );
    if (input.specializations && input.specializations.length > 5)
      throw new AppError(
        "TOO_MANY_SPECIALIZATIONS",
        "Choose at most five specializations",
        422,
      );
    Object.assign(u, input, { updatedAt: now() });
    return u;
  }
  publicProfile(viewerId: string | undefined, targetId: string) {
    const u = this.get(targetId),
      p = this.privacy(targetId);
    if (
      viewerId !== targetId &&
      (!p.publicProfile ||
        this.repo.social.blocks.has(`${targetId}:${viewerId}`) ||
        this.repo.social.blocks.has(`${viewerId}:${targetId}`))
    )
      throw notFound("Profile");
    return {
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      specializations: u.specializations,
    };
  }
  async avatar(id: string, bytes: Buffer, mime: string, max: number) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
      throw new AppError(
        "INVALID_MEDIA_TYPE",
        "Avatar must be JPEG, PNG, or WebP",
        415,
      );
    if (bytes.length > max)
      throw new AppError("MEDIA_TOO_LARGE", `Avatar exceeds ${max} bytes`, 413);
    const u = this.get(id);
    if (u.avatarUrl) await this.media.remove(u.avatarUrl);
    u.avatarUrl = await this.media.save({ bytes, mime, userId: id });
    u.updatedAt = now();
    return u.avatarUrl;
  }
  async deleteAvatar(id: string) {
    const u = this.get(id);
    if (u.avatarUrl) await this.media.remove(u.avatarUrl);
    delete u.avatarUrl;
    u.updatedAt = now();
  }
  deleteAccount(id: string) {
    const u = this.get(id);
    u.status = "deleted";
    u.updatedAt = now();
    for (const s of this.repo.sessions.values())
      if (s.userId === id) s.revokedAt = now();
  }
}
