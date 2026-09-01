import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
const coins = [
  { name: "PRED/USDT", price: "4.6536", change: "-0.63%" },
  { name: "BTC/USDT", price: "78,391.09", change: "-0.59%" },
  { name: "ETH/USDT", price: "2,468.65", change: "+0.37%" },
];
export function HomeScreen({ onPredict }: { onPredict: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <View style={styles.avatar}>
          <Text>🟢</Text>
        </View>
        <View style={styles.search}>
          <Ionicons color={colors.textMuted} name="search" size={20} />
          <Text style={styles.searchText}>Search markets</Text>
        </View>
        <Ionicons color={colors.text} name="notifications-outline" size={27} />
      </View>
      <Text style={styles.muted}>Total Balance ◉</Text>
      <View style={styles.balanceRow}>
        <Text style={styles.balance}>
          0.00000000 <Text style={styles.unit}>USDC⌄</Text>
        </Text>
        <Pressable style={styles.deposit}>
          <Text style={styles.depositText}>Deposit</Text>
        </Pressable>
      </View>
      <Text style={styles.muted}>≈$0.00</Text>
      <Text style={styles.pnl}>Today's P&amp;L +$0.00 (+0.00%)</Text>
      <View style={styles.shortcuts}>
        {[
          ["Predict", "analytics-outline"],
          ["Markets", "grid-outline"],
          ["Trade", "swap-horizontal-outline"],
          ["More", "apps-outline"],
        ].map(([label, icon]) => (
          <Pressable
            key={label}
            onPress={label === "Predict" ? onPredict : undefined}
            style={styles.shortcut}
          >
            <View style={styles.shortcutIcon}>
              <Ionicons
                color={colors.text}
                name={icon as keyof typeof Ionicons.glyphMap}
                size={25}
              />
            </View>
            <Text style={styles.shortcutLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.banner}>
        <View>
          <Text style={styles.bannerTitle}>Predict the future</Text>
          <Text style={styles.bannerText}>Trade on outcomes that matter.</Text>
        </View>
        <Ionicons color={colors.accent} name="sparkles" size={48} />
      </View>
      <View style={styles.tabs}>
        <Text style={styles.tab}>Favorites</Text>
        <Text style={[styles.tab, styles.activeTab]}>Hot</Text>
        <Text style={styles.tab}>New</Text>
        <Text style={styles.tab}>Gainers</Text>
      </View>
      <View style={styles.segment}>
        <Text style={styles.segmentActive}>Spot</Text>
        <Text style={styles.muted}>Futures</Text>
      </View>
      {coins.map((coin) => (
        <View key={coin.name} style={styles.coin}>
          <View style={styles.coinIcon}>
            <Text style={styles.coinSymbol}>{coin.name[0]}</Text>
          </View>
          <Text style={styles.coinName}>{coin.name}</Text>
          <View style={styles.coinPrice}>
            <Text style={styles.price}>{coin.price}</Text>
            <Text style={styles.muted}>${coin.price}</Text>
          </View>
          <View style={[styles.change, coin.change.startsWith("+") && styles.positive]}>
            <Text style={styles.changeText}>{coin.change}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 30 },
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.button,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    flex: 1,
    height: 45,
    borderRadius: 12,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
  },
  searchText: { color: colors.textMuted, fontSize: 17 },
  muted: { color: colors.textMuted, fontSize: 14 },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  balance: { color: colors.text, fontSize: 34, fontWeight: "600" },
  unit: { fontSize: 16 },
  deposit: {
    backgroundColor: colors.primary,
    paddingHorizontal: 21,
    paddingVertical: 13,
    borderRadius: 11,
  },
  depositText: { color: colors.buttonText, fontSize: 17 },
  pnl: { color: colors.text, fontSize: 16, marginTop: 17 },
  shortcuts: { flexDirection: "row", justifyContent: "space-between", marginVertical: 28 },
  shortcut: { alignItems: "center", gap: 8 },
  shortcutIcon: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutLabel: { color: colors.text, fontSize: 13 },
  banner: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  bannerText: { color: colors.textMuted, marginTop: 6 },
  tabs: {
    flexDirection: "row",
    gap: 28,
    marginTop: 25,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: { color: colors.textMuted, fontSize: 19, paddingBottom: 10 },
  activeTab: {
    color: colors.text,
    fontWeight: "700",
    borderBottomWidth: 3,
    borderBottomColor: colors.text,
  },
  segment: { flexDirection: "row", gap: 30, marginVertical: 20 },
  segmentActive: {
    color: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 7,
  },
  coin: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  coinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  coinSymbol: { color: "#111", fontWeight: "900" },
  coinName: { flex: 1, color: colors.text, fontSize: 17 },
  coinPrice: { alignItems: "flex-end" },
  price: { color: colors.text, fontSize: 17 },
  change: {
    width: 88,
    paddingVertical: 12,
    backgroundColor: "#F23861",
    alignItems: "center",
    borderRadius: 10,
  },
  positive: { backgroundColor: "#25272C" },
  changeText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
