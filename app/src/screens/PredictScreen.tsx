import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MarketCard } from "../components/MarketCard";
import { AnnouncementCarousel } from "../components/FeaturedMarketsCarousel";
import { PredictionOrderModal, type PredictionOrder } from "../components/PredictionOrderModal";
import { markets } from "../services/marketData";
import { colors } from "../theme/colors";
import type { Market, Outcome } from "../types/market";
import { DepositScreen } from "./DepositScreen";
import { HomeWalletHeader } from "../components/HomeWalletHeader";
import { ProfileScreen } from "./ProfileScreen";
import { appNotifications, NotificationsScreen } from "./NotificationsScreen";
import { EventSearchScreen } from "./EventSearchScreen";
import { WalletAddressScannerScreen } from "./WalletAddressScannerScreen";
import { WithdrawalScreen } from "./WithdrawalScreen";
import { defaultWalletSettings } from "./WalletSettingsScreen";
import type { ScannedWalletAddress } from "../utils/walletAddress";

const categories = ["Recommend", "All", "Sports", "Crypto"] as const;
const subcategories = {
  Recommend: ["HOT", "Favorite"],
  All: ["HOT", "New"],
  Sports: ["Soccer", "NBA", "NFL", "EPL"],
  Crypto: ["Target Price", "Tiered", "Airdrops"],
} as const;

