import {
  BarChart3,
  Bell,
  Bot,
  ChevronLeft,
  Eye,
  EyeOff,
  Filter,
  QrCode,
  Search,
  Settings,
  Share2,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  AlertsModal,
  AskAIButton,
  MarketCard,
  OutcomeSelector,
  ProbabilityChart,
  TradeTicket,
} from "../components/markets";
import { Button, Empty, IconButton, PageHeader, Stat } from "../components/ui";
import { markets } from "../services/data";
import { useApp } from "../store/AppStore";
import type { Market, Outcome } from "../types";
import { shareLink } from "../utils/browser";

const subcategories: Record<string, string[]> = {
  Recommend: ["Hot", "Trending", "New"],
  Sports: ["Soccer", "Basketball", "Tennis", "Esports"],
  Crypto: ["Target Price", "Bitcoin", "Ethereum"],
};
const banners = [
  {
    tag: "Featured market",
    title: "Forecast the next move in Bitcoin",
    copy: "Research signals, compare market probability, and place a prediction.",
    market: "bitcoin-2026",
    className: "bitcoin-banner",
  },
  {
    tag: "Build a track record",
    title: "Publish your thinking before the outcome",
    copy: "Share markets, positions, and transparent performance with Posts.",
    market: "dem-2028",
    className: "social-banner",
  },
  {
    tag: "PredictAI Intelligence",
    title: "Find the signal inside the noise",
    copy: "Get a structured, explainable read of every supported event.",
    market: "president-2028",
    className: "ai-banner",
  },
];
type Order = { market: Market; outcome: Outcome };

