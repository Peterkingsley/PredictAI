import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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

function WalletBar() {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAppKitAccount({ namespace: "eip155" });
  const { chainId, switchNetwork } = useAppKitNetwork();
  const isPolygon = Number(chainId) === Number(requiredNetwork.id);

  if (!walletConnectProjectId) {
    return <p className="status-text warn">Set VITE_WALLETCONNECT_PROJECT_ID to enable wallet connections.</p>;
  }

  return (
    <div className="field">
      <label>Wallet</label>
      {isConnected ? (
        <div className="side-toggle">
          <button className="active yes" disabled>
            {shortAddress(address)}
          </button>
          <button onClick={() => (isPolygon ? disconnect() : switchNetwork(requiredNetwork))}>
            {isPolygon ? "Disconnect" : "Switch to Polygon"}
          </button>
        </div>
      ) : (
        <button className="primary" onClick={() => open({ view: "Connect", namespace: "eip155" })}>
          Connect wallet
        </button>
      )}
    </div>
  );
}

function TradePanel({ market }) {
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
    if (isApprovalConfirmed) {
      refetchAllowance?.();
    }
  }, [isApprovalConfirmed, refetchAllowance]);

  async function prepareOrder() {
    setMessage("");
    if (!user) {
      setMessage("Sign in to trade.");
      return;
    }
    if (!isConnected || !isPolygon) {
      setMessage("Connect a Polygon wallet first.");
      return;
    }
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

  const price = side === "YES" ? market.yes_price : market.no_price;
  const estimatedShares = price > 0 ? Number(amount || 0) / price : 0;

  return (
    <div className="panel">
      <h3>Trade</h3>
      {!user ? <p className="status-text">Sign in and connect a wallet to place an order.</p> : null}

      <div className="side-toggle">
        <button className={side === "YES" ? "active yes" : ""} onClick={() => setSide("YES")}>
          Buy Yes ${market.yes_price?.toFixed(2)}
        </button>
        <button className={side === "NO" ? "active no" : ""} onClick={() => setSide("NO")}>
          Buy No ${market.no_price?.toFixed(2)}
        </button>
      </div>

      <div className="field">
        <label>Amount (USDC)</label>
        <input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </div>
      <p className="status-text">Estimated shares: {estimatedShares.toFixed(2)}</p>

      <WalletBar />

      {!intent ? (
        <button className="primary" disabled={stage === "preparing"} onClick={prepareOrder}>
          {stage === "preparing" ? "Preparing..." : "Review order"}
        </button>
      ) : (
        <>
          {hasApprovalConfig && approval.needs_approval && !allowanceReady ? (
            <div className="field">
              <label>USDC approval required</label>
              <button className="secondary" disabled={isApprovalOpening || isApprovalConfirming} onClick={approveUsdc}>
                {isApprovalOpening ? "Opening wallet..." : isApprovalConfirming ? "Confirming..." : "Approve USDC"}
              </button>
            </div>
          ) : null}
          <button
            className="primary"
            disabled={
              (hasApprovalConfig && approval.needs_approval && !allowanceReady) ||
              stage === "signing" ||
              stage === "submitting" ||
              stage === "done"
            }
            onClick={signAndSubmit}
          >
            {stage === "signing" ? "Opening wallet..." : stage === "submitting" ? "Submitting..." : stage === "done" ? "Submitted" : "Sign & submit"}
          </button>
        </>
      )}

      {message ? <p className={`status-text ${stage === "done" ? "good" : ""}`}>{message}</p> : null}
    </div>
  );
}

export default function MarketDetailPage() {
  const { marketId } = useParams();
  const [market, setMarket] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    apiFetch(`/markets/${encodeURIComponent(marketId)}`)
      .then((data) => {
        if (!ignore) setMarket(data);
      })
      .catch((err) => {
        if (!ignore) setError(err.message || "Market not found.");
      });
    return () => {
      ignore = true;
    };
  }, [marketId]);

  const endLabel = useMemo(() => {
    if (!market?.end_date) return "No end date";
    try {
      return new Date(market.end_date).toLocaleDateString();
    } catch {
      return market.end_date;
    }
  }, [market]);

  if (error) {
    return <div className="empty-state">{error}</div>;
  }
  if (!market) {
    return <p className="status-text">Loading market...</p>;
  }

  return (
    <div className="grid-2">
      <div>
        <div className="panel">
          <span className="category">{market.category}</span>
          <h1>{market.question}</h1>
          <div className="odds-row">
            <span className="odds-pill yes">Yes {Math.round(market.yes_price * 100)}%</span>
            <span className="odds-pill no">No {Math.round(market.no_price * 100)}%</span>
          </div>
          <div className="meta-row">
            <span>Volume ${Number(market.volume || 0).toLocaleString()}</span>
            <span>Ends {endLabel}</span>
          </div>
        </div>
      </div>
      <TradePanel market={market} />
    </div>
  );
}
