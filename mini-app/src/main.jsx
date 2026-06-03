import "./polyfills.js";
import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useAppKit, useAppKitAccount, useAppKitNetwork, useDisconnect } from "@reown/appkit/react";
import { useReadContract, useSignMessage, useSignTypedData, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import "./styles.css";
import { AppKitProvider, apiBaseUrl, requiredNetwork, walletConnectProjectId } from "./walletConfig.jsx";

const USDC_DECIMALS = 6;
const USDC_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

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

function getTelegramId() {
  return new URLSearchParams(window.location.search).get("telegram_id") || "";
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

function buildSigningMessage(intent) {
  return [
    "PredictAI signing request",
    `Intent ID: ${intent.id}`,
    `Type: ${intent.intent_type}`,
    `Wallet: ${normalizeAddress(intent.wallet_address)}`,
    `Payload: ${JSON.stringify(intent.payload || {})}`,
  ].join("\n");
}

function buildConnectionMessage(address) {
  return [
    "PredictAI wallet connection",
    `Wallet: ${normalizeAddress(address)}`,
    "Purpose: Connect this wallet to your Telegram account.",
  ].join("\n");
}

function typedDataTypesForWallet(typedData) {
  const { EIP712Domain, ...messageTypes } = typedData?.types || {};
  return messageTypes;
}

function usdcToUnits(amount) {
  return parseUnits(Number(amount || 0).toFixed(USDC_DECIMALS), USDC_DECIMALS);
}

function formatUsdcUnits(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  return (Number(value) / 1_000_000).toFixed(2);
}

function hasTelegramSendData() {
  return isTelegramWebApp() && Boolean(window.Telegram?.WebApp?.sendData);
}

function isTelegramWebApp() {
  const webApp = window.Telegram?.WebApp;
  return Boolean(webApp?.initData || window.location.hash.includes("tgWebAppData"));
}

function walletPageUrl() {
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

function WalletConnectControls({ onWalletDetected, onWalletState }) {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, isConnected, status } = useAppKitAccount({ namespace: "eip155" });
  const { chainId, switchNetwork } = useAppKitNetwork();
  const [allowTelegramConnect, setAllowTelegramConnect] = useState(false);
  const isPolygon = Number(chainId) === Number(requiredNetwork.id);
  const shouldUseExternalBrowser = isTelegramWebApp() && !isConnected && !allowTelegramConnect;

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

  function openWalletPageExternally() {
    const url = walletPageUrl();
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url, { try_instant_view: false });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openWalletModal() {
    open({ view: isConnected ? "Account" : "Connect", namespace: "eip155" });
  }

  return (
    <div className="wallet-connect">
      <div className="wallet-intro">
        <p className="label">Choose your wallet</p>
        <p className="status">
          Select MetaMask, Trust Wallet, Coinbase Wallet, Rainbow, or any WalletConnect wallet from the next screen.
        </p>
      </div>

      {shouldUseExternalBrowser ? (
        <div className="browser-route">
          <p className="label">Best on mobile browser</p>
          <p className="status">
            Telegram can block wallet app handoff. Open this same page in your phone browser, then choose your wallet.
          </p>
          <button className="primary" onClick={openWalletPageExternally}>
            Open wallet page
          </button>
          <button className="secondary" onClick={() => setAllowTelegramConnect(true)}>
            Try inside Telegram
          </button>
        </div>
      ) : (
        <div className="wallet-row">
          <div>
            <p className="label">Wallet status</p>
            <p className={isConnected ? "status good" : "status"}>
              {isConnected ? shortAddress(address) : `Status: ${status || "disconnected"}`}
            </p>
          </div>
          <button className="secondary small" onClick={openWalletModal}>
            {isConnected ? "Manage" : "Choose wallet"}
          </button>
        </div>
      )}

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

      {!isConnected ? (
        <p className="helper-text">
          Wallet connection is powered by Reown WalletConnect. PredictAI never receives your private keys.
        </p>
      ) : null}
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

function SignatureButton({ intent, canPrepareSignature, onSigned }) {
  const [signState, setSignState] = useState("idle");
  const [signError, setSignError] = useState("");
  const { signMessageAsync } = useSignMessage();
  const { signTypedDataAsync } = useSignTypedData();
  const typedData = intent.payload?.typed_data;

  async function signIntent() {
    setSignState("signing");
    setSignError("");
    try {
      const signature = typedData
        ? await signTypedDataAsync({
            domain: typedData.domain,
            types: typedDataTypesForWallet(typedData),
            primaryType: typedData.primaryType,
            message: typedData.message,
          })
        : await signMessageAsync({
            message: buildSigningMessage(intent),
          });
      setSignState("submitting");
      const response = await fetch(buildApiUrl(`/trades/signing-intents/${intent.id}/complete`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, typed_data: typedData || null }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Signature submission failed (${response.status})`);
      }
      const data = await response.json();
      if (data.status === "not_found") {
        throw new Error(`Signing intent #${intent.id} was not found.`);
      }
      setSignState("signed");
      onSigned({ ...intent, status: data.status || "SIGNED" });
      if (data.telegram_notified) {
        setSignError("");
      }
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    } catch (error) {
      setSignError(error.message || "Unable to sign this request.");
      setSignState("error");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("error");
    }
  }

  return (
    <>
      {signError ? <p className="status warning-text">{signError}</p> : null}
      {signState === "signed" || intent.status === "SIGNED" ? (
        <p className="status good">Typed order intent verified. Return to Telegram for the next update.</p>
      ) : null}

      <button className="primary" disabled={!canPrepareSignature || signState === "signing" || signState === "submitting"} onClick={signIntent}>
        {signState === "signing" ? "Opening wallet..." : signState === "submitting" ? "Submitting..." : "Sign request"}
      </button>
    </>
  );
}

function ApprovalPanel({ intent, walletState, onApprovalReady }) {
  const approval = intent.approval || {};
  const requiredAmount = approval.required_usdc || intent.payload?.amount_usdc || 0;
  const requiredUnits = usdcToUnits(requiredAmount);
  const hasApprovalConfig = isAddress(approval.token_address) && isAddress(approval.spender);
  const [approvalError, setApprovalError] = useState("");
  const { data: allowance, refetch } = useReadContract({
    address: approval.token_address,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [walletState.address, approval.spender],
    query: {
      enabled: hasApprovalConfig && walletState.isConnected && walletState.isPolygon && isAddress(walletState.address),
    },
  });
  const {
    data: approvalHash,
    isPending: isApprovalOpening,
    writeContractAsync,
  } = useWriteContract();
  const {
    isLoading: isApprovalConfirming,
    isSuccess: isApprovalConfirmed,
  } = useWaitForTransactionReceipt({
    hash: approvalHash,
    query: { enabled: Boolean(approvalHash) },
  });
  const allowanceReady = typeof allowance === "bigint" && allowance >= requiredUnits;

  useEffect(() => {
    onApprovalReady(allowanceReady || isApprovalConfirmed);
  }, [allowanceReady, isApprovalConfirmed, onApprovalReady]);

  useEffect(() => {
    if (isApprovalConfirmed) {
      refetch?.();
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    }
  }, [isApprovalConfirmed, refetch]);

  async function approveUsdc() {
    setApprovalError("");
    try {
      await writeContractAsync({
        address: approval.token_address,
        abi: USDC_ABI,
        functionName: "approve",
        args: [approval.spender, requiredUnits],
      });
    } catch (error) {
      setApprovalError(error.message || "Unable to approve USDC.");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("error");
    }
  }

  if (!hasApprovalConfig) {
    return <p className="status warning-text">USDC approval is not configured for this signing request.</p>;
  }

  return (
    <div className={allowanceReady || isApprovalConfirmed ? "approval-card ready" : "approval-card"}>
      <p className="label">USDC approval</p>
      <p className="status">
        Required: {Number(requiredAmount).toFixed(2)} USDC / Allowance: {formatUsdcUnits(allowance)}
      </p>
      <p className="status">Spender: {shortAddress(approval.spender)}</p>
      {allowanceReady || isApprovalConfirmed ? (
        <p className="status good">USDC allowance is ready. You can sign the order.</p>
      ) : (
        <>
          <p className="status warning-text">Approve USDC first so Polymarket can settle this order.</p>
          {approvalError ? <p className="status warning-text">{approvalError}</p> : null}
          <button
            className="primary"
            disabled={!walletState.isConnected || !walletState.isPolygon || isApprovalOpening || isApprovalConfirming}
            onClick={approveUsdc}
          >
            {isApprovalOpening ? "Opening wallet..." : isApprovalConfirming ? "Waiting for approval..." : "Approve USDC"}
          </button>
        </>
      )}
    </div>
  );
}

function SigningIntentCard({ intentId, intent, loadState, loadError, walletState, onSigned }) {
  const [approvalReady, setApprovalReady] = useState(false);

  useEffect(() => {
    setApprovalReady(!intent?.approval?.needs_approval);
  }, [intent?.id, intent?.approval?.needs_approval]);

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
  const canPrepareSignature = walletMatches && walletState.isPolygon && intent.status === "PENDING" && approvalReady;
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
      {walletMatches && walletState.isPolygon && intent.status === "PENDING" ? (
        <ApprovalPanel intent={intent} walletState={walletState} onApprovalReady={setApprovalReady} />
      ) : null}

      {walletConnectProjectId ? (
        <SignatureButton intent={intent} canPrepareSignature={canPrepareSignature} onSigned={onSigned} />
      ) : null}
    </div>
  );
}

function ConnectionProofButton({ walletState, proof, onProofReady }) {
  const [proofState, setProofState] = useState("idle");
  const [proofError, setProofError] = useState("");
  const { signMessageAsync } = useSignMessage();
  const canSignConnection = walletState.isConnected && walletState.isPolygon && isAddress(walletState.address);

  useEffect(() => {
    if (proof.address && normalizeAddress(proof.address) !== normalizeAddress(walletState.address)) {
      onProofReady({ address: "", message: "", signature: "" });
      setProofState("idle");
    }
  }, [onProofReady, proof.address, walletState.address]);

  async function signConnection() {
    setProofState("signing");
    setProofError("");
    try {
      const message = buildConnectionMessage(walletState.address);
      const signature = await signMessageAsync({ message });
      onProofReady({ address: walletState.address, message, signature });
      setProofState("signed");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    } catch (error) {
      setProofError(error.message || "Unable to sign wallet connection.");
      setProofState("error");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("error");
    }
  }

  if (!walletConnectProjectId) {
    return null;
  }

  return (
    <div className="signing-card">
      <p className="label">Connection signature</p>
      <p className="status">
        {proof.signature ? "Wallet ownership confirmed." : "Sign a connection message before sending this wallet to Telegram."}
      </p>
      {proofError ? <p className="status warning-text">{proofError}</p> : null}
      <button className="primary" disabled={!canSignConnection || proofState === "signing"} onClick={signConnection}>
        {proofState === "signing" ? "Opening wallet..." : proof.signature ? "Sign again" : "Sign wallet connection"}
      </button>
    </div>
  );
}

function App() {
  const [status, setStatus] = useState("Ready");
  const [intentId] = useState(getIntentId);
  const [telegramId] = useState(getTelegramId);
  const [intent, setIntent] = useState(null);
  const [intentLoadState, setIntentLoadState] = useState(intentId ? "loading" : "idle");
  const [intentLoadError, setIntentLoadError] = useState("");
  const [walletState, setWalletState] = useState({
    address: "",
    chainId: null,
    isConnected: false,
    isPolygon: false,
  });
  const [connectionProof, setConnectionProof] = useState({
    address: "",
    message: "",
    signature: "",
  });
  const handleWalletDetected = useCallback((wallet) => {
    setStatus(`WalletConnect account ready: ${shortAddress(wallet)}.`);
  }, []);
  const handleWalletState = useCallback((nextWalletState) => {
    setWalletState(nextWalletState);
  }, []);

  useEffect(() => {
    if (isTelegramWebApp()) {
      window.Telegram?.WebApp?.ready();
      window.Telegram?.WebApp?.expand();
    }
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
    if (!intentId && !connectionProof.signature) {
      setStatus("Sign the wallet connection first.");
      return;
    }

    const payload = JSON.stringify({
      type: "wallet_connected",
      address: walletState.address,
      connection_message: connectionProof.message,
      connection_signature: connectionProof.signature,
    });

    if (telegramId && apiBaseUrl) {
      sendWalletViaApi();
      return;
    }

    if (hasTelegramSendData()) {
      window.Telegram.WebApp.sendData(payload);
      window.Telegram.WebApp.close();
      return;
    }

    sendWalletViaApi();
  }

  async function sendWalletViaApi() {
    if (!apiBaseUrl) {
      setStatus("API URL is missing. Open this page from the bot's /connect button.");
      return;
    }
    if (!telegramId) {
      setStatus("Telegram account is missing. Reopen this page from the bot's /connect button.");
      return;
    }

    setStatus("Sending wallet to Telegram...");
    try {
      const response = await fetch(buildApiUrl("/wallet/connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: Number(telegramId),
          address: walletState.address,
          connection_message: connectionProof.message,
          connection_signature: connectionProof.signature,
        }),
      });
      if (!response.ok) {
        throw new Error(`Wallet connect failed (${response.status})`);
      }
      const data = await response.json();
      if (data.status !== "connected") {
        throw new Error(data.message || "Wallet connect was rejected.");
      }
      setStatus("Wallet sent to Telegram. Return to the bot.");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    } catch (error) {
      setStatus(error.message || "Unable to send wallet to Telegram.");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("error");
    }
  }

  return (
    <main className="wallet-app">
      <section className="panel">
        <div className="brand-mark">P</div>
        <p className="eyebrow">PredictAI wallet</p>
        <h1>{intentId ? "Review signing request" : "Connect your wallet"}</h1>
        <p className="copy">
          Choose any Polygon-compatible wallet. PredictAI only asks you to prove ownership and approve requests in your wallet.
        </p>

        <SigningIntentCard
          intentId={intentId}
          intent={intent}
          loadState={intentLoadState}
          loadError={intentLoadError}
          walletState={walletState}
          onSigned={setIntent}
        />

        <WalletConnectPanel onWalletDetected={handleWalletDetected} onWalletState={handleWalletState} />

        {!intentId ? (
          <ConnectionProofButton walletState={walletState} proof={connectionProof} onProofReady={setConnectionProof} />
        ) : null}

        <button
          className="primary"
          disabled={!walletState.isConnected || !walletState.isPolygon || (!intentId && !connectionProof.signature)}
          onClick={sendWallet}
        >
          Send to Telegram
        </button>

        {!intentId && !hasTelegramSendData() ? (
          <button
            className="secondary"
            disabled={!walletState.isConnected || !walletState.isPolygon || !connectionProof.signature}
            onClick={sendWalletViaApi}
          >
            Send through API
          </button>
        ) : null}

        <p className={walletState.isConnected && walletState.isPolygon ? "status good" : "status"}>{status}</p>
        {!intentId ? (
          <p className="helper-text">After sending, return to Telegram to continue trading from chat.</p>
        ) : null}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <AppKitProvider>
    <App />
  </AppKitProvider>,
);
