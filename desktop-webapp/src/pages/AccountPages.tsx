import {
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Clipboard,
  FileText,
  Globe2,
  KeyRound,
  Languages,
  LifeBuoy,
  Lock,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  IconButton,
  Modal,
  PageHeader,
  Toggle,
} from "../components/ui";
import { useApp } from "../store/AppStore";
import { copyText } from "../utils/browser";

type Panel =
  | "edit"
  | "verification"
  | "password"
  | "devices"
  | "help"
  | "support"
  | "terms"
  | "privacy"
  | "rules"
  | "signout"
  | "delete"
  | null;
const copy: {
  [K in Exclude<
    Panel,
    | "edit"
    | "verification"
    | "password"
    | "devices"
    | "signout"
    | "delete"
    | null
  >]: { title: string; body: string };
} = {
  help: {
    title: "Help center",
    body: "Find answers about predictions, deposits, withdrawals, event resolution, and account access.",
  },
  support: {
    title: "Contact support",
    body: "Support requests will include your account ID and app diagnostics. Secure support messaging will be connected when the backend channel is configured.",
  },
  terms: {
    title: "Terms of use",
    body: "By using PredictAI, you agree to follow applicable eligibility requirements, event rules, payment terms, and responsible-use policies.",
  },
  privacy: {
    title: "Privacy policy",
    body: "PredictAI uses account, identity, device, and transaction information to provide and protect the service.",
  },
  rules: {
    title: "Prediction rules",
    body: "Each market resolves from the source listed in its event rules. Predictions cannot be changed after confirmation.",
  },
};

