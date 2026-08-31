import {
  BarChart3,
  Bookmark,
  ChevronLeft,
  Image,
  ListFilter,
  Medal,
  MessageCircle,
  PieChart,
  Plus,
  Search,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { PostCard, SuggestedUsers } from "../components/posts";
import { Avatar, Button, Empty, PageHeader, Toggle } from "../components/ui";
import { markets } from "../services/data";
import { useApp } from "../store/AppStore";
import type { FeedKind, Position, PrivacySettings } from "../types";

export function PostsFeedPage() {
  const { posts, users } = useApp();
  const [feed, setFeed] = useState<FeedKind>("for_you");
  const visible = useMemo(() => {
    if (feed === "following")
      return posts.filter(
        (p) =>
          users.find((u) => u.id === p.authorId)?.isFollowing ||
          p.authorId === "current",
      );
    if (feed === "trending")
      return [...posts].sort(
        (a, b) =>
          b.likes +
          b.replies * 2 +
          b.reposts * 3 -
          (a.likes + a.replies * 2 + a.reposts * 3),
      );
    return posts;
  }, [feed, posts, users]);
  return (
    <div className="page posts-page">
      <PageHeader
        title="Posts"
        description="Follow transparent thinking, positions, and prediction performance."
        action={
          <Link className="button button--primary" to="/app/posts/new">
            <Plus /> Create post
          </Link>
        }
      />
      <div className="posts-toolbar">
        <div className="tabs">
          {(
            [
              ["for_you", "For you"],
              ["following", "Following"],
              ["trending", "Trending"],
            ] as const
          ).map(([key, label]) => (
            <button
              className={feed === key ? "active" : ""}
              onClick={() => setFeed(key)}
              key={key}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="toolbar-links">
          <Link to="/app/posts/search">
            <Search /> Search
          </Link>
          <Link to="/app/posts/leaderboard">
            <Trophy /> Leaderboard
          </Link>
          <Link to="/app/posts/saved">
            <Bookmark /> Saved
          </Link>
        </div>
      </div>
      <div className="social-layout">
        <section className="feed-list">
          {visible.map((p) => (
            <PostCard post={p} key={p.id} />
          ))}
        </section>
        <aside>
          <SuggestedUsers />
          <div className="content-card principles">
            <Sparkles />
            <h3>Think in public</h3>
            <p>
              Share the thesis before the outcome. Wins and losses both build
              credibility.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function ComposerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { createPost, toast } = useApp();
  const marketId = params.get("market") || undefined;
  const hasAI = params.get("ai") === "1";
  const quote = params.get("quote") || undefined;
  const initialAttachment = hasAI
    ? "ai"
    : params.get("portfolio") === "1"
      ? "portfolio"
      : params.get("position") === "1"
        ? "position"
        : marketId
          ? "market"
          : "none";
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<
    "none" | "market" | "position" | "portfolio" | "ai"
  >(initialAttachment);
  const [selectedMarket, setSelectedMarket] = useState(
    marketId || markets[0]!.id,
  );
  const position: Position = {
    symbol: "BTC",
    name: "Bitcoin",
    entry: 74920,
    current: 84520,
    performance: 12.81,
    allocation: 46,
  };
  const submit = () => {
    if (!content.trim() && attachment === "none") return;
    const market = markets.find((m) => m.id === selectedMarket)!;
    const id = createPost({
      content,
      marketId:
        attachment === "market" || attachment === "ai"
          ? selectedMarket
          : undefined,
      position: attachment === "position" ? position : undefined,
      portfolio:
        attachment === "portfolio"
          ? [
              position,
              {
                symbol: "ETH",
                name: "Ethereum",
                entry: 2770,
                current: 2569,
                performance: -7.26,
                allocation: 24,
              },
            ]
          : undefined,
      ai:
        attachment === "ai"
          ? {
              probability: Math.min(
                99,
                (market.outcomes[0]?.probability || 50) + 6,
              ),
              marketProbability: market.outcomes[0]?.probability || 50,
              edge: 6,
              confidence: "Medium",
              summary:
                "Signals are constructive while macro conditions and liquidity limit conviction.",
            }
          : undefined,
      quotePostId: quote,
    });
    toast("Post published", "success");
    navigate(`/app/posts/${id}`);
  };
  return (
    <div className="page narrow-page">
      <div className="detail-toolbar">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft /> Cancel
        </Button>
        <Button
          disabled={!content.trim() && attachment === "none"}
          onClick={submit}
        >
          Publish
        </Button>
      </div>
      <PageHeader
        eyebrow="New post"
        title="Share your thinking"
        description="Be specific, transparent, and useful to other traders."
      />
      <section className="composer-card">
        <textarea
          autoFocus
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          placeholder="What’s your view—and what could prove it wrong?"
        />
        <div className="character-count">{content.length}/500</div>
        <div className="attachment-tools">
          <button
            className={attachment === "market" ? "active" : ""}
            onClick={() => setAttachment("market")}
          >
            <BarChart3 /> Market
          </button>
          <button
            className={attachment === "position" ? "active" : ""}
            onClick={() => setAttachment("position")}
          >
            <ListFilter /> Position
          </button>
          <button
            className={attachment === "portfolio" ? "active" : ""}
            onClick={() => setAttachment("portfolio")}
          >
            <PieChart /> Portfolio
          </button>
          <button
            className={attachment === "ai" ? "active" : ""}
            onClick={() => setAttachment("ai")}
          >
            <Sparkles /> AI analysis
          </button>
          <button
            disabled
            title="Image attachments will be available with media storage"
          >
            <Image /> Image
          </button>
        </div>
        {(attachment === "market" || attachment === "ai") && (
          <label>
            Attached market
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
            >
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {attachment === "position" && (
          <div className="selected-attachment">
            <strong>BTC position</strong>
            <span className="positive">+12.81%</span>
            <small>
              Entry and current price will be public. Wallet value stays
              private.
            </small>
          </div>
        )}
        {attachment === "portfolio" && (
          <div className="selected-attachment">
            <strong>30D public portfolio snapshot</strong>
            <span className="positive">+4.80%</span>
            <small>
              Performance and selected positions only. Total value stays
              private.
            </small>
          </div>
        )}
      </section>
    </div>
  );
}

export function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { posts, users, updatePost } = useApp();
  const post = posts.find((p) => p.id === id);
  const [reply, setReply] = useState("");
  const [replies, setReplies] = useState([
    {
      id: "r1",
      authorId: "michael",
      text: "The liquidity caveat matters. I would lower confidence before lowering direction.",
      liked: false,
    },
    {
      id: "r2",
      authorId: "current",
      text: "Agreed — confidence and direction should be tracked separately.",
      liked: false,
    },
  ]);
  if (!post)
    return (
      <Empty
        icon={MessageCircle}
        title="Post not found"
        description="It may have been deleted or is no longer available."
      />
    );
  const send = () => {
    if (!reply.trim()) return;
    setReplies((v) => [
      ...v,
      { id: `r-${Date.now()}`, authorId: "current", text: reply.trim(), liked: false },
    ]);
    setReply("");
    updatePost(post.id, { replies: post.replies + 1 });
  };
  return (
    <div className="page narrow-page">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ChevronLeft /> Back
      </Button>
      <PostCard post={post} detail />
      <section className="reply-composer">
        <Avatar name="Peter Kingsley" />
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write a thoughtful reply…"
        />
        <Button disabled={!reply.trim()} onClick={send}>
          Reply
        </Button>
      </section>
      <section className="reply-list">
        <h2>Replies</h2>
        {replies.map((r) => {
          const u = users.find((x) => x.id === r.authorId)!;
          return (
            <article key={r.id}>
              <Avatar name={u.displayName} size="sm" />
              <div>
                <strong>
                  {u.displayName} <span>@{u.username}</span>
                </strong>
                <p>{r.text}</p>
                <button
                  className={r.liked ? "positive" : ""}
                  onClick={() =>
                    setReplies((current) =>
                      current.map((item) =>
                        item.id === r.id ? { ...item, liked: !item.liked } : item,
                      ),
                    )
                  }
                >
                  {r.liked ? "♥ Liked" : "♡ Like"}
                </button>
                <button onClick={() => setReply(`@${u.username} `)}>Reply</button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

export function SocialSearchPage() {
  const [params, setParams] = useSearchParams();
  const { posts, users, privacy } = useApp();
  const q = params.get("q") || "";
  const [tab, setTab] = useState("Top");
  const lower = q.toLowerCase();
  const people = q
    ? users.filter(
        (u) =>
          (!u.isCurrent || privacy.allowSearch) &&
          [u.displayName, u.username, u.bio, ...u.specialization]
            .join(" ")
            .toLowerCase()
            .includes(lower),
      )
    : [];
  const foundPosts = q
    ? posts.filter((p) => p.content.toLowerCase().includes(lower))
    : [];
  const foundMarkets = q
    ? markets.filter((m) => m.title.toLowerCase().includes(lower))
    : [];
  return (
    <div className="page">
      <PageHeader
        title="Search Posts"
        description="Find traders, ideas, and market conversations."
      />
      <div className="search-page-field">
        <Search />
        <input
          autoFocus
          value={q}
          onChange={(e) =>
            setParams(e.target.value ? { q: e.target.value } : {})
          }
          placeholder="Search people, posts, or markets"
        />
      </div>
      <div className="tabs">
        {["Top", "People", "Posts", "Markets"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {!q && (
        <Empty
          icon={Search}
          title="Search the community"
          description="Try a trader name, market, or thesis."
        />
      )}
      {q && (
        <div className="search-results">
          {(tab === "Top" || tab === "People") && people.length > 0 && (
            <section>
              <h2>People</h2>
              {people.map((u) => (
                <UserResult key={u.id} id={u.id} />
              ))}
            </section>
          )}
          {(tab === "Top" || tab === "Posts") &&
            foundPosts.map((p) => <PostCard key={p.id} post={p} />)}
          {(tab === "Top" || tab === "Markets") && foundMarkets.length > 0 && (
            <section>
              <h2>Markets</h2>
              {foundMarkets.map((m) => (
                <Link
                  className="market-result"
                  to={`/app/posts/market/${m.id}`}
                  key={m.id}
                >
                  <BarChart3 />
                  <span>
                    <strong>{m.title}</strong>
                    <small>{m.volume} volume</small>
                  </span>
                </Link>
              ))}
            </section>
          )}
          {people.length + foundPosts.length + foundMarkets.length === 0 && (
            <Empty
              icon={Search}
              title="No results"
              description="Try another search term."
            />
          )}
        </div>
      )}
    </div>
  );
}
function UserResult({ id }: { id: string }) {
  const { users, updateUser } = useApp();
  const u = users.find((x) => x.id === id)!;
  return (
    <div className="user-result">
      <Link to={`/app/posts/profile/${u.id}`}>
        <Avatar name={u.displayName} />
        <span>
          <strong>{u.displayName}</strong>
          <small>
            @{u.username} · {u.accuracy}% accuracy
          </small>
        </span>
      </Link>
      {!u.isCurrent && (
        <Button
          variant={u.isFollowing ? "secondary" : "primary"}
          onClick={() => updateUser(u.id, { isFollowing: !u.isFollowing })}
        >
          {u.isFollowing ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );
}

export function LeaderboardPage() {
  const { users, privacy } = useApp();
  const [type, setType] = useState<
    "accuracy" | "performance" | "consistency" | "contrarian"
  >("accuracy");
  const sorted = users
    .filter((user) => !user.isCurrent || privacy.allowLeaderboards)
    .sort((a, b) => b[type] - a[type]);
  return (
    <div className="page">
      <PageHeader
        eyebrow="Transparent performance"
        title="Leaderboard"
        description="Rankings use published prediction activity and respect profile privacy."
      />
      <div className="tabs">
        {(
          ["accuracy", "performance", "consistency", "contrarian"] as const
        ).map((t) => (
          <button
            className={type === t ? "active" : ""}
            onClick={() => setType(t)}
            key={t}
          >
            {t[0]?.toUpperCase()}
            {t.slice(1)}
          </button>
        ))}
      </div>
      <div className="leaderboard">
        <header>
          <span>Rank</span>
          <span>Trader</span>
          <span>Specialty</span>
          <span>{type}</span>
          <span>Action</span>
        </header>
        {sorted.map((u, i) => (
          <div key={u.id}>
            <b className="rank">{i < 3 ? <Medal /> : `#${i + 1}`}</b>
            <Link to={`/app/posts/profile/${u.id}`}>
              <Avatar name={u.displayName} size="sm" />
              <span>
                <strong>{u.displayName}</strong>
                <small>@{u.username}</small>
              </span>
            </Link>
            <span>{u.specialization.join(", ")}</span>
            <strong
              className={
                type === "performance"
                  ? u.performance >= 0
                    ? "positive"
                    : "negative"
                  : ""
              }
            >
              {u[type]}
              {type === "performance" || type === "accuracy" ? "%" : ""}
            </strong>
            <Link to={`/app/posts/profile/${u.id}`}>View profile</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SavedPostsPage() {
  const { posts } = useApp();
  const saved = posts.filter((p) => p.saved);
  return (
    <div className="page narrow-page">
      <PageHeader
        title="Saved posts"
        description="A private collection of ideas you want to revisit."
      />
      {saved.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {saved.length === 0 && (
        <Empty
          icon={Bookmark}
          title="No saved posts yet"
          description="Bookmark a useful post and it will appear here."
          action={
            <Link className="button button--primary" to="/app/posts">
              Browse Posts
            </Link>
          }
        />
      )}
    </div>
  );
}
export function MarketPostsPage() {
  const { id } = useParams();
  const market = markets.find((m) => m.id === id);
  const { posts } = useApp();
  const filtered = posts.filter((p) => p.marketId === id);
  if (!market)
    return (
      <Empty
        icon={BarChart3}
        title="Market not found"
        description="This discussion is unavailable."
      />
    );
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Market discussion"
        title={market.title}
        description={`${filtered.length} public posts · ${market.volume} volume`}
        action={
          <Link
            className="button button--primary"
            to={`/app/posts/new?market=${market.id}`}
          >
            Post your view
          </Link>
        }
      />
      <Link className="market-result featured" to={`/app/market/${market.id}`}>
        <BarChart3 />
        <span>
          <strong>Open prediction market</strong>
          <small>
            View probabilities, intelligence, rules, and place a prediction.
          </small>
        </span>
      </Link>
      {filtered.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {filtered.length === 0 && (
        <Empty
          icon={MessageCircle}
          title="Start the discussion"
          description="Be the first to publish a view on this market."
        />
      )}
    </div>
  );
}

export function TraderProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { users, posts, updateUser, profilePhoto } = useApp();
  const user = users.find((u) => u.id === id);
  if (!user)
    return (
      <Empty
        icon={UserRound}
        title="Trader not found"
        description="This profile is unavailable."
      />
    );
  const own = user.isCurrent;
  const userPosts = posts.filter((p) => p.authorId === user.id);
  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <div className="profile-cover" />
        <div className="profile-main">
          <Avatar
            name={user.displayName}
            src={own ? profilePhoto : null}
            size="lg"
          />
          <div className="profile-actions">
            {own ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => navigate("/app/posts/profile/edit")}
                >
                  Edit public profile
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/app/posts/privacy")}
                >
                  Privacy
                </Button>
              </>
            ) : (
              <Button
                variant={user.isFollowing ? "secondary" : "primary"}
                onClick={() =>
                  updateUser(user.id, {
                    isFollowing: !user.isFollowing,
                    followers: user.followers + (user.isFollowing ? -1 : 1),
                  })
                }
              >
                {user.isFollowing ? "Following" : "Follow"}
              </Button>
            )}
          </div>
          <h1>{user.displayName}</h1>
          <span>@{user.username}</span>
          <p>{user.bio}</p>
          <div className="specialties">
            {user.specialization.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <div className="follow-stats">
            <Link to={`/app/posts/profile/${user.id}/following`}>
              <b>{user.following}</b> Following
            </Link>
            <Link to={`/app/posts/profile/${user.id}/followers`}>
              <b>{user.followers.toLocaleString()}</b> Followers
            </Link>
          </div>
        </div>
      </section>
      <section className="performance-grid">
        <StatBlock label="Prediction accuracy" value={`${user.accuracy}%`} />
        <StatBlock
          label="30D performance"
          value={`${user.performance >= 0 ? "+" : ""}${user.performance}%`}
          tone={user.performance >= 0 ? "positive" : "negative"}
        />
        <StatBlock label="Consistency" value={`${user.consistency}`} />
        <StatBlock label="Contrarian score" value={`${user.contrarian}`} />
      </section>
      <div className="tabs">
        <button className="active">Posts</button>
        {user.portfolioPublic && (
          <button
            onClick={() => navigate(`/app/posts/profile/${user.id}/portfolio`)}
          >
            Portfolio
          </button>
        )}
      </div>
      <section className="feed-list profile-feed">
        {userPosts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </section>
    </div>
  );
}
function StatBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
      <small>Published activity</small>
    </div>
  );
}

export function FollowersPage({ mode }: { mode: "followers" | "following" }) {
  const { id } = useParams();
  const { users, privacy } = useApp();
  const current = users.find((u) => u.id === id);
  if (current?.isCurrent && mode === "following" && !privacy.showFollowingList)
    return (
      <div className="page">
        <Empty
          icon={Users}
          title="Following list is private"
          description="Your social privacy settings currently hide this list."
        />
      </div>
    );
  const list =
    mode === "following"
      ? users.filter((u) => u.isFollowing && !u.isCurrent)
      : users.filter((u) => !u.isCurrent).slice(0, 6);
  return (
    <div className="page narrow-page">
      <PageHeader
        title={`${current?.displayName || "Trader"}’s ${mode}`}
        description={`${list.length} visible accounts`}
      />
      {list.map((u) => (
        <UserResult key={u.id} id={u.id} />
      ))}
    </div>
  );
}
export function PublicPortfolioPage() {
  const { id } = useParams();
  const { users, privacy } = useApp();
  const user = users.find((u) => u.id === id);
  if (
    !user?.portfolioPublic ||
    (user.isCurrent && !privacy.showPortfolioPerformance)
  )
    return (
      <div className="page">
        <Empty
          icon={PieChart}
          title="Portfolio is private"
          description="This trader has not made portfolio performance public."
        />
      </div>
    );
  return (
    <div className="page">
      <PageHeader
        eyebrow="Public portfolio"
        title={`${user.displayName}’s performance`}
        description="Published performance data. Total account value is hidden."
      />
      <section className="portfolio-overview">
        <div>
          <span>30D performance</span>
          <strong className={user.performance >= 0 ? "positive" : "negative"}>
            {user.performance >= 0 ? "+" : ""}
            {user.performance}%
          </strong>
        </div>
        <div>
          <span>Win / loss</span>
          <strong>7 / 3</strong>
        </div>
        <div>
          <span>Best category</span>
          <strong>{user.specialization[0]}</strong>
        </div>
      </section>
      {(!user.isCurrent || privacy.showHoldings) && <section className="content-card">
        <h2>Public positions</h2>
        {["BTC · Bitcoin", "SOL · Solana", "ETH · Ethereum"].map((p, i) => (
          <div className="portfolio-position" key={p}>
            <strong>{p}</strong>
            <span>{[46, 21, 24][i]}% allocation</span>
            <b className={i === 2 ? "negative" : "positive"}>
              {i === 2 ? "-7.3%" : i === 1 ? "+26.1%" : "+12.8%"}
            </b>
          </div>
        ))}
      </section>}
    </div>
  );
}

export function EditPublicProfilePage() {
  const navigate = useNavigate();
  const { users, updateUser, toast } = useApp();
  const user = users.find((u) => u.isCurrent)!;
  const [name, setName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [specialties, setSpecialties] = useState(user.specialization);
  const save = () => {
    updateUser(user.id, {
      displayName: name,
      username,
      bio,
      specialization: specialties,
    });
    toast("Public profile updated", "success");
    navigate(`/app/posts/profile/${user.id}`);
  };
  return (
    <div className="page narrow-page">
      <PageHeader
        title="Edit public profile"
        description="This identity appears on your Posts and public performance."
      />
      <section className="form-card">
        <label>
          Display name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Username
          <div className="prefix-field">
            <span>@</span>
            <input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
              }
            />
          </div>
        </label>
        <label>
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={180}
          />
        </label>
        <fieldset>
          <legend>Specialties</legend>
          <div className="chip-row">
            {["Markets", "AI", "Crypto", "Sports", "Macro"].map((s) => (
              <button
                type="button"
                className={specialties.includes(s) ? "active" : ""}
                onClick={() =>
                  setSpecialties((v) =>
                    v.includes(s)
                      ? v.filter((x) => x !== s)
                      : [...v, s].slice(0, 3),
                  )
                }
                key={s}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        <Button onClick={save}>Save profile</Button>
      </section>
    </div>
  );
}

export function SocialPrivacyPage() {
  const { privacy, setPrivacy, toast } = useApp();
  const [next, setNext] = useState(privacy);
  const rows: [keyof PrivacySettings, string, string][] = [
    [
      "publicProfile",
      "Public profile",
      "Allow people to view your profile and Posts.",
    ],
    [
      "showPortfolioPerformance",
      "Portfolio performance",
      "Show percentage performance publicly.",
    ],
    [
      "showTotalPortfolioValue",
      "Total portfolio value",
      "Show your total account value.",
    ],
    ["showHoldings", "Holdings", "Show selected public positions."],
    ["showPositionHistory", "Position history", "Show prior shared positions."],
    ["showLikedPosts", "Liked posts", "Let visitors see posts you liked."],
    ["showFollowingList", "Following list", "Show who you follow."],
    [
      "allowLeaderboards",
      "Leaderboard eligibility",
      "Include your performance in rankings.",
    ],
    [
      "allowSearch",
      "Discoverable in search",
      "Allow people to find your profile.",
    ],
  ];
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Posts & community"
        title="Social privacy"
        description="You choose exactly what becomes public. Wallet balances remain private by default."
      />
      <section className="settings-card">
        {rows.map(([key, label, text]) => (
          <div className="setting-row" key={key}>
            <div>
              <strong>{label}</strong>
              <p>{text}</p>
            </div>
            <Toggle
              checked={next[key]}
              label={label}
              onChange={(value) => setNext({ ...next, [key]: value })}
            />
          </div>
        ))}
        <Button
          onClick={() => {
            setPrivacy(next);
            toast("Privacy preferences saved", "success");
          }}
        >
          Save privacy settings
        </Button>
      </section>
    </div>
  );
}

export function ShareBuilderPage({ kind }: { kind: "portfolio" | "position" }) {
  const navigate = useNavigate();
  const [showEntry, setShowEntry] = useState(true);
  const [showCurrent, setShowCurrent] = useState(true);
  const [showPerformance, setShowPerformance] = useState(true);
  const [showValue, setShowValue] = useState(false);
  const [showAllocation, setShowAllocation] = useState(false);
  const build = () =>
    navigate(
      `/app/posts/new?${kind === "portfolio" ? "portfolio=1" : "position=1"}`,
    );
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Public sharing"
        title={`Share a ${kind}`}
        description="Preview and control exactly which financial details become public."
      />
      <section className="content-card share-preview">
        <small>
          {kind === "portfolio"
            ? "30D public portfolio"
            : "BTC · Bitcoin position"}
        </small>
        <strong className="positive">
          +{kind === "portfolio" ? "4.80" : "12.81"}%
        </strong>
        <p>
          Total account balance stays private unless you explicitly enable it.
        </p>
      </section>
      <section className="settings-card">
        <div className="setting-row">
          <div>
            <strong>Performance</strong>
            <p>Show percentage performance.</p>
          </div>
          <Toggle
            checked={showPerformance}
            onChange={setShowPerformance}
            label="Performance"
          />
        </div>
        <div className="setting-row">
          <div>
            <strong>Entry price</strong>
            <p>Show your original entry price.</p>
          </div>
          <Toggle
            checked={showEntry}
            onChange={setShowEntry}
            label="Entry price"
          />
        </div>
        <div className="setting-row">
          <div>
            <strong>Current price</strong>
            <p>Show the current reference price.</p>
          </div>
          <Toggle
            checked={showCurrent}
            onChange={setShowCurrent}
            label="Current price"
          />
        </div>
        <div className="setting-row">
          <div>
            <strong>Position value</strong>
            <p>Reveal the monetary value of the position.</p>
          </div>
          <Toggle
            checked={showValue}
            onChange={setShowValue}
            label="Position value"
          />
        </div>
        {kind === "portfolio" && (
          <div className="setting-row">
            <div>
              <strong>Allocation</strong>
              <p>Show percentage allocation by position.</p>
            </div>
            <Toggle
              checked={showAllocation}
              onChange={setShowAllocation}
              label="Allocation"
            />
          </div>
        )}
        <Button
          disabled={
            !showPerformance &&
            !showEntry &&
            !showCurrent &&
            !showValue &&
            !showAllocation
          }
          onClick={build}
        >
          Continue to composer
        </Button>
      </section>
    </div>
  );
}
