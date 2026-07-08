import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

export default function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel auth-form" onSubmit={onSubmit}>
      <h1>Sign in</h1>
      <div className="field">
        <label>Email</label>
        <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div className="field">
        <label>Password</label>
        <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      {error ? <p className="status-text warn">{error}</p> : null}
      <button className="primary" type="submit" disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </button>
      <p className="status-text">
        No account yet? <Link to="/signup">Sign up</Link>
      </p>
    </form>
  );
}