export function AccountPage() {
  const {
    session,
    users,
    updateUser,
    profilePhoto,
    setProfilePhoto,
    logout,
    toast,
  } = useApp();
  const navigate = useNavigate();
  const user = users.find((u) => u.isCurrent)!;
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState(user.displayName);
  const [email, setEmail] = useState(session || "peter@example.com");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [verification, setVerification] = useState<
    "Not verified" | "In review"
  >("Not verified");
  const [documentId, setDocumentId] = useState("");
  const [biometrics, setBiometrics] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<"Dark" | "System">("Dark");
  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState<"USD" | "NGN" | "USDC">("USD");
  const [limit, setLimit] = useState("500");
  const fileRef = useRef<HTMLInputElement>(null);
  const initials = useMemo(
    () =>
      name
        .split(/\s+/)
        .map((x) => x[0])
        .join("")
        .slice(0, 2),
    [name],
  );
  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Choose an image file", "danger");
      return;
    }
    if (file.size > 2_000_000) {
      toast("Profile image must be under 2 MB", "danger");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(String(reader.result));
      toast("Profile photo updated", "success");
    };
    reader.readAsDataURL(file);
  };
  const signout = () => {
    logout();
    navigate("/login");
  };
  const info = panel && panel in copy ? copy[panel as keyof typeof copy] : null;
  return (
    <div className="page account-page">
      <PageHeader
        eyebrow="Personal settings"
        title="Account & profile"
        description="Manage identity, security, preferences, support, and your public community profile."
      />
      <div className="account-grid">
        <section className="profile-summary">
          <div className="photo-control">
            <Avatar name={initials} src={profilePhoto} size="lg" />
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="Change profile photo"
            >
              <Camera />
            </button>
            <input
              ref={fileRef}
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => choosePhoto(e.target.files?.[0])}
            />
          </div>
          <div>
            <h2>{name}</h2>
            <p>{email}</p>
            <span
              className={`verification ${verification === "In review" ? "review" : ""}`}
            >
              {verification}
            </span>
          </div>
          <Button variant="secondary" onClick={() => setPanel("edit")}>
            Edit profile
          </Button>
          {profilePhoto && (
            <Button variant="ghost" onClick={() => setProfilePhoto(null)}>
              Remove photo
            </Button>
          )}
        </section>
        <button
          className="verification-banner"
          onClick={() => setPanel("verification")}
        >
          <ShieldCheck />
          <span>
            <strong>Identity verification</strong>
            <small>
              {verification === "Not verified"
                ? "Verify your identity to unlock higher account limits."
                : "Your documents are being reviewed."}
            </small>
          </span>
          <ChevronRight />
        </button>
      </div>
      <div className="account-sections">
        <AccountSection title="Community">
          <Menu
            icon={<UsersRound />}
            label="Public profile"
            detail="Posts, performance & privacy"
            action={() => navigate("/app/posts/profile/current")}
          />
        </AccountSection>
        <AccountSection title="Account security">
          <Menu
            icon={<KeyRound />}
            label="Change password or PIN"
            action={() => setPanel("password")}
          />
          <Setting
            label="Passkey or biometric login"
            text="Use a supported device credential when signing in."
            value={biometrics}
            set={setBiometrics}
          />
          <Setting
            label="Two-factor authentication"
            text="Require an additional code during sign-in."
            value={twoFactor}
            set={setTwoFactor}
          />
          <Menu
            icon={<MonitorSmartphone />}
            label="Active devices"
            detail="1 device"
            action={() => setPanel("devices")}
          />
        </AccountSection>
        <AccountSection title="Preferences">
          <Setting
            label="Notifications"
            text="Receive event, transaction, and security updates."
            value={notifications}
            set={setNotifications}
          />
          <Choice
            label="Theme"
            value={theme}
            options={["Dark", "System"]}
            set={(v) => setTheme(v as "Dark" | "System")}
          />
          <Menu
            icon={<Languages />}
            label="Language"
            detail={language}
            action={() =>
              setLanguage(language === "English" ? "French" : "English")
            }
          />
          <Choice
            label="Default currency"
            value={currency}
            options={["USD", "NGN", "USDC"]}
            set={(v) => setCurrency(v as typeof currency)}
          />
          <label>
            Responsible prediction limit
            <small>Maximum prediction amount per day.</small>
            <div className="amount-field">
              <input
                value={limit}
                onChange={(e) =>
                  setLimit(e.target.value.replace(/[^0-9.]/g, ""))
                }
              />
              <span>USDC</span>
            </div>
          </label>
        </AccountSection>
        <AccountSection title="Support & legal">
          <Menu
            icon={<CircleHelp />}
            label="Help center"
            action={() => setPanel("help")}
          />
          <Menu
            icon={<LifeBuoy />}
            label="Contact support"
            action={() => setPanel("support")}
          />
          <Menu
            icon={<FileText />}
            label="Terms of use"
            action={() => setPanel("terms")}
          />
          <Menu
            icon={<Lock />}
            label="Privacy policy"
            action={() => setPanel("privacy")}
          />
          <Menu
            icon={<BookOpen />}
            label="Prediction rules"
            action={() => setPanel("rules")}
          />
        </AccountSection>
        <AccountSection title="Account actions">
          <button
            className="referral"
            onClick={() =>
              void copyText("PRED-PETER").then(() =>
                toast("Referral code copied", "success"),
              )
            }
          >
            <span>
              <strong>Referral code</strong>
              <b>PRED-PETER</b>
            </span>
            <Clipboard /> Copy
          </button>
          <Menu
            icon={<LogOut />}
            label="Sign out"
            action={() => setPanel("signout")}
          />
          <Menu
            danger
            icon={<Trash2 />}
            label="Delete account"
            action={() => setPanel("delete")}
          />
        </AccountSection>
      </div>
      <Modal
        open={panel !== null}
        title={
          info?.title ||
          (panel === "edit"
            ? "Edit profile"
            : panel === "verification"
              ? "Identity verification"
              : panel === "password"
                ? "Change password or PIN"
                : panel === "devices"
                  ? "Active devices"
                  : undefined)
        }
        onClose={() => setPanel(null)}
      >
        {panel === "edit" && (
          <div className="modal-form">
            <label>
              Display name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Phone number
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Add phone number"
              />
            </label>
            <label>
              Country
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </label>
            <Button
              onClick={() => {
                updateUser(user.id, { displayName: name });
                setPanel(null);
                toast("Account profile saved", "success");
              }}
            >
              Save profile
            </Button>
          </div>
        )}
        {panel === "verification" && (
          <div className="modal-form">
            <p>
              {verification === "In review"
                ? "Your verification is in review. We will notify you when a decision is available."
                : "Enter your government-issued document number to start verification."}
            </p>
            {verification === "Not verified" && (
              <>
                <label>
                  Document number
                  <input
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    placeholder="Enter document number"
                  />
                </label>
                <Button
                  disabled={documentId.trim().length < 5}
                  onClick={() => {
                    setVerification("In review");
                    setPanel(null);
                    toast("Verification submitted", "success");
                  }}
                >
                  Submit for review
                </Button>
              </>
            )}
          </div>
        )}
        {panel === "password" && (
          <div className="modal-form">
            <label>
              Current password
              <input type="password" />
            </label>
            <label>
              New password
              <input type="password" placeholder="At least 8 characters" />
            </label>
            <Button
              onClick={() => {
                setPanel(null);
                toast("Password updated", "success");
              }}
            >
              Update password
            </Button>
          </div>
        )}
        {panel === "devices" && (
          <div className="device-item">
            <MonitorSmartphone />
            <span>
              <strong>Current desktop browser</strong>
              <small>Active now · Lagos, Nigeria</small>
            </span>
            <b>Current</b>
          </div>
        )}
        {info && (
          <div className="info-panel">
            <p>{info.body}</p>
            <Button onClick={() => setPanel(null)}>Done</Button>
          </div>
        )}
        {(panel === "signout" || panel === "delete") && (
          <div className="confirm-danger">
            <span>{panel === "delete" ? <Trash2 /> : <LogOut />}</span>
            <h2>{panel === "delete" ? "Delete account?" : "Sign out?"}</h2>
            <p>
              {panel === "delete"
                ? "This prototype will sign you out. Permanent deletion requires backend identity confirmation."
                : "You will need your credentials to sign in again."}
            </p>
            <div className="button-row">
              <Button variant="secondary" onClick={() => setPanel(null)}>
                Cancel
              </Button>
              <Button
                variant={panel === "delete" ? "danger" : "primary"}
                onClick={signout}
              >
                {panel === "delete" ? "Continue" : "Sign out"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AccountSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-card account-section">
      <header>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  );
}
function Menu({
  icon,
  label,
  detail,
  action,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  action: () => void;
  danger?: boolean;
}) {
  return (
    <button className={`menu-row ${danger ? "danger" : ""}`} onClick={action}>
      <span>{icon}</span>
      <strong>{label}</strong>
      {detail && <small>{detail}</small>}
      <ChevronRight />
    </button>
  );
}
function Setting({
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
      <Toggle checked={value} onChange={set} label={label} />
    </div>
  );
}
function Choice({
  label,
  value,
  options,
  set,
}: {
  label: string;
  value: string;
  options: string[];
  set: (v: string) => void;
}) {
  return (
    <fieldset className="choice-setting">
      <legend>{label}</legend>
      <div className="chip-row">
        {options.map((o) => (
          <button
            type="button"
            className={o === value ? "active" : ""}
            key={o}
            onClick={() => set(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function NotificationsPage() {
  const { notifications, markNotification, markAllNotifications } = useApp();
  const [filter, setFilter] = useState<"All" | "Unread">("All");
  const visible =
    filter === "Unread" ? notifications.filter((n) => !n.read) : notifications;
  const unread = notifications.filter((n) => !n.read).length;
  const icons = {
    market: <Bell />,
    wallet: <CircleDollarSignIcon />,
    social: <UsersRound />,
    security: <ShieldCheck />,
  };
  return (
    <div className="page notifications-page">
      <PageHeader
        eyebrow="Your updates"
        title="Notifications"
        description={
          unread
            ? `${unread} unread notification${unread === 1 ? "" : "s"}`
            : "You are all caught up."
        }
        action={
          <Button
            variant="secondary"
            disabled={!unread}
            onClick={markAllNotifications}
          >
            Mark all read
          </Button>
        }
      />
      <div className="tabs">
        <button
          className={filter === "All" ? "active" : ""}
          onClick={() => setFilter("All")}
        >
          All
        </button>
        <button
          className={filter === "Unread" ? "active" : ""}
          onClick={() => setFilter("Unread")}
        >
          Unread {unread > 0 && `(${unread})`}
        </button>
      </div>
      {(["Today", "Earlier"] as const).map((group) => {
        const list = visible.filter((n) => n.group === group);
        return list.length ? (
          <section className="notification-group" key={group}>
            <h2>{group}</h2>
            {list.map((n) => (
              <button
                className={`notification-row ${n.read ? "" : "unread"}`}
                onClick={() => markNotification(n.id)}
                key={n.id}
              >
                <span className={`notification-icon ${n.kind}`}>
                  {icons[n.kind]}
                </span>
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                </div>
                <time>{n.time}</time>
                {!n.read && <i />}
              </button>
            ))}
          </section>
        ) : null;
      })}
      {visible.length === 0 && (
        <div className="content-card">
          <EmptyNotice />
        </div>
      )}
    </div>
  );
}
function CircleDollarSignIcon() {
  return <Globe2 />;
}
function EmptyNotice() {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Check />
      </span>
      <h3>You’re all caught up</h3>
      <p>
        New updates about predictions, wallet activity, and security will appear
        here.
      </p>
    </div>
  );
}
