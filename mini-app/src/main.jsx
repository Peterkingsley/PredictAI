import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";

function App() {
  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>Connect your wallet</h1>
      <p>WalletConnect setup is scaffolded. The full signing flow is implemented after Phase 1.</p>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
