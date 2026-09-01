import type { Platform, Session, User } from "../models/domain.js";
import type { Repository } from "../repositories/interfaces.js";
import type { GoogleIdentityVerifier } from "../core/providers.js";
import { AppError, notFound, unauthorized } from "../core/errors.js";
import { id, now, opaqueToken, tokenHash } from "../core/utils.js";
import type { Config } from "../core/config.js";
type SignAccess = (claims: { sub: string; sid: string }, ttl: number) => string;
export class AuthService {
  constructor(
    private repo: Repository,
    private google: GoogleIdentityVerifier,
    private config: Config,
    private signAccess: SignAccess,
  ) {}
  private issue(user: User, session: Session, refresh: string) {
    return {
      accessToken: this.signAccess(
        { sub: user.id, sid: session.id },
        this.config.ACCESS_TOKEN_TTL_SECONDS,
      ),
      refreshToken: refresh,
      expiresIn: this.config.ACCESS_TOKEN_TTL_SECONDS,
      tokenType: "Bearer",
      sessionId: session.id,
      user,
    };
  }
  async googleLogin(input: {
    idToken: string;
    platform: Platform;
    ip?: string;
    userAgent?: string;
  }) {
    const identity = await this.google.verify(input.idToken, input.platform);
    let user = [...this.repo.users.values()].find(
      (u) => u.googleSubject === identity.subject,
    );
    if (user?.status !== "active" && user)
      throw new AppError("ACCOUNT_UNAVAILABLE", "Account is not active", 403);
    if (!user) {
      const stamp = now();
      const base =
        identity.email
          .split("@")[0]!
          .replace(/[^a-z0-9_]/gi, "")
          .toLowerCase() || "predictor";
      let username = base;
      let n = 1;
      while ([...this.repo.users.values()].some((u) => u.username === username))
        username = `${base}${n++}`;
      user = {
        id: id("user"),
        googleSubject: identity.subject,
        email: identity.email.toLowerCase(),
        displayName: identity.displayName,
        username,
        bio: "",
        specializations: [],
        createdAt: stamp,
        updatedAt: stamp,
        status: "active",
      };
      this.repo.users.set(user.id, user);
    }
    const refresh = opaqueToken(),
      stamp = now();
    const session: Session = {
      id: id("session"),
      userId: user.id,
      platform: input.platform,
      refreshHash: tokenHash(refresh),
      familyId: id("family"),
      previousHashes: [],
      createdAt: stamp,
      lastSeenAt: stamp,
      expiresAt: new Date(
        Date.now() + this.config.REFRESH_TOKEN_TTL_SECONDS * 1000,
      ).toISOString(),
      ip: input.ip,
      userAgent: input.userAgent,
    };
    this.repo.sessions.set(session.id, session);
    return this.issue(user, session, refresh);
  }
  refresh(refreshToken: string) {
    const hash = tokenHash(refreshToken);
    const reused = [...this.repo.sessions.values()].find((s) =>
      s.previousHashes.includes(hash),
    );
    if (reused) {
      for (const s of this.repo.sessions.values())
        if (s.familyId === reused.familyId) s.revokedAt = now();
      throw unauthorized(
        "Refresh token reuse detected; session family revoked",
      );
    }
    const session = [...this.repo.sessions.values()].find(
      (s) => s.refreshHash === hash,
    );
    if (
      !session ||
      session.revokedAt ||
      Date.parse(session.expiresAt) <= Date.now()
    )
      throw unauthorized("Refresh token is invalid or expired");
    const user = this.repo.users.get(session.userId);
    if (!user || user.status !== "active")
      throw unauthorized("Account is unavailable");
    const next = opaqueToken();
    session.previousHashes.push(session.refreshHash);
    session.refreshHash = tokenHash(next);
    session.lastSeenAt = now();
    return this.issue(user, session, next);
  }
  logout(sessionId: string) {
    const s = this.repo.sessions.get(sessionId);
    if (s) s.revokedAt = now();
  }
  logoutAll(userId: string) {
    for (const s of this.repo.sessions.values())
      if (s.userId === userId) s.revokedAt = now();
  }
  list(userId: string) {
    return [...this.repo.sessions.values()]
      .filter((s) => s.userId === userId && !s.revokedAt)
      .map(({ refreshHash, previousHashes, ...safe }) => safe);
  }
  revoke(userId: string, sessionId: string) {
    const s = this.repo.sessions.get(sessionId);
    if (!s || s.userId !== userId) throw notFound("Session");
    s.revokedAt = now();
  }
  authenticate(userId: string, sessionId: string) {
    const u = this.repo.users.get(userId),
      s = this.repo.sessions.get(sessionId);
    if (!u || u.status !== "active" || !s || s.userId !== userId || s.revokedAt)
      throw unauthorized();
    return u;
  }
}
