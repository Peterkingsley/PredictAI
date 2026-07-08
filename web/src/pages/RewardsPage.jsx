import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

export default function RewardsPage() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiFetch("/rewards/me", { auth: true })
      .then(setRewards)
      .catch((err) => setError(err.message || "Unable to load rewards."));
  }, [user]);

  if (!user) {
    return (
      <div className="empty-state">
        <p>Sign in to see your points balance and referral link.</p>
        <Link className="primary" to="/signin">
          Sign in
        </Link>
      </div>
    );
  }

  const referralLink = rewards?.referral_link || `${window.location.origin}/signup?ref=${rewards?.referral_code || ""}`;

  return (
    <div>
      <h1>Rewards</h1>
      {error ? <p className="status-text warn">{error}</p> : null}

      <div className="grid-2">
        <div className="panel">
          <h3>Points balance</h3>
          <p style={{ fontSize: "2.2rem", fontWeight: 800, margin: "6px 0" }}>{rewards?.points_balance ?? "-"}</p>
          <p className="status-text">Earn points by suggesting markets, placing trades, and referring friends.</p>
        </div>
        <div className="panel">
          <h3>Referral link</h3>
          <p className="status-text">Share this link. You and your friend both earn points when they sign up.</p>
          <div className="field">
            <input readOnly value={referralLink} onClick={(event) => event.target.select()} />
          </div>
          <button
            className="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(referralLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <p className="status-text">Referrals: {rewards?.referral_count ?? 0}</p>
        </div>
      </div>

      <div className="panel">
        <h3>Activity</h3>
        {!rewards?.transactions?.length ? (
          <div className="empty-state">No reward activity yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Reason</th>
                <th>Points</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rewards.transactions.map((tx, index) => (
                <tr key={index}>
                  <td>{tx.reason.replaceAll("_", " ")}</td>
                  <td>{tx.points > 0 ? `+${tx.points}` : tx.points}</td>
                  <td>{tx.created_at ? new Date(tx.created_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
