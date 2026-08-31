import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Camera,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Copy,
  Download,
  FileClock,
  Link2,
  LockKeyhole,
  QrCode,
  ScanLine,
  Settings,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Avatar,
  Button,
  Empty,
  IconButton,
  Modal,
  PageHeader,
  Toggle,
} from "../components/ui";
import { defaultWalletSettings, depositAddresses } from "../services/data";
import { useApp } from "../store/AppStore";
import type { Network, WalletSettings } from "../types";
import { copyText } from "../utils/browser";

const networks: Network[] = ["Ethereum", "Polygon", "Arbitrum", "Base"];
const fees: Record<Network, number> = {
  Ethereum: 3.5,
  Polygon: 0.1,
  Arbitrum: 0.2,
  Base: 0.15,
};
const evm = /^0x[a-fA-F0-9]{40}$/;

export function AssetsHome() {
  const { wallet } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Positions");
  const balance = wallet.hideBalances
    ? "••••••"
    : wallet.currency === "NGN"
      ? "₦0.00"
      : wallet.currency === "USDC"
        ? "0.00 USDC"
        : "$0.00";
  return (
    <div className="page">
      <PageHeader
        title="Assets"
        description="Manage prediction funds, public performance, and transaction preferences."
        action={
          <Button
            variant="secondary"
            onClick={() => navigate("/app/assets/settings")}
          >
            <Settings /> Wallet settings
          </Button>
        }
      />
      <section className="asset-balance-card">
        <div>
          <span>Total balance</span>
          <strong>{balance}</strong>
          <small>
            Across{" "}
            {Object.values(wallet.supportedAssets).filter(Boolean).length}{" "}
            enabled assets
          </small>
        </div>
        <div className="asset-actions">
          <Button onClick={() => navigate("/app/assets/deposit")}>
            <ArrowDownToLine /> Deposit
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/app/assets/withdraw")}
          >
            <ArrowUpFromLine /> Withdraw
          </Button>
          <IconButton
            label="Scan withdrawal address"
            onClick={() => navigate("/app/assets/scan")}
          >
            <QrCode />
          </IconButton>
        </div>
      </section>
      <section className="performance-grid">
        <Metric label="Unrealized P&amp;L" value="$0.00 (0%)" />
        <Metric label="Today’s realized P&amp;L" value="$0.00 (0%)" />
        <Metric label="Position value" value="$0.00" />
      </section>
      <div className="assets-layout">
        <section className="content-card positions">
          <div className="section-heading">
            <div>
              <h2>Positions</h2>
              <p>Your active prediction positions.</p>
            </div>
            <div className="tabs small">
              {["Positions", "Orders", "Filled"].map((tab) => (
                <button
                  className={activeTab === tab ? "active" : ""}
                  onClick={() => setActiveTab(tab)}
                  key={tab}
                >
                  {tab}{tab === "Positions" ? " (0)" : ""}
                </button>
              ))}
            </div>
          </div>
          <Empty
            icon={WalletCards}
            title={`No ${activeTab.toLowerCase()} yet`}
            description={`${activeTab} matching your wallet will appear here.`}
            action={
              <Link className="button button--primary" to="/app/predict">
                Explore events
              </Link>
            }
          />
        </section>
        <aside>
          <Link className="asset-link-card" to="/app/posts/portfolio/new">
            <PieIcon />
            <span>
              <strong>Share public portfolio</strong>
              <small>
                Choose exactly which performance and positions appear in Posts.
              </small>
            </span>
          </Link>
          <Link className="asset-link-card" to="/app/assets/history">
            <FileClock />
            <span>
              <strong>Funds history</strong>
              <small>Review deposits, withdrawals, and predictions.</small>
            </span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>Current period</small>
    </div>
  );
}
function PieIcon() {
  return <CircleDollarSign />;
}

