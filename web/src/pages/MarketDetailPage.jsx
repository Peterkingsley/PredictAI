import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAppKit, useAppKitAccount, useAppKitNetwork, useDisconnect } from "@reown/appkit/react";
import { useReadContract, useSignTypedData, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { requiredNetwork, walletConnectProjectId } from "../lib/wallet.jsx";

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

const LADDER_ROWS = [0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15, 0.05];
const GRID_COLUMNS = 12;

function shortAddress(value) {
  if (!value) return "";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function usdcToUnits(amount) {
  return parseUnits(Number(amount || 0).toFixed(USDC_DECIMALS), USDC_DECIMALS);
}

function typedDataTypesForWallet(typedData) {
  const { EIP712Domain, ...messageTypes } = typedData?.types || {};
  return messageTypes;
}

function formatCompact(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000) return `$${(number / 1_000_000).toFixed(1)}M`;
  if (number >= 1_000) return `$${(number / 1_000).toFixed(1)}K`;
  return `$${number.toFixed(0)}`;
}

function buildPath(values) {
  if (!values.length) return "";
  const points = values.length === 1 ? [values[0], values[0]] : values;
  return points
    .map((value, index) => {
      const x = points.length === 1 ? 100 : (index / (points.length - 1)) * 100;
      const y = 100 - Math.max(2, Math.min(98, Number(value || 0) * 100));
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function ProbabilityBoard({ market, sessionPrices }) {
  const current = Math.max(0.01, Math.min(0.99, Number(market.yes_price || 0.5)));
  const currentRow = LADDER_ROWS.reduce((best, row) => Math.abs(row - current) < Math.abs(best - current) ? row : best, LADDER_ROWS[0]);
  const currentRowIndex = LADDER_ROWS.indexOf(currentRow);
  const currentY = 100 - current * 100;
  const linePoints = buildPath(sessionPrices);

  const timeLabels = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const secondsAgo = (6 - index) * 10;
      const time = new Date(now.getTime() - secondsAgo * 1000);
      return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    });
  }, [sessionPrices.length]);

  return (
    <div className="probability-board">
      <div className="board-vignette" />
      <div className="ladder-grid" aria-hidden="true">
        {LADDER_ROWS.flatMap((row, rowIndex) =>
          Array.from({ length: GRID_COLUMNS }, (_, columnIndex) => {
            const multiplier = 1 / row;
            const isCurrent = rowIndex === currentRowIndex && columnIndex === GRID_COLUMNS - 2;
            return (
              <div className={`ladder-cell ${isCurrent ? "current" : ""}`} key={`${row}-${columnIndex}`}>
                <span>{multiplier >= 10 ? multiplier.toFixed(1) : multiplier.toFixed(2)}x</span>
              </div>
            );
          }),
        )}
      </div>

      <svg className="session-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="YES probability observed since this board was opened">
        <defs>
          <linearGradient id="pulseGradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#ff4aa2" />
            <stop offset="100%" stopColor="#fff2fb" />
          </linearGradient>
          <filter id="pulseGlow"><feGaussianBlur stdDeviation="1.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <polyline points={linePoints} fill="none" stroke="url(#pulseGradient)" strokeWidth="0.55" vectorEffect="non-scaling-stroke" filter="url(#pulseGlow)" />
      </svg>

      <div className="current-probability-line" style={{ top: `${currentY}%` }}>
        <span className="current-probability-pill">YES {Math.round(current * 100)}¢</span>
      </div>

      <div className="price-axis" aria-hidden="true">
        {LADDER_ROWS.map((row) => <span key={row} style={{ top: `${100 - row * 100}%` }}>{Math.round(row * 100)}¢</span>)}
      </div>

      <div className="time-axis" aria-hidden="true">
        {timeLabels.map((label) => <span key={label}>{label}</span>)}
      </div>

      <div className="board-caption">IMPLIED YES PAYOUT LADDER · LIVE SESSION PROBABILITY</div>
    </div>
  );
}

function WalletButton() {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { chainId, switchNetwork } = useAppKitNetwork();
  const isPolygon = Number(chainId) === Number(requiredNetwork.id);

  if (!walletConnectProjectId) return <span className="trade-warning">WalletConnect not configured</span>;
  if (!isConnected) return <button className="wallet-compact" onClick={() => open({ view: "Connect", namespace: "eip155" })}>Connect wallet</button>;
  return (
    <button className="wallet-compact connected" onClick={() => (isPolygon ? disconnect() : switchNetwork(requiredNetwork))}>
      {isPolygon ? shortAddress(address) : "Switch to Polygon"}
    </button>
  );
}

function TradeDock({ market }) {
  const { user } = useAuth();
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { chainId } = useAppKitNetwork();
  const isPolygon = Number(chainId) === Number(requiredNetwork.id);
  const [side, setSide] = useState("YES");
  const [amount, setAmount] = useState("10");
  const [intent, setIntent] = useState(null);
  const [stage, setStage] = useState("idle");
  const [message, setMessage] = useState("");

  const { signTypedDataAsync } = useSignTypedData();
  const approval = intent?.approval;
  const requiredUnits = usdcToUnits(approval?.required_usdc || 0);
  const hasApprovalConfig = Boolean(approval?.token_address && approval?.spender);
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: approval?.token_address,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [address, approval?.spender],
    query: { enabled: Boolean(hasApprovalConfig && isConnected && isPolygon && address) },
  });
  const { data: approvalHash, isPending: isApprovalOpening, writeContractAsync } = useWriteContract();
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: approvalHash,
    query: { enabled: Boolean(approvalHash) },
  });
  const allowanceReady = (typeof allowance === "bigint" && allowance >= requiredUnits) || isApprovalConfirmed;

  useEffect(() => {
    if (isApprovalConfirmed) refetchAllowance?.();
  }, [isApprovalConfirmed, refetchAllowance]);

  async function prepareOrder() {
    setMessage("");
    setIntent(null);
    if (!user) return setMessage("Sign in to trade.");
    if (!isConnected || !isPolygon) return setMessage("Connect a Polygon wallet first.");
    setStage("preparing");
    try {
      const data = await apiFetch("/web-trades/signing-intents", {
        method: "POST",
        auth: true,
        body: { market_id: market.id, side, amount_usdc: Number(amount), wallet_address: address },
      });
      setIntent(data);
      setStage("ready");
    } catch (err) {
      setMessage(err.message || "Unable to prepare this order.");
      setStage("idle");
    }
  }

  async function approveUsdc() {
    setMessage("");
    try {
      await writeContractAsync({
        address: approval.token_address,
        abi: USDC_ABI,
        functionName: "approve",
        args: [approval.spender, requiredUnits],
      });
    } catch (err) {
      setMessage(err.message || "USDC approval failed.");
    }
  }

  async function signAndSubmit() {
    if (!intent) return;
    setStage("signing");
    setMessage("");
    try {
      const typedData = intent.payload?.typed_data;
      const signature = await signTypedDataAsync({
        domain: typedData.domain,
        types: typedDataTypesForWallet(typedData),
        primaryType: typedData.primaryType,
        message: typedData.message,
      });
      setStage("submitting");
      const data = await apiFetch(`/web-trades/signing-intents/${intent.id}/complete`, {
        method: "POST",
        auth: true,
        body: { signature, typed_data: typedData },
      });
      setStage("done");
      setMessage(`Order ${data.order_submission?.status || data.status}. ${data.order_submission?.message || ""}`);
    } catch (err) {
      setMessage(err.message || "Unable to sign or submit this order.");
      setStage("ready");
    }
  }

  const yesPrice = Number(market.yes_price || 0);
  const noPrice = Number(market.no_price || 0);
  const price = side === "YES" ? yesPrice : noPrice;
  const estimatedShares = price > 0 ? Number(amount || 0) / price : 0;
  const multiplier = price > 0 ? 1 / price : 0;

  return (
    <div className="trade-dock-wrap">
      <div className="trade-dock">
        <div className="trade-sides">
          <button className={side === "YES" ? "selected yes" : ""} onClick={() => { setSide("YES"); setIntent(null); }}>
            <span>YES</span><strong>{Math.round(yesPrice * 100)}¢</strong><small>{yesPrice > 0 ? `${(1 / yesPrice).toFixed(2)}x` : "—"}</small>
          </button>
          <button className={side === "NO" ? "selected no" : ""} onClick={() => { setSide("NO"); setIntent(null); }}>
            <span>NO</span><strong>{Math.round(noPrice * 100)}¢</strong><small>{noPrice > 0 ? `${(1 / noPrice).toFixed(2)}x` : "—"}</small>
          </button>
        </div>

        <label className="stake-box">
          <span>STAKE</span>
          <div><b>$</b><input type="number" min="1" value={amount} onChange={(event) => { setAmount(event.target.value); setIntent(null); }} /></div>
        </label>

        <div className="trade-estimate">
          <span>Estimated shares</span><strong>{estimatedShares.toFixed(2)}</strong>
          <span>Implied payout</span><strong>{multiplier.toFixed(2)}x</strong>
        </div>

        <WalletButton />

        {!intent ? (
          <button className="execute-trade" disabled={stage === "preparing"} onClick={prepareOrder}>
            {stage === "preparing" ? "Preparing…" : `Review ${side} order`}
          </button>
        ) : hasApprovalConfig && approval.needs_approval && !allowanceReady ? (
          <button className="execute-trade approval" disabled={isApprovalOpening || isApprovalConfirming} onClick={approveUsdc}>
            {isApprovalOpening ? "Opening wallet…" : isApprovalConfirming ? "Confirming…" : "Approve USDC"}
          </button>
        ) : (
          <button className="execute-trade" disabled={stage === "signing" || stage === "submitting" || stage === "done"} onClick={signAndSubmit}>
            {stage === "signing" ? "Opening wallet…" : stage === "submitting" ? "Submitting…" : stage === "done" ? "Submitted" : "Sign & submit"}
          </button>
        )}
      </div>
      {message ? <div className={`trade-message ${stage === "done" ? "good" : ""}`}>{message}</div> : null}
    </div>
  );
}

