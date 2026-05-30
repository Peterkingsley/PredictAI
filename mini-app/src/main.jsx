import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const SAMPLE_ADDRESS = "0x3f4a9168b22c70c946e12e5fb81c8ad9b91c";

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function App() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("Ready");
  const canSubmit = useMemo(() => isAddress(address), [address]);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  async function connectInjectedWallet() {
    if (!window.ethereum?.request) {
      setStatus("No injected wallet found. Paste your wallet address instead.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const [wallet] = accounts || [];
      if (wallet) {
        setAddress(wallet);
        setStatus("Wallet detected. Send it back to Telegram.");
      }
    } catch {
      setStatus("Wallet request was cancelled.");
    }
  }

  function sendWallet() {
    if (!canSubmit) {
      setStatus("Enter a valid EVM address.");
      return;
    }

    const payload = JSON.stringify({
      type: "wallet_connected",
      address,
    });

    if (window.Telegram?.WebApp?.sendData) {
      window.Telegram.WebApp.sendData(payload);
      window.Telegram.WebApp.close();
      return;
    }

    setStatus("Telegram bridge is unavailable. Open this page from the bot's /connect button.");
  }

  return (
    <main className="wallet-app">
      <section className="panel">
        <div className="brand-mark">P</div>
        <p className="eyebrow">PredictAI wallet</p>
        <h1>Connect your wallet</h1>
        <p className="copy">
          Add a Polygon wallet so the bot can show balances and prepare the trading flow. No private keys are requested.
        </p>

        <button className="primary" onClick={connectInjectedWallet}>
          Use browser wallet
        </button>

        <label>
          Wallet address
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value.trim())}
            placeholder={SAMPLE_ADDRESS}
            spellCheck="false"
          />
        </label>

        <button className="secondary" onClick={() => setAddress(SAMPLE_ADDRESS)}>
          Use demo address
        </button>

        <button className="primary" disabled={!canSubmit} onClick={sendWallet}>
          Send to Telegram
        </button>

        <p className={canSubmit ? "status good" : "status"}>{status}</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