export function DepositPage() {
  const { wallet, toast } = useApp();
  const navigate = useNavigate();
  const enabled = (["USDC", "USDT"] as const).filter(
    (a) => wallet.supportedAssets[a],
  );
  const [asset, setAsset] = useState<"USDC" | "USDT">(enabled[0] || "USDC");
  const [network, setNetwork] = useState<Network>(wallet.defaultNetwork);
  const address = depositAddresses[network];
  const copy = () =>
    void copyText(address).then(() =>
      toast("Deposit address copied", "success"),
    );
  return (
    <div className="page narrow-page">
      <Button variant="ghost" onClick={() => navigate("/app/assets")}>
        <ChevronLeft /> Back to assets
      </Button>
      <PageHeader
        eyebrow="Fund your wallet"
        title="Deposit"
        description="Select the exact asset and network before sending funds."
      />
      <section className="form-card">
        <fieldset>
          <legend>Deposit asset</legend>
          <div className="asset-choices">
            {enabled.map((a) => (
              <button
                className={asset === a ? "active" : ""}
                onClick={() => setAsset(a)}
                key={a}
              >
                <span className={`stablecoin ${a.toLowerCase()}`}>$</span>
                <strong>{a}</strong>
                {asset === a && <Check />}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Select network</legend>
          <div className="chip-row">
            {networks.map((n) => (
              <button
                className={network === n ? "active" : ""}
                onClick={() => setNetwork(n)}
                key={n}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="deposit-address">
          <div className="qr-art" aria-label="QR code placeholder">
            <QrCode />
          </div>
          <span>{asset} deposit address</span>
          <small>Network: {network}</small>
          <code>{address}</code>
          <Button onClick={copy}>
            <Copy /> Copy address
          </Button>
        </div>
        <div className="warning">
          Only send {asset} using the {network} network. Sending another asset
          or using another network may permanently lose your funds.
        </div>
      </section>
    </div>
  );
}

export function WithdrawPage() {
  const { wallet, toast } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const enabled = (["USDC", "USDT"] as const).filter(
    (a) => wallet.supportedAssets[a],
  );
  const [asset, setAsset] = useState<"USDC" | "USDT">(enabled[0] || "USDC");
  const [network, setNetwork] = useState<Network>(
    (params.get("network") as Network) || wallet.defaultNetwork,
  );
  const [address, setAddress] = useState(params.get("address") || "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<
    "idle" | "confirm" | "processing" | "success"
  >("idle");
  const fee = fees[network] * (wallet.feeSpeed === "Fast" ? 1.35 : 1);
  const numeric = Number(amount) || 0;
  const submit = () => {
    if (!evm.test(address)) {
      setError("Enter a valid EVM wallet address.");
      return;
    }
    if (numeric <= fee) {
      setError(
        `Amount must be greater than the ${fee.toFixed(2)} ${asset} estimated fee.`,
      );
      return;
    }
    if (
      Number(wallet.withdrawalLimit) > 0 &&
      numeric > Number(wallet.withdrawalLimit)
    ) {
      setError(
        `Amount exceeds your ${wallet.withdrawalLimit} USDC daily withdrawal limit.`,
      );
      return;
    }
    setError("");
    setStep("confirm");
  };
  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => setStep("success"), 1600);
    return () => clearTimeout(timer);
  }, [step]);
  return (
    <div className="page narrow-page">
      <Button variant="ghost" onClick={() => navigate("/app/assets")}>
        <ChevronLeft /> Back to assets
      </Button>
      <PageHeader
        eyebrow="Send funds"
        title="Withdraw"
        description="Review the address, network, amount, and fee before confirming."
      />
      <section className="form-card">
        <fieldset>
          <legend>Receive funds as</legend>
          <div className="asset-choices">
            {enabled.map((a) => (
              <button
                className={asset === a ? "active" : ""}
                onClick={() => setAsset(a)}
                key={a}
              >
                <span className={`stablecoin ${a.toLowerCase()}`}>$</span>
                <strong>{a}</strong>
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          Network
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as Network)}
          >
            {networks.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Wallet address
          <div className="field-action">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={`Paste ${network} address`}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/app/assets/scan")}
            >
              <ScanLine /> Scan
            </Button>
          </div>
        </label>
        <label>
          Amount
          <div className="amount-field">
            <input
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^0-9.]/g, ""))
              }
              placeholder="0.00"
            />
            <span>{asset}</span>
            <button type="button" onClick={() => setAmount("0")}>
              MAX
            </button>
          </div>
        </label>
        <div className="summary-list">
          <span>
            Network <strong>{network}</strong>
          </span>
          <span>
            Estimated network fee{" "}
            <strong>
              {fee.toFixed(2)} {asset}
            </strong>
          </span>
          <span>
            You receive{" "}
            <strong>
              {Math.max(0, numeric - fee).toFixed(2)} {asset}
            </strong>
          </span>
        </div>
        {wallet.requireBiometrics && (
          <div className="capability-note">
            <LockKeyhole />
            <span>
              <strong>Passkey approval enabled</strong>
              <small>
                Secure device approval is capability-aware and will be requested
                when a production challenge is connected.
              </small>
            </span>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <Button onClick={submit}>Review withdrawal</Button>
      </section>
      <Modal
        open={step !== "idle"}
        title={step === "confirm" ? "Confirm withdrawal" : undefined}
        onClose={() => step === "confirm" && setStep("idle")}
      >
        {step === "confirm" && (
          <div className="trade-ticket">
            <div className="confirm-icon">
              <ShieldCheck />
            </div>
            <div className="summary-list">
              <span>
                Send{" "}
                <strong>
                  {numeric.toFixed(2)} {asset}
                </strong>
              </span>
              <span>
                Network <strong>{network}</strong>
              </span>
              <span>
                To <strong className="truncate">{address}</strong>
              </span>
              <span>
                Recipient receives{" "}
                <strong>
                  {Math.max(0, numeric - fee).toFixed(2)} {asset}
                </strong>
              </span>
            </div>
            <div className="button-row">
              <Button variant="secondary" onClick={() => setStep("idle")}>
                Cancel
              </Button>
              <Button onClick={() => setStep("processing")}>
                Confirm withdrawal
              </Button>
            </div>
          </div>
        )}
        {step === "processing" && (
          <div className="success-panel">
            <span className="spinner" />
            <h2>Processing withdrawal</h2>
            <p>Checking the transaction details and preparing your transfer.</p>
          </div>
        )}
        {step === "success" && (
          <div className="success-panel">
            <span className="success-icon">
              <Check />
            </span>
            <h2>Withdrawal submitted</h2>
            <p>
              Your transfer is processing on {network}. You’ll receive a status
              notification.
            </p>
            <Button
              onClick={() => {
                toast("Withdrawal submitted", "success");
                navigate("/app/assets/history");
              }}
            >
              View transaction history
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function ScannerPage() {
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<
    "idle" | "requesting" | "active" | "denied" | "unsupported"
  >("idle");
  const [manual, setManual] = useState("");
  const [network, setNetwork] = useState<Network>("Polygon");
  const [error, setError] = useState("");
  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stop, []);
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setStatus("requesting");
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.current = next;
      if (video.current) video.current.srcObject = next;
      setStatus("active");
    } catch {
      setStatus("denied");
    }
  };
  const use = () => {
    if (!evm.test(manual.trim())) {
      setError("Enter a valid 42-character EVM address.");
      return;
    }
    stop();
    navigate(
      `/app/assets/withdraw?address=${encodeURIComponent(manual.trim())}&network=${network}`,
    );
  };
  return (
    <div className="page narrow-page">
      <Button variant="ghost" onClick={() => navigate("/app/assets")}>
        <ChevronLeft /> Back to assets
      </Button>
      <PageHeader
        eyebrow="Withdrawal tool"
        title="Scan wallet address"
        description="Use your camera for a QR preview, or enter the address manually."
      />
      <section className="scanner-card">
        <div className={`camera-preview ${status}`}>
          <video ref={video} autoPlay playsInline muted />
          <div className="scan-frame">
            <span />
            <span />
            <span />
            <span />
          </div>
          {status !== "active" && (
            <div className="camera-message">
              <Camera />
              <h3>
                {status === "denied"
                  ? "Camera access blocked"
                  : status === "unsupported"
                    ? "Camera unavailable"
                    : "Scan a wallet QR code"}
              </h3>
              <p>
                {status === "denied"
                  ? "Allow camera access in browser settings or use manual entry."
                  : "PredictAI only accesses the camera while this page is open."}
              </p>
              <Button onClick={start} disabled={status === "requesting"}>
                {status === "requesting"
                  ? "Requesting access…"
                  : "Enable camera preview"}
              </Button>
            </div>
          )}
        </div>
        <div className="manual-address">
          <h2>Enter manually</h2>
          <label>
            Network
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as Network)}
            >
              {networks.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Wallet address
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="0x…"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <Button onClick={use}>Use address</Button>
          <p className="fine-print">
            Automatic decoding depends on browser QR capabilities. Manual entry
            remains available on every supported desktop.
          </p>
        </div>
      </section>
    </div>
  );
}

export function FundsHistoryPage() {
  const [tab, setTab] = useState("Predict");
  const [type, setType] = useState("All");
  return (
    <div className="page">
      <PageHeader
        eyebrow="Wallet activity"
        title="Funds history"
        description="Review deposits, withdrawals, and prediction transactions."
        action={
          <Button variant="secondary" onClick={() => downloadHistory()}>
            <Download /> Export CSV
          </Button>
        }
      />
      <div className="posts-toolbar">
        <div className="tabs">
          {["Deposit", "Withdrawal", "Predict"].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option>All</option>
          <option>Completed</option>
          <option>Pending</option>
          <option>Failed</option>
        </select>
      </div>
      <section className="content-card history-empty">
        <Empty
          icon={Clock3}
          title={`No ${tab.toLowerCase()} history`}
          description="Transactions matching this filter will appear here."
        />
      </section>
    </div>
  );
}
function downloadHistory() {
  const blob = new Blob(["type,status,amount,date\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "predictai-history.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function WalletSettingsPage() {
  const { wallet, setWallet, toast } = useApp();
  const [next, setNext] = useState(wallet);
  const [address, setAddress] = useState("");
  const [walletModal, setWalletModal] = useState(false);
  const update = <K extends keyof WalletSettings>(
    key: K,
    value: WalletSettings[K],
  ) => setNext((v) => ({ ...v, [key]: value }));
  const save = () => {
    setWallet(next);
    toast("Wallet preferences saved", "success");
  };
  return (
    <div className="page settings-page">
      <PageHeader
        eyebrow="Wallet"
        title="Wallet settings"
        description="Security, transaction, display, and asset management preferences."
        action={<Button onClick={save}>Save changes</Button>}
      />
      <div className="settings-grid">
        <SettingsSection icon={<ShieldCheck />} title="Security">
          <ToggleSetting
            label="Passkey approval"
            text="Require secure device approval before withdrawals."
            value={next.requireBiometrics}
            set={(v) => update("requireBiometrics", v)}
          />
          <ToggleSetting
            label="Withdrawal confirmation"
            text="Review details before funds are sent."
            value={next.withdrawalConfirmation}
            set={(v) => update("withdrawalConfirmation", v)}
          />
          <Choice
            label="Automatic wallet lock"
            options={["1 min", "5 min", "15 min", "Never"]}
            value={next.autoLock}
            set={(v) => update("autoLock", v as WalletSettings["autoLock"])}
          />
          <label>
            Trusted addresses
            <div className="field-action">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Paste wallet address"
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (
                    evm.test(address) &&
                    !next.trustedAddresses.includes(address)
                  ) {
                    update("trustedAddresses", [
                      ...next.trustedAddresses,
                      address,
                    ]);
                    setAddress("");
                  }
                }}
              >
                Add
              </Button>
            </div>
          </label>
          {next.trustedAddresses.map((a) => (
            <div className="trusted" key={a}>
              <code>{a}</code>
              <IconButton
                label="Remove address"
                onClick={() =>
                  update(
                    "trustedAddresses",
                    next.trustedAddresses.filter((x) => x !== a),
                  )
                }
              >
                <Trash2 />
              </IconButton>
            </div>
          ))}
        </SettingsSection>
        <SettingsSection
          icon={<ArrowUpFromLine />}
          title="Transaction preferences"
        >
          <Choice
            label="Default network"
            options={networks}
            value={next.defaultNetwork}
            set={(v) => update("defaultNetwork", v as Network)}
          />
          <label>
            Daily withdrawal limit
            <div className="amount-field">
              <input
                value={next.withdrawalLimit}
                onChange={(e) =>
                  update(
                    "withdrawalLimit",
                    e.target.value.replace(/[^0-9.]/g, ""),
                  )
                }
              />
              <span>USDC</span>
            </div>
          </label>
          <Choice
            label="Network fee speed"
            options={["Standard", "Fast"]}
            value={next.feeSpeed}
            set={(v) => update("feeSpeed", v as WalletSettings["feeSpeed"])}
          />
          <ToggleSetting
            label="Transaction notifications"
            text="Notify when deposits and withdrawals change status."
            value={next.transactionNotifications}
            set={(v) => update("transactionNotifications", v)}
          />
        </SettingsSection>
        <SettingsSection icon={<Settings />} title="Display preferences">
          <Choice
            label="Display currency"
            options={["USD", "NGN", "USDC"]}
            value={next.currency}
            set={(v) => update("currency", v as WalletSettings["currency"])}
          />
          <ToggleSetting
            label="Hide balances by default"
            text="Mask wallet values whenever the wallet opens."
            value={next.hideBalances}
            set={(v) => update("hideBalances", v)}
          />
          <Choice
            label="Sort assets by"
            options={["Balance", "Name", "Performance"]}
            value={next.assetSort}
            set={(v) => update("assetSort", v as WalletSettings["assetSort"])}
          />
          <ToggleSetting
            label="Compact asset view"
            text="Use smaller rows to show more assets."
            value={next.compactView}
            set={(v) => update("compactView", v)}
          />
          <Choice
            label="Wallet mode"
            options={["Prediction", "Trading"]}
            value={next.walletMode}
            set={(v) => update("walletMode", v as WalletSettings["walletMode"])}
          />
        </SettingsSection>
        <SettingsSection icon={<WalletCards />} title="Wallet management">
          <ToggleSetting
            label="USDC"
            text="Show USDC in deposits and withdrawals."
            value={next.supportedAssets.USDC}
            set={(v) => {
              if (v || next.supportedAssets.USDT)
                update("supportedAssets", { ...next.supportedAssets, USDC: v });
            }}
          />
          <ToggleSetting
            label="USDT"
            text="Show USDT in deposits and withdrawals."
            value={next.supportedAssets.USDT}
            set={(v) => {
              if (v || next.supportedAssets.USDC)
                update("supportedAssets", { ...next.supportedAssets, USDT: v });
            }}
          />
          <Link className="settings-link" to="/app/assets/deposit">
            <QrCode /> Deposit addresses <span>Open</span>
          </Link>
          <button
            className="settings-link"
            onClick={() => setWalletModal(true)}
          >
            <Link2 /> Connected wallets{" "}
            <span>{next.connectedWallet || "None"}</span>
          </button>
          <Link className="settings-link" to="/app/assets/history">
            <FileClock /> Transaction history <span>Open</span>
          </Link>
          <button className="settings-link" onClick={downloadHistory}>
            <Download /> Export transaction history <span>CSV</span>
          </button>
        </SettingsSection>
      </div>
      <Modal
        open={walletModal}
        title="Connected wallets"
        onClose={() => setWalletModal(false)}
      >
        <p className="modal-subtitle">
          Choose a wallet provider for this prototype connection.
        </p>
        {["MetaMask", "WalletConnect", "Coinbase Wallet"].map((w) => (
          <button
            className="wallet-provider"
            key={w}
            onClick={() => {
              update("connectedWallet", w);
              setWalletModal(false);
            }}
          >
            <span>
              <WalletCards />
            </span>
            <strong>{w}</strong>
            {next.connectedWallet === w && <Check />}
          </button>
        ))}
        {next.connectedWallet && (
          <Button
            variant="danger"
            onClick={() => {
              update("connectedWallet", null);
              setWalletModal(false);
            }}
          >
            Disconnect wallet
          </Button>
        )}
      </Modal>
    </div>
  );
}
function SettingsSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-card">
      <header>
        {icon}
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}
function ToggleSetting({
  label,
  text,
  value,
  set,
}: {
  label: string;
  text: string;
  value: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{label}</strong>
        <p>{text}</p>
      </div>
      <Toggle label={label} checked={value} onChange={set} />
    </div>
  );
}
function Choice({
  label,
  options,
  value,
  set,
}: {
  label: string;
  options: readonly string[];
  value: string;
  set: (v: string) => void;
}) {
  return (
    <fieldset className="choice-setting">
      <legend>{label}</legend>
      <div className="chip-row">
        {options.map((o) => (
          <button
            type="button"
            className={value === o ? "active" : ""}
            onClick={() => set(o)}
            key={o}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