export function PredictScreen({
  email,
  onAskAI,
  onMarket,
  onOpenPublicProfile,
  onSignOut,
}: {
  email: string;
  onAskAI: (market: Market) => void;
  onMarket: (market: Market) => void;
  onOpenPublicProfile: () => void;
  onSignOut: () => void;
}) {
  const [category, setCategory] = useState<(typeof categories)[number]>("Recommend");
  const [sub, setSub] = useState("HOT");
  const [allMarket, setAllMarket] = useState<Market | null>(null);
  const [order, setOrder] = useState<PredictionOrder | null>(null);
  const [depositing, setDepositing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [walletScannerOpen, setWalletScannerOpen] = useState(false);
  const [walletWithdrawalOpen, setWalletWithdrawalOpen] = useState(false);
  const [scannedWallet, setScannedWallet] = useState<ScannedWalletAddress | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() =>
    appNotifications
      .filter((notification) => notification.read)
      .map((notification) => notification.id),
  );
  const visible = useMemo(
    () => (category === "All" ? markets : markets.filter((market) => market.category === category)),
    [category],
  );
  const chooseCategory = (next: (typeof categories)[number]) => {
    setCategory(next);
    setSub(subcategories[next][0]);
  };
  const predict = (market: Market, outcome: Outcome) => {
    setAllMarket(null);
    setOrder({
      marketTitle: market.title,
      outcomeLabel: outcome.label,
      odds: outcome.odds,
      tradeAction: outcome.tradeAction,
    });
  };

  if (depositing) return <DepositScreen onBack={() => setDepositing(false)} />;
  if (profileOpen)
    return (
      <ProfileScreen
        email={email}
        onBack={() => setProfileOpen(false)}
        onOpenPublicProfile={onOpenPublicProfile}
        onSignOut={onSignOut}
      />
    );
  if (notificationsOpen)
    return (
      <NotificationsScreen
        onBack={() => setNotificationsOpen(false)}
        onMarkAllRead={() =>
          setReadNotificationIds(appNotifications.map((notification) => notification.id))
        }
        onRead={(id) =>
          setReadNotificationIds((current) => (current.includes(id) ? current : [...current, id]))
        }
        readIds={readNotificationIds}
      />
    );
  if (searchOpen)
    return (
      <View style={styles.root}>
        <EventSearchScreen
          onAskAI={(market) => {
            setSearchOpen(false);
            onAskAI(market);
          }}
          onBack={() => setSearchOpen(false)}
          onMarket={(market) => {
            setSearchOpen(false);
            onMarket(market);
          }}
          onPredict={predict}
        />
        <PredictionOrderModal order={order} onClose={() => setOrder(null)} />
      </View>
    );
  if (walletScannerOpen)
    return (
      <WalletAddressScannerScreen
        onBack={() => setWalletScannerOpen(false)}
        onManual={() => {
          setScannedWallet(null);
          setWalletScannerOpen(false);
          setWalletWithdrawalOpen(true);
        }}
        onUseAddress={(result) => {
          setScannedWallet(result);
          setWalletScannerOpen(false);
          setWalletWithdrawalOpen(true);
        }}
      />
    );
  if (walletWithdrawalOpen)
    return (
      <WithdrawalScreen
        dailyLimit={Number(defaultWalletSettings.withdrawalLimit)}
        defaultNetwork={defaultWalletSettings.defaultNetwork}
        enabledAssets={["USDC", "USDT"]}
        feeSpeed={defaultWalletSettings.feeSpeed}
        initialAddress={scannedWallet?.address}
        initialNetwork={scannedWallet?.network}
        onBack={() => {
          setWalletWithdrawalOpen(false);
          setScannedWallet(null);
        }}
        onComplete={() => {
          setWalletWithdrawalOpen(false);
          setScannedWallet(null);
        }}
        requireBiometrics={defaultWalletSettings.requireBiometrics}
        requireConfirmation={defaultWalletSettings.withdrawalConfirmation}
      />
    );

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <HomeWalletHeader
          hasUnreadNotifications={appNotifications.some(
            (notification) => !notification.read && !readNotificationIds.includes(notification.id),
          )}
          onDeposit={() => setDepositing(true)}
          onNotifications={() => setNotificationsOpen(true)}
          onProfile={() => setProfileOpen(true)}
          onScan={() => setWalletScannerOpen(true)}
          onSearch={() => setSearchOpen(true)}
        />
        {category === "Recommend" ? <AnnouncementCarousel /> : null}
        <View style={styles.ticker}>
          <Ionicons color={colors.textMuted} name="volume-medium-outline" size={20} />
          <Text numberOfLines={1} style={styles.tickerText}>
            Live markets · Trade on real-world outcomes responsibly
          </Text>
        </View>
        <View style={styles.categories}>
          {categories.map((item) => (
            <Pressable key={item} onPress={() => chooseCategory(item)}>
              <Text style={[styles.category, category === item && styles.categoryActive]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subcategories}
        >
          {subcategories[category].map((item) => (
            <Pressable key={item} onPress={() => setSub(item)}>
              <Text style={[styles.subcategory, sub === item && styles.subcategoryActive]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {category === "Sports" ? (
          <View style={styles.modeRow}>
            <Text style={styles.modeActive}>Matches</Text>
            <Text style={styles.mode}>Betting Games</Text>
          </View>
        ) : null}
        <View style={styles.list}>
          {visible.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              onAskAI={() => onAskAI(market)}
              onPress={() =>
                market.category === "Sports" || market.category === "Crypto"
                  ? onMarket(market)
                  : market.outcomes.length > 2
                    ? setAllMarket(market)
                    : onMarket(market)
              }
              onPredict={(outcome) => predict(market, outcome)}
            />
          ))}
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent
        visible={!!allMarket}
        onRequestClose={() => setAllMarket(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setAllMarket(null)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>All Markets</Text>
            <ScrollView>
              {allMarket?.outcomes.map((outcome) => (
                <Pressable
                  key={outcome.label}
                  onPress={() => {
                    const selected = allMarket;
                    setAllMarket(null);
                    if (selected) onMarket(selected);
                  }}
                  style={styles.sheetRow}
                >
                  <View style={[styles.dot, { backgroundColor: outcome.color ?? colors.accent }]} />
                  <Text style={styles.sheetName}>{outcome.label}</Text>
                  <Text style={styles.sheetOdds}>{outcome.odds}</Text>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      predict(allMarket, outcome);
                    }}
                    style={({ pressed }) => [
                      styles.sheetProbability,
                      outcome.tradeAction === "Sell" && styles.sheetSellAction,
                      pressed && styles.sheetActionPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.probabilityText,
                        outcome.tradeAction === "Sell" && styles.sellActionText,
                      ]}
                    >
                      {allMarket.category === "Crypto"
                        ? outcome.tradeAction
                        : `${outcome.probability}%`}
                    </Text>
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <PredictionOrderModal order={order} onClose={() => setOrder(null)} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 15 },
  ticker: {
    height: 29,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tickerText: { color: colors.textMuted, fontSize: 10 },
  categories: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingLeft: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  category: { color: colors.textMuted, fontSize: 13 },
  categoryActive: { color: colors.text, fontWeight: "700" },
  search: {
    marginLeft: "auto",
    marginRight: 12,
    backgroundColor: colors.surface,
    padding: 7,
    borderRadius: 8,
  },
  subcategories: { height: 36, alignItems: "center", gap: 20, paddingHorizontal: 14 },
  subcategory: { color: colors.textMuted, fontSize: 11, paddingVertical: 10 },
  subcategoryActive: {
    color: colors.text,
    fontWeight: "700",
    borderBottomWidth: 2,
    borderBottomColor: colors.text,
  },
  modeRow: { flexDirection: "row", gap: 14, paddingHorizontal: 14, paddingVertical: 8 },
  mode: { color: colors.textMuted, fontSize: 11, padding: 6 },
  modeActive: {
    color: colors.text,
    fontSize: 11,
    padding: 6,
    backgroundColor: colors.surface,
    borderRadius: 5,
  },
  list: { padding: 14, gap: 12, paddingBottom: 22 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,.72)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "72%",
    minHeight: "48%",
    backgroundColor: "#1A1C1E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
  },
  handle: {
    width: 58,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#484A4F",
    alignSelf: "center",
    marginBottom: 24,
  },
  sheetTitle: { color: colors.text, fontSize: 21, marginBottom: 16 },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 52 },
  dot: { width: 24, height: 24, borderRadius: 12 },
  sheetName: { flex: 1, color: colors.text, fontSize: 14 },
  sheetOdds: { color: colors.textMuted, fontSize: 11 },
  sheetProbability: {
    width: 66,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#25272C",
    alignItems: "center",
  },
  sheetActionPressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  probabilityText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  sheetSellAction: { backgroundColor: "#411A23" },
  sellActionText: { color: "#FF466B" },
});
const walletStyles = StyleSheet.create({
  wallet: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolbar: { height: 38, flexDirection: "row", alignItems: "center", gap: 13 },
  avatar: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.button,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 5,
    borderBottomColor: colors.accent,
  },
  avatarText: { color: colors.buttonText, fontSize: 12, fontWeight: "800" },
  searchBar: {
    flex: 1,
    height: 30,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  searchText: { color: colors.textMuted, fontSize: 12 },
  notificationDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#F23861",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
  },
  walletLabel: { color: colors.textMuted, fontSize: 11 },
  walletValue: { color: colors.text, fontSize: 24, fontWeight: "600", marginTop: 3 },
  currency: { fontSize: 12, fontWeight: "400" },
  usdValue: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  depositButton: {
    minWidth: 72,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  depositText: { color: colors.buttonText, fontSize: 13, fontWeight: "500" },
  pnl: { color: colors.text, fontSize: 11, marginTop: 10 },
  pnlValue: { color: colors.text, fontSize: 11, fontWeight: "500" },
});
