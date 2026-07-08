import React, { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

function SuggestionCard({ suggestion }) {
  return (
    <div className="panel">
      <span className={`badge ${suggestion.status.toLowerCase()}`}>{suggestion.status}</span>
      <h3>{suggestion.question}</h3>
      <p className="status-text">{suggestion.resolution_criteria}</p>
      <div className="meta-row">
        <span>{suggestion.category}</span>
        <span>{suggestion.created_at ? new Date(suggestion.created_at).toLocaleDateString() : ""}</span>
      </div>
    </div>
  );
}

export default function CreatorPage() {
  const { user } = useAuth();
  const [approved, setApproved] = useState([]);
  const [mine, setMine] = useState([]);
  const [form, setForm] = useState({ question: "", category: "general", resolution_criteria: "", source_url: "" });
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadApproved() {
    try {
      const data = await apiFetch("/creator/suggestions");
      setApproved(data.suggestions || []);
    } catch {
      setApproved([]);
    }
  }

  async function loadMine() {
    if (!user) return;
    try {
      const data = await apiFetch("/creator/suggestions/mine", { auth: true });
      setMine(data.suggestions || []);
    } catch {
      setMine([]);
    }
  }

  useEffect(() => {
    loadApproved();
  }, []);

  useEffect(() => {
    loadMine();
  }, [user]);

  async function submitSuggestion(event) {
    event.preventDefault();
    setStatus("");
    if (!user) {
      setStatus("Sign in to suggest a market.");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/creator/suggestions", { method: "POST", auth: true, body: form });
      setForm({ question: "", category: "general", resolution_criteria: "", source_url: "" });
      setStatus("Suggestion submitted for review. You earned 10 points.");
      loadMine();
    } catch (err) {
      setStatus(err.message || "Unable to submit suggestion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Creator</h1>
      <p className="status-text">
        Suggest a new market question. Our team reviews suggestions and turns approved ones into live markets. Every
        suggestion earns reward points.
      </p>

      <div className="grid-2">
        <div>
          <h2>Approved suggestions</h2>
          {approved.length === 0 ? <div className="empty-state">No approved suggestions yet.</div> : null}
          {approved.map((suggestion) => (
            <SuggestionCard suggestion={suggestion} key={suggestion.id} />
          ))}

          {user ? (
            <>
              <h2>My suggestions</h2>
              {mine.length === 0 ? <div className="empty-state">You haven't submitted any suggestions yet.</div> : null}
              {mine.map((suggestion) => (
                <SuggestionCard suggestion={suggestion} key={suggestion.id} />
              ))}
            </>
          ) : null}
        </div>

        <form className="panel" onSubmit={submitSuggestion}>
          <h3>Suggest a market</h3>
          <div className="field">
            <label>Question</label>
            <input
              required
              minLength={10}
              maxLength={280}
              value={form.question}
              onChange={(event) => setForm({ ...form, question: event.target.value })}
              placeholder="Will X happen by Y date?"
            />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              <option value="general">General</option>
              <option value="politics">Politics</option>
              <option value="sports">Sports</option>
              <option value="crypto">Crypto</option>
              <option value="entertainment">Entertainment</option>
            </select>
          </div>
          <div className="field">
            <label>Resolution criteria</label>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              value={form.resolution_criteria}
              onChange={(event) => setForm({ ...form, resolution_criteria: event.target.value })}
              placeholder="Explain exactly how and when this market should resolve."
            />
          </div>
          <div className="field">
            <label>Source link (optional)</label>
            <input
              type="url"
              value={form.source_url}
              onChange={(event) => setForm({ ...form, source_url: event.target.value })}
              placeholder="https://..."
            />
          </div>
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit suggestion"}
          </button>
          {status ? <p className="status-text">{status}</p> : null}
        </form>
      </div>
    </div>
  );
}
