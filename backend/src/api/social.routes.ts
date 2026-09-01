import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pageQuery, parse, schema, userId, viewerId } from "./shared.js";
const postDraft = z.object({
  type: z.enum([
    "insight",
    "market",
    "position",
    "portfolio",
    "ai_analysis",
    "quote",
  ]),
  content: z.string().max(500).default(""),
  marketId: z.string().optional(),
  positionId: z.string().optional(),
  portfolioTimeframe: z.enum(["24H", "7D", "30D", "ALL"]).optional(),
  portfolioPositionIds: z.array(z.string()).max(20).optional(),
  aiAnalysisId: z.string().optional(),
  quotePostId: z.string().optional(),
});
const idParam = z.object({ id: z.string() });
const targetParam = z.object({ id: z.string() });
export const socialRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/posts/feed",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Posts",
        "Get for-you, following, or trending posts with privacy enforcement.",
        false,
      ),
    },
    async (r) => {
      const q = parse(
        pageQuery.extend({
          type: z.enum(["for_you", "following", "trending"]).default("for_you"),
        }),
        r.query,
      );
      return app.container.services.social.feed(
        viewerId(r),
        q.type,
        q.cursor,
        q.limit,
      );
    },
  );
  app.post(
    "/posts",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Posts",
        "Create a moderated post with one server-validated attachment.",
      ),
    },
    async (r, reply) =>
      reply.code(201).send({
        data: await app.container.services.social.create(
          userId(r),
          parse(postDraft, r.body),
        ),
      }),
  );
  app.get(
    "/posts/saved",
    {
      preHandler: app.authenticate,
      schema: schema("Posts", "List saved visible posts."),
    },
    async (r) => ({ data: app.container.services.social.saved(userId(r)) }),
  );
  app.get(
    "/posts/:id",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema("Posts", "Get one visible post.", false),
    },
    async (r) => ({
      data: app.container.services.social.get(
        viewerId(r),
        parse(idParam, r.params).id,
      ),
    }),
  );
  app.patch(
    "/posts/:id",
    {
      preHandler: app.authenticate,
      schema: schema("Posts", "Edit owned post content."),
    },
    async (r) => ({
      data: await app.container.services.social.edit(
        userId(r),
        parse(idParam, r.params).id,
        parse(z.object({ content: z.string().min(1).max(500) }), r.body)
          .content,
      ),
    }),
  );
  app.delete(
    "/posts/:id",
    {
      preHandler: app.authenticate,
      schema: schema("Posts", "Soft-delete an owned post."),
    },
    async (r) => {
      app.container.services.social.delete(
        userId(r),
        parse(idParam, r.params).id,
      );
      return { data: { deleted: true } };
    },
  );
  for (const [path, kind] of [
    ["like", "likes"],
    ["save", "saves"],
    ["repost", "reposts"],
  ] as const) {
    app.put(
      `/posts/:id/${path}`,
      {
        preHandler: app.authenticate,
        schema: schema("Posts", `Idempotently ${path} a post.`),
      },
      async (r) => ({
        data: app.container.services.social.edge(
          kind,
          userId(r),
          parse(idParam, r.params).id,
          true,
        ),
      }),
    );
    app.delete(
      `/posts/:id/${path}`,
      {
        preHandler: app.authenticate,
        schema: schema("Posts", `Idempotently remove a post ${path}.`),
      },
      async (r) => ({
        data: app.container.services.social.edge(
          kind,
          userId(r),
          parse(idParam, r.params).id,
          false,
        ),
      }),
    );
  }
  app.get(
    "/posts/:id/replies",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Posts",
        "List visible replies with cursor pagination.",
        false,
      ),
    },
    async (r) => {
      const q = parse(pageQuery, r.query);
      return app.container.services.social.replies(
        viewerId(r),
        parse(idParam, r.params).id,
        q.cursor,
        q.limit,
      );
    },
  );
  app.post(
    "/posts/:id/replies",
    {
      preHandler: app.authenticate,
      schema: schema("Posts", "Create a moderated reply."),
    },
    async (r) => ({
      data: await app.container.services.social.reply(
        userId(r),
        parse(idParam, r.params).id,
        parse(
          z.object({ content: z.string(), replyingTo: z.string().optional() }),
          r.body,
        ).content,
        parse(z.object({ replyingTo: z.string().optional() }), r.body)
          .replyingTo,
      ),
    }),
  );
  app.put(
    "/replies/:id/like",
    {
      preHandler: app.authenticate,
      schema: schema("Posts", "Idempotently like a reply."),
    },
    async (r) => {
      app.container.services.social.replyLike(
        userId(r),
        parse(idParam, r.params).id,
        true,
      );
      return { data: { liked: true } };
    },
  );
  app.delete(
    "/replies/:id/like",
    {
      preHandler: app.authenticate,
      schema: schema("Posts", "Remove a reply like."),
    },
    async (r) => {
      app.container.services.social.replyLike(
        userId(r),
        parse(idParam, r.params).id,
        false,
      );
      return { data: { liked: false } };
    },
  );
  app.put(
    "/users/:id/follow",
    {
      preHandler: app.authenticate,
      schema: schema("Social", "Follow a public user."),
    },
    async (r) => {
      app.container.services.social.follow(
        userId(r),
        parse(targetParam, r.params).id,
        true,
      );
      return { data: { following: true } };
    },
  );
  app.delete(
    "/users/:id/follow",
    {
      preHandler: app.authenticate,
      schema: schema("Social", "Unfollow a user."),
    },
    async (r) => {
      app.container.services.social.follow(
        userId(r),
        parse(targetParam, r.params).id,
        false,
      );
      return { data: { following: false } };
    },
  );
  app.get(
    "/users/:id/followers",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Social",
        "List followers if permitted by privacy.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.social.followers(
        viewerId(r),
        parse(targetParam, r.params).id,
      ),
    }),
  );
  app.get(
    "/users/:id/following",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Social",
        "List followed users if permitted by privacy.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.social.following(
        viewerId(r),
        parse(targetParam, r.params).id,
      ),
    }),
  );
  app.get(
    "/users/:id/posts",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema("Social", "List privacy-filtered posts by user.", false),
    },
    async (r) => ({
      data: app.container.services.social.userPosts(
        viewerId(r),
        parse(targetParam, r.params).id,
      ),
    }),
  );
  app.get(
    "/users/:id/portfolio",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Social",
        "Get a sanitized public portfolio without private wallet value.",
        false,
      ),
    },
    async (r) => {
      const target = parse(targetParam, r.params).id,
        p = app.container.services.users.privacy(target);
      app.container.services.users.publicProfile(viewerId(r), target);
      return {
        data: {
          userId: target,
          performance: p.showPortfolioPerformance
            ? app.container.services.social
                .leaderboard(viewerId(r), "performance")
                .find((x) => x.id === target)?.value
            : undefined,
          positions: p.showHoldings
            ? [...app.container.repository.positions.values()]
                .filter((x) => x.userId === target)
                .map(({ userId, ...safe }) => safe)
            : [],
        },
      };
    },
  );
  app.get(
    "/users/:id/positions",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Social",
        "Get sanitized public position history when enabled.",
        false,
      ),
    },
    async (r) => {
      const target = parse(targetParam, r.params).id,
        p = app.container.services.users.privacy(target);
      app.container.services.users.publicProfile(viewerId(r), target);
      return {
        data: p.showPositionHistory
          ? [...app.container.repository.positions.values()]
              .filter((x) => x.userId === target)
              .map(({ userId, ...safe }) => safe)
          : [],
      };
    },
  );
  app.get(
    "/social/search",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Social",
        "Search allowed users, posts, and markets.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.social.search(
        viewerId(r),
        parse(z.object({ q: z.string().min(1) }), r.query).q,
      ),
    }),
  );
  app.get(
    "/leaderboard",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Social",
        "Get service-computed public performance rankings.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.social.leaderboard(
        viewerId(r),
        parse(
          z.object({
            metric: z
              .enum(["accuracy", "performance", "consistency", "contrarian"])
              .default("accuracy"),
          }),
          r.query,
        ).metric,
      ),
    }),
  );
  for (const action of ["mute", "block"] as const) {
    app.put(
      `/users/:id/${action}`,
      {
        preHandler: app.authenticate,
        schema: schema(
          "Safety",
          `${action} a user and enforce visibility effects.`,
        ),
      },
      async (r) => {
        app.container.services.social[action](
          userId(r),
          parse(targetParam, r.params).id,
          true,
        );
        return { data: { [`${action}d`]: true } };
      },
    );
    app.delete(
      `/users/:id/${action}`,
      {
        preHandler: app.authenticate,
        schema: schema("Safety", `Remove a user ${action}.`),
      },
      async (r) => {
        app.container.services.social[action](
          userId(r),
          parse(targetParam, r.params).id,
          false,
        );
        return { data: { [`${action}d`]: false } };
      },
    );
  }
  app.post(
    "/reports",
    {
      preHandler: app.authenticate,
      schema: schema("Safety", "Report a post or user for review."),
    },
    async (r) => {
      const b = parse(
        z.object({
          targetType: z.enum(["post", "user"]),
          targetId: z.string(),
          reason: z.string().min(3).max(500),
        }),
        r.body,
      );
      return {
        data: app.container.services.social.report(
          userId(r),
          b.targetType,
          b.targetId,
          b.reason,
        ),
      };
    },
  );
  app.put(
    "/profiles/:id/follow",
    {
      preHandler: app.authenticate,
      schema: schema("Social", "Canonical follow contract."),
    },
    async (r) => {
      app.container.services.social.follow(
        userId(r),
        parse(targetParam, r.params).id,
        true,
      );
      return { data: { following: true } };
    },
  );
  app.delete(
    "/profiles/:id/follow",
    {
      preHandler: app.authenticate,
      schema: schema("Social", "Canonical unfollow contract."),
    },
    async (r) => {
      app.container.services.social.follow(
        userId(r),
        parse(targetParam, r.params).id,
        false,
      );
      return { data: { following: false } };
    },
  );
  app.get(
    "/profiles/:id/followers",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Social",
        "Canonical privacy-filtered follower list.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.social.followers(
        viewerId(r),
        parse(targetParam, r.params).id,
      ),
    }),
  );
  app.get(
    "/profiles/:id/following",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Social",
        "Canonical privacy-filtered following list.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.social.following(
        viewerId(r),
        parse(targetParam, r.params).id,
      ),
    }),
  );
  app.get(
    "/social/leaderboard",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema("Social", "Canonical server-computed leaderboard.", false),
    },
    async (r) => ({
      data: app.container.services.social.leaderboard(
        viewerId(r),
        parse(
          z.object({
            metric: z
              .enum(["accuracy", "performance", "consistency", "contrarian"])
              .default("accuracy"),
          }),
          r.query,
        ).metric,
      ),
    }),
  );
  for (const action of ["mute", "block"] as const) {
    app.put(
      `/profiles/:id/${action}`,
      {
        preHandler: app.authenticate,
        schema: schema("Safety", `Canonical ${action} contract.`),
      },
      async (r) => {
        app.container.services.social[action](
          userId(r),
          parse(targetParam, r.params).id,
          true,
        );
        return { data: { [`${action}d`]: true } };
      },
    );
    app.delete(
      `/profiles/:id/${action}`,
      {
        preHandler: app.authenticate,
        schema: schema("Safety", `Canonical remove ${action} contract.`),
      },
      async (r) => {
        app.container.services.social[action](
          userId(r),
          parse(targetParam, r.params).id,
          false,
        );
        return { data: { [`${action}d`]: false } };
      },
    );
  }
  app.post(
    "/posts/:id/report",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Safety",
        "Report a post through the canonical target route.",
      ),
    },
    async (r) => ({
      data: app.container.services.social.report(
        userId(r),
        "post",
        parse(idParam, r.params).id,
        parse(z.object({ reason: z.string().min(3).max(500) }), r.body).reason,
      ),
    }),
  );
  app.post(
    "/profiles/:id/report",
    {
      preHandler: app.authenticate,
      schema: schema(
        "Safety",
        "Report a user through the canonical target route.",
      ),
    },
    async (r) => ({
      data: app.container.services.social.report(
        userId(r),
        "user",
        parse(targetParam, r.params).id,
        parse(z.object({ reason: z.string().min(3).max(500) }), r.body).reason,
      ),
    }),
  );
  app.get(
    "/profiles/:id/portfolio",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema("Social", "Canonical sanitized public portfolio.", false),
    },
    async (r) => {
      const target = parse(targetParam, r.params).id,
        p = app.container.services.users.privacy(target);
      app.container.services.users.publicProfile(viewerId(r), target);
      return {
        data: {
          userId: target,
          performance: p.showPortfolioPerformance
            ? app.container.services.social
                .leaderboard(viewerId(r), "performance")
                .find((x) => x.id === target)?.value
            : undefined,
          positions: p.showHoldings
            ? [...app.container.repository.positions.values()]
                .filter((x) => x.userId === target)
                .map(({ userId, ...safe }) => safe)
            : [],
        },
      };
    },
  );
  app.get(
    "/profiles/:id/positions",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema("Social", "Canonical sanitized public positions.", false),
    },
    async (r) => {
      const target = parse(targetParam, r.params).id,
        p = app.container.services.users.privacy(target);
      app.container.services.users.publicProfile(viewerId(r), target);
      return {
        data: p.showPositionHistory
          ? [...app.container.repository.positions.values()]
              .filter((x) => x.userId === target)
              .map(({ userId, ...safe }) => safe)
          : [],
      };
    },
  );
  app.get(
    "/profiles/:id/posts",
    {
      preHandler: app.optionalAuthenticate,
      schema: schema(
        "Social",
        "Canonical privacy-filtered profile posts.",
        false,
      ),
    },
    async (r) => ({
      data: app.container.services.social.userPosts(
        viewerId(r),
        parse(targetParam, r.params).id,
      ),
    }),
  );
};
