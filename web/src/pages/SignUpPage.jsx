import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

export default function SignUpPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(email, password, referralCode);
      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to sign up.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel auth-form" onSubmit={onSubmit}>
      <h1>Sign up</h1>
      <div className="field">
        <label>Email</label>
        <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div className="field">
        <label>Password</label>
        <input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
      </div>
      <div className="field">
        <label>Referral code (optional)</label>
        <input value={referralCode} onChange={(event) => setReferralCode(event.target.value)} />
      </div>
      {error ? <p className="status-text warn">{error}</p> : null}
      <button className="primary" type="submit" disabled={submitting}>
        {submitting ? "Creating account..." : "Sign up"}
      </button>
      <p className="status-text">
        Already have an account? <Link to="/signin">Sign in</Link>
      </p>
    </form>
  );
}
