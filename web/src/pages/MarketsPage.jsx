import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api.js";

const CATEGORY_TABS = [
  { key: "top", label: "Trending" },
  { key: "new", label: "New" },
  { key: "politics", label: "Politics" },
  { key: "sports", label: "Sports" },
  { key: "crypto", label: "Crypto" },
];

function formatVolume(volume) {
  const value = Number(volume || 0);
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function MarketsPage() {
  const [tab, setTab] = useState("top");
  const [query, setQuery] = useState("");
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        let path = "/markets/top?limit=24";
        if (query.trim().length >= 2) path = `/markets/search?q=${encodeURIComponent(query.trim())}&limit=24`;
        else if (tab === "new") path = "/markets/new?limit=24";
        else if (tab !== "top") path = `/markets/category/${tab}?limit=24`;
        const data = await apiFetch(path);
        if (!ignore) setMarkets(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!ignore) setError(err.message || "Unable to load markets.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [tab, query]);

  return (
    <div className="markets-screen">
      <div className="markets-glow" />
      <header className="markets-header">
        <div>
          <span className="eyebrow">LIVE PREDICTION MARKETS</span>
          <h1>Trade what happens next.</h1>
          <p>Choose a Polymarket event, then trade YES or NO from the new PredictAI probability board.</p>
        </div>
        <div className="market-count"><strong>{markets.length}</strong><span>markets loaded</span></div>
      </header>

      <section className="market-browser">
        <div className="market-browser-toolbar">
          <label className="market-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search prediction markets"
            />
          </label>
          <div className="market-tabs">
            {CATEGORY_TABS.map((item) => (
              <button
                key={item.key}
                className={tab === item.key && !query ? "active" : ""}
                onClick={() => { setQuery(""); setTab(item.key); }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="market-loading">Loading live markets…</div> : null}
        {error ? <div className="market-loading warn">{error}</div> : null}
        {!loading && !error && markets.length === 0 ? <div className="market-loading">No markets found.</div> : null}

        <div className="market-grid market-grid-euphoria">
          {markets.map((market) => {
            const yes = Math.max(0, Math.min(1, Number(market.yes_price || 0)));
            const no = Math.max(0, Math.min(1, Number(market.no_price || 0)));
            return (
              <Link className="market-card market-card-euphoria" key={market.id} to={`/market/${market.id}`}>
                <div className="market-card-top">
                  <span className="category">{market.category || "Market"}</span>
                  <span className={`live-dot ${market.active ? "active" : ""}`}>{market.active ? "LIVE" : "CLOSED"}</span>
                </div>
                <span className="question">{market.question}</span>
                <div className="probability-bar" aria-label={`Yes ${Math.round(yes * 100)} percent`}>
                  <span style={{ width: `${yes * 100}%` }} />
                </div>
                <div className="market-odds-line">
                  <span><b>YES</b> {Math.round(yes * 100)}¢</span>
                  <span><b>NO</b> {Math.round(no * 100)}¢</span>
                </div>
                <div className="meta-row">
                  <span>{formatVolume(market.volume)} volume</span>
                  <span>Open board →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
