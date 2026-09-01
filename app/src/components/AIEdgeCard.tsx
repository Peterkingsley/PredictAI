import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import type { AIAnalysisPreview } from "../types/aiAnalysis";

const verdictLabels = {
  strong_yes: "STRONG YES",
  lean_yes: "LEAN YES",
  neutral: "NEUTRAL",
  lean_no: "LEAN NO",
  strong_no: "STRONG NO",
} as const;

export function AIEdgeCard({
  analysis,
  onPress,
}: {
  analysis: AIAnalysisPreview;
  onPress?: () => void;
}) {
  const edgePositive = analysis.edge >= 0;
  const content = (
    <>
      <View style={styles.heading}>
        <View style={styles.brand}>
          <Ionicons color={colors.accent} name="sparkles-outline" size={16} />
          <Text allowFontScaling={false} style={styles.brandText}>
            PredictAI Intelligence
          </Text>
        </View>
        {onPress ? <Ionicons color={colors.textMuted} name="arrow-forward" size={17} /> : null}
      </View>
      <Text allowFontScaling={false} numberOfLines={1} style={styles.outcome}>
        Analysis for {analysis.focusedOutcome}
      </Text>
      <View style={styles.metrics}>
        <View>
          <Text allowFontScaling={false} style={styles.metricLabel}>
            Market
          </Text>
          <Text allowFontScaling={false} style={styles.metricValue}>
            {analysis.marketProbability}%
          </Text>
        </View>
        <Ionicons color={colors.textFaint} name="arrow-forward" size={18} />
        <View>
          <Text allowFontScaling={false} style={styles.metricLabel}>
            PredictAI
          </Text>
          <Text allowFontScaling={false} style={styles.aiValue}>
            {analysis.probability}%
          </Text>
        </View>
        <View style={[styles.edge, !edgePositive && styles.edgeNegative]}>
          <Text
            allowFontScaling={false}
            style={[styles.edgeLabel, !edgePositive && styles.edgeLabelNegative]}
          >
            {edgePositive ? "+" : ""}
            {analysis.edge}% EDGE
          </Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text allowFontScaling={false} style={styles.verdict}>
          {verdictLabels[analysis.verdict]}
        </Text>
        <Text allowFontScaling={false} style={styles.confidence}>
          {analysis.confidence.toUpperCase()} CONFIDENCE
        </Text>
      </View>
    </>
  );

  if (onPress)
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#181A1D",
    padding: 14,
  },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandText: { color: colors.text, fontSize: 12, fontWeight: "700" },
  outcome: { color: colors.textMuted, fontSize: 9, marginTop: 9 },
  metrics: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 13 },
  metricLabel: { color: colors.textMuted, fontSize: 8, textTransform: "uppercase" },
  metricValue: { color: colors.text, fontSize: 19, fontWeight: "600", marginTop: 2 },
  aiValue: { color: colors.accent, fontSize: 19, fontWeight: "700", marginTop: 2 },
  edge: {
    marginLeft: "auto",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#25272C",
  },
  edgeNegative: { backgroundColor: "#411A23" },
  edgeLabel: { color: colors.accent, fontSize: 10, fontWeight: "800" },
  edgeLabelNegative: { color: "#FF728C" },
  footer: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  verdict: { color: colors.text, fontSize: 10, fontWeight: "700" },
  confidence: { color: colors.textMuted, fontSize: 9, fontWeight: "600" },
  pressed: { opacity: 0.7 },
});