export default function MarketDetailPage() {
  const { marketId } = useParams();
  const [market, setMarket] = useState(null);
  const [error, setError] = useState("");
  const [sessionPrices, setSessionPrices] = useState([]);

  useEffect(() => {
    let ignore = false;
    let timer;
    async function load() {
      try {
        const data = await apiFetch(`/markets/${encodeURIComponent(marketId)}`);
        if (ignore) return;
        setMarket(data);
        const next = Number(data.yes_price || 0.5);
        setSessionPrices((current) => [...current, next].slice(-40));
        setError("");
      } catch (err) {
        if (!ignore) setError(err.message || "Market not found.");
      }
    }
    load();
    timer = setInterval(load, 5000);
    return () => { ignore = true; clearInterval(timer); };
  }, [marketId]);

  const endLabel = useMemo(() => {
    if (!market?.end_date) return "No end date";
    try { return new Date(market.end_date).toLocaleDateString(); }
    catch { return market.end_date; }
  }, [market]);

  if (error && !market) return <div className="trade-stage"><div className="trade-center-message">{error}</div></div>;
  if (!market) return <div className="trade-stage"><div className="trade-center-message">Loading market board…</div></div>;

  return (
    <div className="trade-stage">
      <div className="market-floating-header">
        <Link to="/" className="market-selector-chip" title="Choose another market">
          <span className="market-symbol">P</span>
          <div><small>{market.category || "Prediction market"}</small><strong>{market.question}</strong></div>
          <span className="chevron">⌄</span>
        </Link>
        <div className="market-mini-stats">
          <span><small>YES</small><strong>{Math.round(Number(market.yes_price || 0) * 100)}¢</strong></span>
          <span><small>NO</small><strong>{Math.round(Number(market.no_price || 0) * 100)}¢</strong></span>
          <span><small>VOLUME</small><strong>{formatCompact(market.volume)}</strong></span>
          <span><small>ENDS</small><strong>{endLabel}</strong></span>
        </div>
      </div>

      <ProbabilityBoard market={market} sessionPrices={sessionPrices} />
      <TradeDock market={market} />
    </div>
  );
}
