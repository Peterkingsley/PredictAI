import React from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth.jsx";
import MarketsPage from "./pages/MarketsPage.jsx";
import MarketDetailPage from "./pages/MarketDetailPage.jsx";
import PricesPage from "./pages/PricesPage.jsx";
import CreatorPage from "./pages/CreatorPage.jsx";
import RewardsPage from "./pages/RewardsPage.jsx";
import PortfolioPage from "./pages/PortfolioPage.jsx";
import SignInPage from "./pages/SignInPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";

function Icon({ name }) {
  const paths = {
    trade: <path d="M4 16.5 9.5 11l4 4L20 7.5M15 7.5h5v5" />,
    board: <path d="M5 20V10m7 10V4m7 16v-7" />,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6" /></>,
    spark: <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2Zm7 12 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />,
    prices: <path d="M4 18V9m5 9V5m5 13v-6m5 6V3" />,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
      {paths[name]}
    </svg>
  );
}

function SideRail() {
  const { user } = useAuth();
  return (
    <aside className="side-rail">
      <Link to="/" className="brand brand-rail" aria-label="PredictAI home">
        <span className="brand-mark"><span>P</span></span>
        <span>predict<span className="brand-accent">ai</span></span>
      </Link>

      <nav className="rail-nav" aria-label="Primary navigation">
        <NavLink to="/" end><Icon name="trade" /><span>Trade</span></NavLink>
        <NavLink to="/rewards"><Icon name="board" /><span>Leaderboard</span></NavLink>
        <NavLink to="/portfolio"><Icon name="profile" /><span>Profile</span></NavLink>
      </nav>

      <div className="rail-spacer" />

      <nav className="rail-nav rail-nav-secondary" aria-label="Secondary navigation">
        <NavLink to="/creator"><Icon name="spark" /><span>Creator</span></NavLink>
        <NavLink to="/prices"><Icon name="prices" /><span>Prices</span></NavLink>
      </nav>

      <div className="rail-balance">
        <span className="rail-balance-icon">▣</span>
        <strong>{user ? `${user.reward_points_balance || 0} pts` : "$0.00"}</strong>
      </div>
    </aside>
  );
}

function AccountHud() {
  const { user, logout } = useAuth();
  if (!user) {
    return (
      <div className="account-hud">
        <Link to="/signin" className="hud-link">Sign in</Link>
        <Link to="/signup" className="hud-primary">Create account</Link>
      </div>
    );
  }

  const initial = (user.email || "P").slice(0, 1).toUpperCase();
  return (
    <div className="account-hud account-hud-signed">
      <span className="hud-avatar">{initial}</span>
      <span className="hud-stat">{user.reward_points_balance || 0}</span>
      <span className="hud-divider" />
      <span className="hud-email">{user.email}</span>
      <button className="hud-logout" onClick={logout}>Sign out</button>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const immersive = location.pathname.startsWith("/market/");

  return (
    <div className={`app-shell ${immersive ? "is-immersive" : ""}`}>
      <SideRail />
      <div className="workspace">
        <AccountHud />
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
      </div>
    </div>
  );
}