export function PredictHome() {
  const { wallet, setWallet, notifications } = useApp();
  const navigate = useNavigate();
  const [category, setCategory] = useState<"Recommend" | "Sports" | "Crypto">(
    "Recommend",
  );
  const [sub, setSub] = useState("Hot");
  const [banner, setBanner] = useState(0);
  const [order, setOrder] = useState<Order | null>(null);
  const [more, setMore] = useState<Market | null>(null);
  const filtered = markets.filter((m) =>
    category === "Recommend"
      ? m.category === "Recommend"
      : m.category === category,
  );
  const toggleBalance = () =>
    setWallet({ ...wallet, hideBalances: !wallet.hideBalances });
  const currencyValue =
    wallet.currency === "NGN"
      ? "₦0.00"
      : wallet.currency === "USDC"
        ? "0.00 USDC"
        : "$0.00";
  return (
    <div className="page predict-home">
      <section className="wallet-strip">
        <div>
          <span>
            Total balance{" "}
            <button className="text-icon" onClick={toggleBalance}>
              {wallet.hideBalances ? <EyeOff /> : <Eye />}
            </button>
          </span>
          <strong>{wallet.hideBalances ? "••••••" : currencyValue}</strong>
        </div>
        <div className="pnl-block">
          <span>Today’s P&amp;L</span>
          <strong className="positive">+$0.00 (0.00%)</strong>
        </div>
        <div className="wallet-buttons">
          <Button
            variant="secondary"
            onClick={() => navigate("/app/assets/deposit")}
          >
            Deposit
          </Button>
          <Button onClick={() => navigate("/app/assets/withdraw")}>
            Withdraw
          </Button>
          <IconButton
            label="Scan wallet address"
            onClick={() => navigate("/app/assets/scan")}
          >
            <QrCode />
          </IconButton>
          <IconButton
            label="Notifications"
            onClick={() => navigate("/app/notifications")}
          >
            <Bell />
            {notifications.some((n) => !n.read) && <i className="status-dot" />}
          </IconButton>
        </div>
      </section>
      <section className={`hero-banner ${banners[banner]?.className}`}>
        <div className="hero-copy">
          <span>{banners[banner]?.tag}</span>
          <h1>{banners[banner]?.title}</h1>
          <p>{banners[banner]?.copy}</p>
          <Button
            onClick={() => navigate(`/app/market/${banners[banner]?.market}`)}
          >
            Explore market
          </Button>
        </div>
        <div className="hero-art">
          <div className="orb one" />
          <div className="orb two" />
          <TrendingUp />
        </div>
        <div className="hero-dots">
          {banners.map((_, i) => (
            <button
              aria-label={`Show banner ${i + 1}`}
              className={i === banner ? "active" : ""}
              key={i}
              onClick={() => setBanner(i)}
            />
          ))}
        </div>
      </section>
      <div className="ticker">
        <span>Market pulse</span>
        <div>
          <b>BTC</b> $84,520 <em>+2.4%</em>
        </div>
        <div>
          <b>ETH</b> $2,569 <em>+1.1%</em>
        </div>
        <div>
          <b>SOL</b> $166.50 <em>+4.7%</em>
        </div>
        <div>
          <b>Active events</b> 124
        </div>
      </div>
      <section className="section-heading">
        <div>
          <h2>Explore events</h2>
          <p>
            Click a card to research it, or click an outcome to start a
            prediction.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/app/search")}>
          <Search /> Search events
        </Button>
      </section>
      <div className="tabs category-tabs">
        {(["Recommend", "Sports", "Crypto"] as const).map((c) => (
          <button
            className={category === c ? "active" : ""}
            key={c}
            onClick={() => {
              setCategory(c);
              setSub(subcategories[c]?.[0] || "");
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="chip-row">
        {subcategories[category]?.map((s) => (
          <button
            className={sub === s ? "active" : ""}
            key={s}
            onClick={() => setSub(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="market-grid">
        {filtered.map((m) => (
          <MarketCard
            key={m.id}
            market={m}
            onTrade={(market, outcome) => setOrder({ market, outcome })}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <Empty
          icon={Filter}
          title="No events here yet"
          description="Choose another category to browse active markets."
        />
      )}
      <TradeTicket order={order} onClose={() => setOrder(null)} />
      <MoreOutcomes
        market={more}
        onClose={() => setMore(null)}
        onTrade={(o) => more && setOrder({ market: more, outcome: o })}
      />
    </div>
  );
}

function MoreOutcomes({
  market,
  onClose,
  onTrade,
}: {
  market: Market | null;
  onClose: () => void;
  onTrade: (o: Outcome) => void;
}) {
  if (!market) return null;
  return (
    <div className="drawer">
      <button aria-label="Close outcomes" onClick={onClose} />
      <section>
        <header>
          <h2>{market.title}</h2>
          <IconButton label="Close" onClick={onClose}>
            ×
          </IconButton>
        </header>
        <OutcomeSelector market={market} onTrade={onTrade} />
      </section>
    </div>
  );
}

export function EventSearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const [category, setCategory] = useState("All");
  const [order, setOrder] = useState<Order | null>(null);
  const results = markets.filter(
    (m) =>
      (category === "All" || m.category === category) &&
      [m.title, m.category, m.subcategory, ...m.outcomes.map((o) => o.label)]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="page">
      <PageHeader
        eyebrow="Discover"
        title="Search events"
        description="Search event titles, categories, and outcomes."
      />
      <div className="search-page-field">
        <Search />
        <input
          autoFocus
          value={query}
          onChange={(e) =>
            setParams(e.target.value ? { q: e.target.value } : {})
          }
          placeholder="Try Bitcoin, election, or soccer"
        />
        <SlidersHorizontal />
      </div>
      <div className="chip-row">
        {["All", "Recommend", "Sports", "Crypto"].map((c) => (
          <button
            className={category === c ? "active" : ""}
            onClick={() => setCategory(c)}
            key={c}
          >
            {c}
          </button>
        ))}
      </div>
      {query && (
        <p className="result-count">
          {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
        </p>
      )}
      <div className="market-grid">
        {results.map((m) => (
          <MarketCard
            key={m.id}
            market={m}
            onTrade={(market, outcome) => setOrder({ market, outcome })}
          />
        ))}
      </div>
      {query && results.length === 0 && (
        <Empty
          icon={Search}
          title="No events found"
          description="Try a broader term or another category."
        />
      )}
      <TradeTicket order={order} onClose={() => setOrder(null)} />
    </div>
  );
}

export function MarketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useApp();
  const market = markets.find((m) => m.id === id);
  const [order, setOrder] = useState<Order | null>(null);
  const [alerts, setAlerts] = useState(false);
  const [range, setRange] = useState("1D");
  const [sportsTab, setSportsTab] = useState("Game lines");
  if (!market) return <NotFoundMarket />;
  return (
    <div className="page market-detail">
      <div className="detail-toolbar">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft /> Back
        </Button>
        <div>
          <IconButton
            label="Share market"
            onClick={() =>
              void shareLink(market.title, location.href).then((result) =>
                toast(result === "shared" ? "Market shared" : "Market link copied", "success"),
              )
            }
          >
            <Share2 />
          </IconButton>
          <IconButton
            label="Event alert settings"
            onClick={() => setAlerts(true)}
          >
            <Settings />
          </IconButton>
        </div>
      </div>
      <div className="detail-heading">
        <div>
          <span className={`category-pill ${market.category.toLowerCase()}`}>
            {market.category} · {market.subcategory}
          </span>
          <h1>{market.title}</h1>
        </div>
        <AskAIButton marketId={market.id} />
      </div>
      <div className="detail-layout">
        <section>
          <div className="legend-grid">
            {market.outcomes.slice(0, 4).map((o, i) => (
              <div key={o.label}>
                <span
                  className="legend-dot"
                  style={{
                    background:
                      o.color ||
                      ["#1677ff", "#ff7b3b", "#43c6d5", "#9e91ee"][i],
                  }}
                />
                <span>{o.label}</span>
                <strong>{o.probability}%</strong>
              </div>
            ))}
          </div>
          <ProbabilityChart market={market} />
          <div className="chart-toolbar">
            <strong>
              {market.volume} <span>volume</span>
            </strong>
            <div>
              {["1D", "1W", "1M", "All"].map((v) => (
                <button
                  className={range === v ? "active" : ""}
                  onClick={() => setRange(v)}
                  key={v}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="intelligence-preview">
            <Bot />
            <div>
              <span>PredictAI edge</span>
              <strong>
                {market.id === "bitcoin-2026" ? "+6" : " +4"} points
              </strong>
              <p>Structured signal analysis is available for this market.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate(`/app/market/${market.id}/intelligence`)}
            >
              View intelligence
            </Button>
          </div>
          <div className="discussion-callout">
            <div>
              <h3>Market discussion</h3>
              <p>See how traders are reasoning about this event.</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate(`/app/posts/market/${market.id}`)}
            >
              View posts
            </Button>
          </div>
        </section>
        <aside className="trade-panel">
          <div className="panel-title">
            <div>
              <span>Choose an outcome</span>
              <small>Available · 1,000 USDC</small>
            </div>
            <BarChart3 />
          </div>
          {market.category === "Sports" && (
            <div className="tabs small">
              {["Game lines", "Exact score", "Halves"].map((t) => (
                <button
                  className={sportsTab === t ? "active" : ""}
                  key={t}
                  onClick={() => setSportsTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <OutcomeSelector
            market={market}
            onTrade={(o) => setOrder({ market, outcome: o })}
          />
          {market.category === "Sports" && (
            <SportsLines
              market={market}
              trade={(outcome) => setOrder({ market, outcome })}
            />
          )}
        </aside>
      </div>
      <section className="rules-section">
        <h2>Rules</h2>
        {market.rules.split("\n").map((r, i) => (
          <p key={i}>{r}</p>
        ))}
        <h3>Timeline</h3>
        <ol>
          <li>
            <CheckCircle /> Market opened <time>Jun 27, 2026</time>
          </li>
          <li>
            <CheckCircle /> Market closes <time>Jul 11, 2027</time>
          </li>
          <li>
            <span className="timeline-empty" /> Resolved after official
            confirmation
          </li>
        </ol>
      </section>
      <TradeTicket order={order} onClose={() => setOrder(null)} />
      <AlertsModal
        market={alerts ? market : null}
        onClose={() => setAlerts(false)}
      />
    </div>
  );
}

function CheckCircle() {
  return <span className="timeline-check">✓</span>;
}
function SportsLines({
  market,
  trade,
}: {
  market: Market;
  trade: (o: Outcome) => void;
}) {
  const items = [
    { label: "Wuhan +1.5", probability: 65, odds: "1.54x" },
    { label: "Henan -1.5", probability: 2, odds: "50.00x" },
    { label: "Over 2.5", probability: 13, odds: "7.69x" },
    { label: "Under 2.5", probability: 46, odds: "2.17x" },
  ];
  return (
    <div className="sports-lines">
      <h3>Spreads &amp; totals</h3>
      {items.map((i) => (
        <button key={i.label} onClick={() => trade(i)}>
          <span>{i.label}</span>
          <small>{i.odds}</small>
          <b>{i.probability}%</b>
        </button>
      ))}
    </div>
  );
}
function NotFoundMarket() {
  return (
    <div className="page">
      <Empty
        icon={Search}
        title="Market not found"
        description="This event may have closed or the link is invalid."
        action={
          <Link className="button button--primary" to="/app/predict">
            Browse events
          </Link>
        }
      />
    </div>
  );
}

function analysisFor(market: Market) {
  const focus =
    market.outcomes.find((o) => o.tradeAction === "Buy") || market.outcomes[0]!;
  const edge =
    market.id === "bitcoin-2026" ? 6 : [4, -3, 8, 2, 5][market.id.length % 5]!;
  const probability = Math.max(1, Math.min(99, focus.probability + edge));
  const names =
    market.category === "Crypto"
      ? [
          "On-chain activity",
          "Social sentiment",
          "Price momentum",
          "Macro conditions",
          "News",
        ]
      : market.category === "Sports"
        ? [
            "Recent form",
            "Squad availability",
            "Head-to-head",
            "Market liquidity",
            "Consensus",
          ]
        : [
            "News",
            "Public sentiment",
            "Fundamentals",
            "Market liquidity",
            "Macro conditions",
          ];
  return {
    focus,
    edge,
    probability,
    confidence:
      Math.abs(edge) >= 8 ? "High" : Math.abs(edge) >= 4 ? "Medium" : "Low",
    signals: names.map((name, i) => ({
      name,
      score: Math.max(18, Math.min(88, 52 + edge * 2 + [8, 3, 6, -10, 1][i]!)),
    })),
  };
}
export function IntelligencePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useApp();
  const market = markets.find((m) => m.id === id);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const revision = useState(0)[0];
  const analysis = useMemo(
    () => (market ? analysisFor(market) : null),
    [market, revision],
  );
  if (!market || !analysis) return <NotFoundMarket />;
  const refresh = () => {
    setLoading(true);
    setFailed(false);
    window.setTimeout(() => {
      setLoading(false);
      toast("Intelligence refreshed", "success");
    }, 900);
  };
  return (
    <div className="page intelligence">
      <div className="detail-toolbar">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ChevronLeft /> Back to market
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate(`/app/posts/new?market=${market.id}&ai=1`)}
        >
          <Share2 /> Share to Posts
        </Button>
      </div>
      <PageHeader
        eyebrow="PredictAI Intelligence"
        title={market.title}
        description="Explainable probability research based on the current market context."
        action={
          <Button onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh analysis"}
          </Button>
        }
      />
      {failed ? (
        <div className="error-panel">
          <h3>Analysis unavailable</h3>
          <p>
            PredictAI could not complete this analysis. Your market data is
            still available.
          </p>
          <Button
            onClick={() => {
              setFailed(false);
              refresh();
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <section className="ai-overview">
            <div className="verdict">
              <span>Model view</span>
              <strong>
                {analysis.edge >= 3
                  ? "Lean yes"
                  : analysis.edge <= -3
                    ? "Lean no"
                    : "Neutral"}
              </strong>
              <small>{analysis.confidence} confidence</small>
            </div>
            <div className="probability-compare">
              <div>
                <span>PredictAI</span>
                <strong>{analysis.probability}%</strong>
              </div>
              <div className="edge-line">
                <span style={{ width: `${analysis.probability}%` }} />
              </div>
              <div>
                <span>Market</span>
                <strong>{analysis.focus.probability}%</strong>
              </div>
              <b>
                {analysis.edge >= 0 ? "+" : ""}
                {analysis.edge} pt edge
              </b>
            </div>
          </section>
          <div className="intelligence-grid">
            <section className="content-card">
              <h2>Signal breakdown</h2>
              {analysis.signals.map((s) => (
                <div className="signal-row" key={s.name}>
                  <div>
                    <strong>{s.name}</strong>
                    <small>
                      {s.score >= 62
                        ? "Supportive"
                        : s.score <= 42
                          ? "Cautious"
                          : "Neutral"}{" "}
                      signal
                    </small>
                  </div>
                  <div className="signal-meter">
                    <span style={{ width: `${s.score}%` }} />
                  </div>
                  <b>{s.score}</b>
                </div>
              ))}
            </section>
            <section className="content-card">
              <h2>Intelligence summary</h2>
              <p>
                PredictAI places “{analysis.focus.label}” at{" "}
                {analysis.probability}%, {Math.abs(analysis.edge)} points{" "}
                {analysis.edge >= 0 ? "above" : "below"} the market. Available
                signals are broadly{" "}
                {analysis.edge >= 0 ? "supportive" : "cautious"}, while future
                news and liquidity limit conviction.
              </p>
              <h3>Key risks</h3>
              <ul>
                <li>A major breaking-news event</li>
                <li>A sharp shift in market liquidity</li>
                <li>Material changes in participant status</li>
                <li>Incomplete or conflicting source data</li>
              </ul>
              <small>
                Updated just now · This analysis is informational, not financial
                advice.
              </small>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
