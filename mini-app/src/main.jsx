import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useAppKit, useAppKitAccount, useAppKitNetwork, useDisconnect } from "@reown/appkit/react";
import "./styles.css";
import { AppKitProvider, apiBaseUrl, requiredNetwork, walletConnectProjectId } from "./walletConfig.jsx";

const TRUST_WALLET_POLYGON_COIN_ID = 966;

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function normalizeAddress(value) {
  return String(value || "").trim().toLowerCase();
}

function shortAddress(value) {
  if (!value) {
    return "";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getIntentId() {
  return new URLSearchParams(window.location.search).get("intent_id") || "";
}

function buildApiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

function formatPayloadValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function isTelegramWebApp() {
  return Boolean(window.Telegram?.WebApp);
}

function ExternalBrowserFallback() {
  const [copyStatus, setCopyStatus] = useState("");
  const currentUrl = window.location.href;
  const trustWalletUrl = `https://link.trustwallet.com/open_url?coin_id=${TRUST_WALLET_POLYGON_COIN_ID}&url=${encodeURIComponent(currentUrl)}`;

  function openExternally() {
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(currentUrl, { try_instant_view: false });
      return;
    }
    window.open(currentUrl, "_blank", "noopener,noreferrer");
  }

  async function copyCurrentUrl() {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopyStatus("Link copied.");
    } catch {
      setCopyStatus("Copy blocked. Long-press the link below instead.");
    }
  }

  function openTrustWallet() {
    window.location.href = trustWalletUrl;
  }

  if (!isTelegramWebApp()) {
    return null;
  }

  return (
    <div className="fallback-panel">
      <p className="status">
        If your wallet app will not open from Telegram, open this page in your browser first.
      </p>
      <button className="secondary" onClick={openExternally}>
        Open in browser
      </button>
      <button className="primary" onClick={openTrustWallet}>
        Open in Trust Wallet
      </button>
      <button className="secondary" onClick={copyCurrentUrl}>
        Copy page link
      </button>
      <a className="fallback-link" href={currentUrl} target="_blank" rel="noreferrer">
        {currentUrl}
      </a>
      {copyStatus ? <p className="status">{copyStatus}</p> : null}
    </div>
  );
}

function WalletConnectControls({ onWalletDetected, onWalletState }) {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, isConnected, status } = useAppKitAccount({ namespace: "eip155" });
  const { chainId, switchNetwork } = useAppKitNetwork();
  const isPolygon = Number(chainId) === Number(requiredNetwork.id);

  useEffect(() => {
    onWalletState({
      address: isConnected && isAddress(address) ? address : "",
      chainId: chainId || null,
      isConnected,
      isPolygon,
    });
    if (isConnected && isAddress(address)) {
      onWalletDetected(address);
    }
  }, [address, chainId, isConnected, isPolygon, onWalletDetected, onWalletState]);

  async function enforcePolygon() {
    try {
      await switchNetwork(requiredNetwork);
    } catch {
      open({ view: "Networks" });
    }
  }

  return (
    <div className="wallet-connect">
      <div className="wallet-row">
        <div>
          <p className="label">WalletConnect</p>
          <p className={isConnected ? "status good" : "status"}>
            {isConnected ? shortAddress(address) : `Status: ${status || "disconnected"}`}
          </p>
        </div>
        <button className="secondary small" onClick={() => open({ view: isConnected ? "Account" : "Connect", namespace: "eip155" })}>
          {isConnected ? "Account" : "Connect"}
        </button>
      </div>

      {isConnected && !isPolygon ? (
        <button className="primary" onClick={enforcePolygon}>
          Switch to Polygon
        </button>
      ) : null}

      {isConnected ? (
        <button className="secondary" onClick={() => disconnect()}>
          Disconnect
        </button>
      ) : null}

      {!isConnected ? <ExternalBrowserFallback /> : null}
    </div>
  );
}

function WalletConnectPanel({ onWalletDetected, onWalletState }) {
  if (!walletConnectProjectId) {
    return (
      <div className="notice">
        Add <code>VITE_WALLETCONNECT_PROJECT_ID</code> to enable Reown WalletConnect.
      </div>
    );
  }

  return <WalletConnectControls onWalletDetected={onWalletDetected} onWalletState={onWalletState} />;
}

