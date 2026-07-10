import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api.js";

const CATEGORY_TABS = [
  { key: "top", label: "Top" },
  { key: "new", label: "New" },
  { key: "politics", label: "Politics" },
  { key: "sports", label: "Matches" },
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
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        let path = "/markets/top?limit=24";
        if (query.trim().length >= 2) {
          path = `/markets/search?q=${encodeURIComponent(query.trim())}&limit=24`;
        } else if (tab === "new") {
          path = "/markets/new?limit=24";
        } else if (tab !== "top") {
          path = `/markets/category/${tab}?limit=24`;
        }
        const data = await apiFetch(path);
        setMarkets(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Unable to load markets.");
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [tab, query]);

  return (
    <div>
      <section className="hero">
        <h1>Create and predict everything</h1>
        <p>
          Browse live prediction markets, trade YES/NO outcomes with a Polygon wallet, and earn reward points for every
          action &mdash; suggestions, trades, and referrals.
        </p>
      </section>

      <div className="search-row">
        <input
          placeholder="Search markets..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="tabs">
        {CATEGORY_TABS.map((item) => (
          <button
            key={item.key}
            className={tab === item.key && !query ? "active" : ""}
            onClick={() => {
              setQuery("");
              setTab(item.key);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <p className="status-text">Loading markets...</p> : null}
      {error ? <p className="status-text warn">{error}</p> : null}

      {!loading && !error && markets.length === 0 ? (
        <div className="empty-state">No markets found. Try another search or category.</div>
      ) : null}

      <div className="market-grid">
        {markets.map((market) => (
          <Link className="market-card" key={market.id} to={`/market/${market.id}`}>
            <span className="category">{market.category}</span>
            <span className="question">{market.question}</span>
            <div className="odds-row">
              <span className="odds-pill yes">Yes {Math.round(market.yes_price * 100)}%</span>
              <span className="odds-pill no">No {Math.round(market.no_price * 100)}%</span>
            </div>
            <div className="meta-row">
              <span>Volume {formatVolume(market.volume)}</span>
              <span>{market.active ? "Live" : "Closed"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
