import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

export default function PortfolioPage() {
  const { user } = useAuth();
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([apiFetch("/web-trades/positions", { auth: true }), apiFetch("/web-trades/orders", { auth: true })])
      .then(([positionsData, ordersData]) => {
        setPositions(positionsData.positions || []);
        setOrders(ordersData.orders || []);
      })
      .catch((err) => setError(err.message || "Unable to load portfolio."));
  }, [user]);

  if (!user) {
    return (
      <div className="empty-state">
        <p>Sign in to view your positions and orders.</p>
        <Link className="primary" to="/signin">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Portfolio</h1>
      {error ? <p className="status-text warn">{error}</p> : null}

      <div className="panel">
        <h3>Open positions</h3>
        {positions.length === 0 ? (
          <div className="empty-state">No open positions yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th>Side</th>
                <th>Amount</th>
                <th>Shares</th>
                <th>Entry price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id}>
                  <td>{position.market_question}</td>
                  <td>{position.side}</td>
                  <td>${position.amount_usdc.toFixed(2)}</td>
                  <td>{position.shares.toFixed(2)}</td>
                  <td>${position.entry_price.toFixed(2)}</td>
                  <td>{position.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3>Recent orders</h3>
        {orders.length === 0 ? (
          <div className="empty-state">No orders yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th>Side</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.market_question}</td>
                  <td>{order.side}</td>
                  <td>${order.amount_usdc.toFixed(2)}</td>
                  <td>{order.status}</td>
                  <td>{order.created_at ? new Date(order.created_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
