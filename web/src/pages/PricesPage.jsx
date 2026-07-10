import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";

export default function PricesPage() {
  const [prices, setPrices] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await apiFetch("/prices");
        if (!ignore) setPrices(data.prices || []);
      } catch (err) {
        if (!ignore) setError(err.message || "Unable to load live prices.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <h1>Live prices</h1>
      <p className="status-text">Reference prices for popular assets, refreshed every 30 seconds.</p>
      {loading ? <p className="status-text">Loading...</p> : null}
      {error ? <p className="status-text warn">{error}</p> : null}
      <div className="price-ticker">
        {prices.map((price) => (
          <div className="price-card" key={price.symbol}>
            <div className="symbol">{price.symbol}</div>
            <div className="value">${Number(price.price_usd || 0).toLocaleString()}</div>
            <div className={`change ${Number(price.change_24h_pct) >= 0 ? "up" : "down"}`}>
              {Number(price.change_24h_pct || 0).toFixed(2)}% (24h)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