function SigningIntentCard({ intentId, intent, loadState, loadError, walletState }) {
  if (!intentId) {
    return null;
  }

  if (!apiBaseUrl) {
    return (
      <div className="signing-card warning">
        <p className="label">Signing request</p>
        <p className="status">Add <code>VITE_API_BASE_URL</code> so the Mini App can fetch signing intents.</p>
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="signing-card">
        <p className="label">Signing request</p>
        <p className="status">Loading intent #{intentId}...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="signing-card warning">
        <p className="label">Signing request</p>
        <p className="status">{loadError}</p>
      </div>
    );
  }

  if (!intent) {
    return null;
  }

  const expectedWallet = normalizeAddress(intent.wallet_address);
  const connectedWallet = normalizeAddress(walletState.address);
  const walletMatches = expectedWallet && connectedWallet && expectedWallet === connectedWallet;
  const canPrepareSignature = walletMatches && walletState.isPolygon && intent.status === "PENDING";
  const payloadEntries = Object.entries(intent.payload || {}).slice(0, 6);

  return (
    <div className="signing-card">
      <div>
        <p className="label">Signing request #{intent.id}</p>
        <p className="status">Status: {intent.status}</p>
      </div>

      <div className="details-grid">
        <span>Type</span>
        <strong>{intent.intent_type}</strong>
        <span>Wallet</span>
        <strong>{shortAddress(intent.wallet_address)}</strong>
      </div>

      {payloadEntries.length ? (
        <div className="payload-preview">
          {payloadEntries.map(([key, value]) => (
            <div className="payload-row" key={key}>
              <span>{key}</span>
              <pre>{formatPayloadValue(value)}</pre>
            </div>
          ))}
        </div>
      ) : null}

      {!walletState.isConnected ? <p className="status">Connect with WalletConnect to continue.</p> : null}
      {walletState.isConnected && !walletMatches ? (
        <p className="status warning-text">Connected wallet must match {shortAddress(intent.wallet_address)}.</p>
      ) : null}
      {walletMatches && !walletState.isPolygon ? <p className="status warning-text">Switch to Polygon before signing.</p> : null}

      <button
        className="primary"
        disabled={!canPrepareSignature}
        onClick={() => window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success")}
      >
        Ready to sign
      </button>
    </div>
  );
}

function App() {
  const [status, setStatus] = useState("Ready");
  const [intentId] = useState(getIntentId);
  const [intent, setIntent] = useState(null);
  const [intentLoadState, setIntentLoadState] = useState(intentId ? "loading" : "idle");
  const [intentLoadError, setIntentLoadError] = useState("");
  const [walletState, setWalletState] = useState({
    address: "",
    chainId: null,
    isConnected: false,
    isPolygon: false,
  });
  const handleWalletDetected = useCallback((wallet) => {
    setStatus(`WalletConnect account ready: ${shortAddress(wallet)}.`);
  }, []);
  const handleWalletState = useCallback((nextWalletState) => {
    setWalletState(nextWalletState);
  }, []);

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  useEffect(() => {
    if (!intentId || !apiBaseUrl) {
      return undefined;
    }

    const controller = new AbortController();
    async function fetchIntent() {
      setIntentLoadState("loading");
      setIntentLoadError("");
      try {
        const response = await fetch(buildApiUrl(`/trades/signing-intents/${intentId}`), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Signing intent request failed (${response.status})`);
        }
        const data = await response.json();
        if (data.status === "not_found") {
          throw new Error(`Signing intent #${intentId} was not found.`);
        }
        setIntent(data);
        setIntentLoadState("ready");
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }
        setIntentLoadError(error.message || "Unable to load signing intent.");
        setIntentLoadState("error");
      }
    }

    fetchIntent();
    return () => controller.abort();
  }, [intentId]);

  function sendWallet() {
    if (!walletState.isConnected || !isAddress(walletState.address)) {
      setStatus("Connect with WalletConnect first.");
      return;
    }
    if (!walletState.isPolygon) {
      setStatus("Switch to Polygon before sending your wallet.");
      return;
    }

    const payload = JSON.stringify({
      type: "wallet_connected",
      address: walletState.address,
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
        <h1>{intentId ? "Review signing request" : "Connect your wallet"}</h1>
        <p className="copy">
          Connect a Polygon wallet so the bot can show balances and prepare the signing flow. No private keys are requested.
        </p>

        <SigningIntentCard
          intentId={intentId}
          intent={intent}
          loadState={intentLoadState}
          loadError={intentLoadError}
          walletState={walletState}
        />

        <WalletConnectPanel onWalletDetected={handleWalletDetected} onWalletState={handleWalletState} />

        <button className="primary" disabled={!walletState.isConnected || !walletState.isPolygon} onClick={sendWallet}>
          Send to Telegram
        </button>

        <p className={walletState.isConnected && walletState.isPolygon ? "status good" : "status"}>{status}</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <AppKitProvider>
    <App />
  </AppKitProvider>,
);
