import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { markets } from "../../services/marketData";
import { colors } from "../../theme/colors";
import type { SocialAIAnalysis } from "../../types/social";

const verdicts = {
  strong_yes: "Strong Yes",
  lean_yes: "Lean Yes",
  neutral: "Neutral",
  lean_no: "Lean No",
  strong_no: "Strong No",
} as const;

export function AIAnalysisShareCard({
  analysis,
  marketId,
  onOpen,
}: {
  analysis: SocialAIAnalysis;
  marketId?: string;
  onOpen?: () => void;
}) {
  const market = markets.find((item) => item.id === marketId);
  const content = (
    <>
      <View style={styles.brandRow}>
        <Ionicons color={colors.accent} name="analytics-outline" size={14} />
        <Text style={styles.brand}>PredictAI Intelligence</Text>
      </View>
      <Text numberOfLines={2} style={styles.market}>
        {market?.title ?? "Market intelligence report"}
      </Text>
      <View style={styles.metrics}>
        <View>
          <Text style={styles.label}>Market</Text>
          <Text style={styles.marketValue}>{analysis.marketProbability}%</Text>
        </View>
        <View>
          <Text style={styles.label}>PredictAI</Text>
          <Text style={styles.aiValue}>{analysis.probability}%</Text>
        </View>
        <View style={styles.edge}>
          <Text style={styles.label}>AI edge</Text>
          <Text style={[styles.aiValue, { color: analysis.edge >= 0 ? colors.positive : colors.danger }]}>
            {analysis.edge >= 0 ? "+" : ""}
            {analysis.edge}%
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.verdict}>
          {verdicts[analysis.verdict]}{" "}
          <Text style={styles.confidence}>· {analysis.confidence} confidence</Text>
        </Text>
        {onOpen ? <Ionicons color={colors.textMuted} name="arrow-forward" size={16} /> : null}
      </View>
    </>
  );
  return onOpen ? (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.card}>{content}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#131517",
    padding: 16,
  },
  pressed: { opacity: 0.72 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  brand: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  market: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: "600", marginTop: 12 },
  metrics: { flexDirection: "row", alignItems: "flex-end", marginTop: 16 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: "500" },
  marketValue: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 4 },
  aiValue: { color: colors.accent, fontSize: 20, fontWeight: "700", marginTop: 4 },
  edge: { marginLeft: "auto", alignItems: "flex-end" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 16,
    paddingTop: 12,
  },
  verdict: { color: colors.text, fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  confidence: { color: colors.textMuted, fontWeight: "400" },
});
