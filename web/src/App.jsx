import React, { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth.jsx";
import MarketsPage from "./pages/MarketsPage.jsx";
import MarketDetailPage from "./pages/MarketDetailPage.jsx";
import PricesPage from "./pages/PricesPage.jsx";
import CreatorPage from "./pages/CreatorPage.jsx";
import RewardsPage from "./pages/RewardsPage.jsx";
import PortfolioPage from "./pages/PortfolioPage.jsx";
import SignInPage from "./pages/SignInPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";

const THEME_KEY = "predictai_theme";

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return [theme, setTheme];
}

function NavBar({ theme, onToggleTheme }) {
  const { user, logout } = useAuth();

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">P</span>
          PredictAI
        </Link>
        <nav className="nav-links">
          <NavLink to="/" end>
            Markets
          </NavLink>
          <NavLink to="/prices">Prices</NavLink>
          <NavLink to="/creator">Creator</NavLink>
          <NavLink to="/rewards">Rewards</NavLink>
          {user ? <NavLink to="/portfolio">Portfolio</NavLink> : null}
        </nav>
        <div className="nav-actions">
          <button className="icon-button" onClick={onToggleTheme} title="Toggle theme">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          {user ? (
            <div className="account-chip">
              <span className="points-pill">{user.reward_points_balance} pts</span>
              <span className="email">{user.email}</span>
              <button className="secondary small" onClick={logout}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="auth-actions">
              <Link className="secondary small" to="/signin">
                Sign in
              </Link>
              <Link className="primary small" to="/signup">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [theme, setTheme] = useTheme();

  return (
    <div className="app-shell">
      <NavBar theme={theme} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MarketsPage />} />
          <Route path="/market/:marketId" element={<MarketDetailPage />} />
          <Route path="/prices" element={<PricesPage />} />
          <Route path="/creator" element={<CreatorPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Routes>
      </main>
      <footer className="app-footer">
        <p>PredictAI &mdash; create and predict everything. Markets powered by Polymarket.</p>
      </footer>
    </div>
  );
}
