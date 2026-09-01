import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import type { Market, Outcome } from "../types/market";
import { AIAnalysisButton } from "./AIAnalysisButton";

export function MarketCard({
  market,
  onAskAI,
  onPress,
  onPredict,
}: {
  market: Market;
  onAskAI: () => void;
  onPress: () => void;
  onPredict: (outcome: Outcome) => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.heading}>
        <Text allowFontScaling={false} numberOfLines={2} style={styles.title}>
          {market.title}
        </Text>
      </View>
      {market.outcomes.slice(0, 2).map((outcome, index) => (
        <View key={outcome.label} style={styles.outcome}>
          <View
            style={[
              styles.token,
              {
                backgroundColor:
                  market.category === "Crypto" ? "#f7931a" : index ? "#43464d" : colors.accent,
              },
            ]}
          >
            <Text style={styles.tokenText}>
              {market.category === "Crypto" ? "₿" : outcome.label.slice(0, 1)}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.outcomeName}>
            {outcome.label}
          </Text>
          <Text style={styles.odds}>{outcome.odds}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              onPredict(outcome);
            }}
            style={({ pressed }) => [
              styles.probability,
              outcome.tradeAction === "Sell" && styles.sellAction,
              pressed && styles.actionPressed,
            ]}
          >
            <Text
              style={[
                styles.probabilityText,
                outcome.tradeAction === "Sell" && styles.sellActionText,
              ]}
            >
              {market.category === "Crypto" ? outcome.tradeAction : `${outcome.probability}%`}
            </Text>
          </Pressable>
        </View>
      ))}
      <AIAnalysisButton onPress={onAskAI} />
      <View style={styles.meta}>
        <Text style={styles.metaText}>{market.volume} Volume</Text>
        <Text style={styles.metaText}>+{market.more} More⌄</Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: "#191B1D", borderRadius: 13, padding: 11, gap: 8 },
  pressed: { opacity: 0.78 },
  heading: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  title: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 17, fontWeight: "700" },
  outcome: { flexDirection: "row", alignItems: "center", gap: 7 },
  token: {
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  outcomeName: { flex: 1, color: colors.text, fontSize: 12 },
  odds: { color: colors.textMuted, fontSize: 10 },
  probability: {
    width: 60,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: "#25272C",
    alignItems: "center",
  },
  actionPressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  probabilityText: { color: colors.accent, fontSize: 13, fontWeight: "600" },
  sellAction: { backgroundColor: "#411A23" },
  sellActionText: { color: "#FF466B" },
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  metaText: { color: colors.textFaint, fontSize: 10 },
});
