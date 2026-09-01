import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { parse, schema, userId, viewerId } from "./shared.js";
import { AppError } from "../core/errors.js";
const prefs = z.object({
  theme: z.enum(["dark", "light", "system"]).optional(),
  language: z.enum(["en", "fr"]).optional(),
  defaultCurrency: z.enum(["USD", "NGN", "USDC"]).optional(),
  dailyPaperLimit: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  notifications: z
    .object({
      market: z.boolean(),
      predictions: z.boolean(),
      social: z.boolean(),
      security: z.boolean(),
      wallet: z.boolean(),
      push: z.boolean(),
    })
    .partial()
    .optional(),
});
const privacy = z
  .object({
    publicProfile: z.boolean(),
    showPortfolioPerformance: z.boolean(),
    showTotalPortfolioValue: z.boolean(),
    showHoldings: z.boolean(),
    showPositionHistory: z.boolean(),
    showLikedPosts: z.boolean(),
    showFollowingList: z.boolean(),
    allowLeaderboards: z.boolean(),
    allowSearch: z.boolean(),
  })
  .partial();
export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/me",
    {
      preHandler: app.authenticate,
      schema: schema("Users", "Get the authenticated user."),
    },
    async (r) => ({ data: app.container.services.users.get(userId(r)) }),
  );
  app.patch(
    "/me",
    {
      preHandler: app.authenticate,
      schema: schema("Users", "Update display name and account fields."),
    },
    async (r) => ({
      data: app.container.services.users.patch(
        userId(r),
        parse(
          z.object({ displayName: z.string().min(1).max(80).optional() }),
          r.body,
        ),
      ),
    }),
  );
  app.delete(
    "/me",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Users",
        "Soft-delete the account and revoke all sessions.",
      ),
    },
    async (r) => {
      app.container.services.users.deleteAccount(userId(r));
      return { data: { deleted: true } };
    },
  );
  app.patch(
    "/me/profile",
    {
      preHandler: app.authenticate,
      schema: schema("Profiles", "Update normalized public profile fields."),
    },
    async (r) => ({
      data: app.container.services.users.patch(
        userId(r),
        parse(
          z.object({
            displayName: z.string().min(1).max(80).optional(),
            username: z.string().optional(),
            bio: z.string().max(160).optional(),
            specializations: z
              .array(z.string().min(1).max(40))
              .max(5)
              .optional(),
          }),
          r.body,
        ),
      ),
    }),
  );
  app.post(
    "/me/avatar",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Profiles",
        "Upload a validated JPEG, PNG, or WebP avatar.",
      ),
    },
    async (r) => {
      const file = await r.file();
      if (!file)
        throw new AppError("AVATAR_REQUIRED", "Avatar file is required", 422);
      const bytes = await file.toBuffer();
      return {
        data: {
          avatarUrl: await app.container.services.users.avatar(
            userId(r),
            bytes,
            file.mimetype,
            app.container.config.AVATAR_MAX_BYTES,
          ),
        },
      };
    },
  );
  app.delete(
    "/me/avatar",
    {
      preHandler: app.authenticate,
      schema: schema("Profiles", "Remove the current avatar."),
    },
    async (r) => {
      await app.container.services.users.deleteAvatar(userId(r));
      return { data: { deleted: true } };
    },
  );
  app.get(
    "/users/:id",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Profiles",
        "Get a privacy-filtered public profile.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.users.publicProfile(
        viewerId(r),
        parse(z.object({ id: z.string() }), r.params).id,
      ),
    }),
  );
  app.get(
    "/me/preferences",
    {
      preHandler: app.authenticate,
      schema: schema("Preferences", "Get account preferences."),
    },
    async (r) => ({ data: app.container.services.users.prefs(userId(r)) }),
  );
  app.patch(
    "/me/preferences",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Preferences",
        "Patch theme, language, currency, responsible-use limit, and notifications.",
      ),
    },
    async (r) => {
      const current = app.container.services.users.prefs(userId(r)),
        body = parse(prefs, r.body);
      Object.assign(current, body, {
        notifications: { ...current.notifications, ...body.notifications },
      });
      return { data: current };
    },
  );
  app.get(
    "/me/privacy",
    {
      preHandler: app.authenticate,
      schema: schema("Privacy", "Get social privacy settings."),
    },
    async (r) => ({ data: app.container.services.users.privacy(userId(r)) }),
  );
  app.patch(
    "/me/privacy",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Privacy",
        "Patch social privacy settings enforced by serializers.",
      ),
    },
    async (r) => {
      const current = app.container.services.users.privacy(userId(r));
      Object.assign(current, parse(privacy, r.body));
      return { data: current };
    },
  );
  app.get(
    "/users/me",
    {
      preHandler: app.authenticate,
      schema: schema("Users", "Canonical current-user contract."),
    },
    async (r) => ({ data: app.container.services.users.get(userId(r)) }),
  );
  app.patch(
    "/users/me",
    {
      preHandler: app.authenticate,
      schema: schema("Users", "Canonical current-user update contract."),
    },
    async (r) => ({
      data: app.container.services.users.patch(
        userId(r),
        parse(
          z.object({ displayName: z.string().min(1).max(80).optional() }),
          r.body,
        ),
      ),
    }),
  );
  app.delete(
    "/users/me",
    {
      preHandler: app.authenticate,
      schema: schema("Users", "Canonical account deletion contract."),
    },
    async (r) => {
      app.container.services.users.deleteAccount(userId(r));
      return { data: { deleted: true } };
    },
  );
  app.get(
    "/users/me/preferences",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Preferences",
        "Canonical current-user preferences contract.",
      ),
    },
    async (r) => ({ data: app.container.services.users.prefs(userId(r)) }),
  );
  app.patch(
    "/users/me/preferences",
    {
      preHandler: app.authenticate,
      schema: schema("Preferences", "Canonical preferences update contract."),
    },
    async (r) => {
      const current = app.container.services.users.prefs(userId(r)),
        body = parse(prefs, r.body);
      Object.assign(current, body, {
        notifications: { ...current.notifications, ...body.notifications },
      });
      return { data: current };
    },
  );
  app.get(
    "/profiles/:id",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Profiles",
        "Canonical privacy-filtered public profile contract.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.users.publicProfile(
        viewerId(r),
        parse(z.object({ id: z.string() }), r.params).id,
      ),
    }),
  );
  app.patch(
    "/profiles/me",
    {
      preHandler: app.authenticate,
      schema: schema("Profiles", "Canonical public profile update contract."),
    },
    async (r) => ({
      data: app.container.services.users.patch(
        userId(r),
        parse(
          z.object({
            displayName: z.string().min(1).max(80).optional(),
            username: z.string().optional(),
            bio: z.string().max(160).optional(),
            specializations: z.array(z.string()).max(5).optional(),
          }),
          r.body,
        ),
      ),
    }),
  );
  app.post(
    "/users/me/avatar",
    {
      preHandler: app.authenticate,
      schema: schema("Profiles", "Canonical avatar upload contract."),
    },
    async (r) => {
      const file = await r.file();
      if (!file)
        throw new AppError("AVATAR_REQUIRED", "Avatar file is required", 422);
      return {
        data: {
          avatarUrl: await app.container.services.users.avatar(
            userId(r),
            await file.toBuffer(),
            file.mimetype,
            app.container.config.AVATAR_MAX_BYTES,
          ),
        },
      };
    },
  );
  app.delete(
    "/users/me/avatar",
    {
      preHandler: app.authenticate,
      schema: schema("Profiles", "Canonical avatar removal contract."),
    },
    async (r) => {
      await app.container.services.users.deleteAvatar(userId(r));
      return { data: { deleted: true } };
    },
  );
  app.get(
    "/privacy/social",
    {
      preHandler: app.authenticate,
      schema: schema("Privacy", "Canonical social privacy contract."),
    },
    async (r) => ({ data: app.container.services.users.privacy(userId(r)) }),
  );
  app.put(
    "/privacy/social",
    {
      preHandler: app.authenticate,
      schema: schema("Privacy", "Replace canonical social privacy settings."),
    },
    async (r) => {
      const current = app.container.services.users.privacy(userId(r));
      Object.assign(current, parse(privacy, r.body));
      return { data: current };
    },
  );
};
