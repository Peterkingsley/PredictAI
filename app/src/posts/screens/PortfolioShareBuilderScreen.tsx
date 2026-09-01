import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { PrimaryButton } from "../../components/PrimaryButton";
import { getPortfolioTemplate } from "../../services/social";
import { colors } from "../../theme/colors";
import type { PublicPortfolioSnapshot } from "../../types/social";
import { PublicPortfolioCard } from "../components/PublicPortfolioCard";

const timeframes: PublicPortfolioSnapshot["timeframe"][] = ["24H", "7D", "30D", "ALL"];
function Toggle({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        onValueChange={onChange}
        thumbColor={value ? colors.buttonText : "#AAA"}
        trackColor={{ false: "#35383E", true: colors.accent }}
        value={value}
      />
    </View>
  );
}
export function PortfolioShareBuilderScreen({
  onAdd,
  onBack,
}: {
  onAdd: (portfolio: PublicPortfolioSnapshot) => void;
  onBack: () => void;
}) {
  const [portfolio, setPortfolio] = useState(getPortfolioTemplate());
  const allPositions = getPortfolioTemplate().positions;
  const update = (values: Partial<PublicPortfolioSnapshot>) =>
    setPortfolio((current) => ({ ...current, ...values }));
  const togglePosition = (id: string) =>
    update({
      positions: portfolio.positions.some((item) => item.id === id)
        ? portfolio.positions.filter((item) => item.id !== id)
        : portfolio.positions.length < 5
          ? [...portfolio.positions, allPositions.find((item) => item.id === id)!]
          : portfolio.positions,
    });
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Ionicons color={colors.text} name="chevron-back" size={25} />
        </Pressable>
        <Text style={styles.title}>Share portfolio</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Choose what people can see.</Text>
        <View style={styles.timeframes}>
          {timeframes.map((item) => (
            <Pressable
              key={item}
              onPress={() => update({ timeframe: item })}
              style={[styles.timeframe, portfolio.timeframe === item && styles.timeframeActive]}
            >
              <Text
                style={[
                  styles.timeframeText,
                  portfolio.timeframe === item && styles.timeframeTextActive,
                ]}
              >
                {item === "ALL" ? "All" : item}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Public preview</Text>
        <PublicPortfolioCard portfolio={portfolio} />
        <Text style={styles.sectionTitle}>Selected assets</Text>
        <View style={styles.assets}>
          {allPositions.map((position) => {
            const active = portfolio.positions.some((item) => item.id === position.id);
            return (
              <Pressable
                key={position.id}
                onPress={() => togglePosition(position.id)}
                style={[styles.asset, active && styles.assetActive]}
              >
                <Ionicons
                  color={active ? colors.accent : colors.textMuted}
                  name={active ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                />
                <Text style={[styles.assetText, active && styles.assetTextActive]}>
                  {position.assetSymbol}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.limit}>
          Select up to 5 public assets. Losing assets are not hidden automatically.
        </Text>
        <Text style={styles.sectionTitle}>What should be visible?</Text>
        <View style={styles.settings}>
          <Toggle
            label="Portfolio performance %"
            onChange={(showPerformance) => update({ showPerformance })}
            value={portfolio.showPerformance}
          />
          <Toggle
            label="Best and worst performer"
            onChange={(showBestWorst) => update({ showBestWorst })}
            value={portfolio.showBestWorst}
          />
          <Toggle
            label="Win/loss count"
            onChange={(showWinLoss) => update({ showWinLoss })}
            value={portfolio.showWinLoss}
          />
          <Toggle
            label="Total portfolio value"
            onChange={(showTotalValue) => update({ showTotalValue })}
            value={portfolio.showTotalValue}
          />
          <Toggle
            label="Asset allocation"
            onChange={(showAllocation) => update({ showAllocation })}
            value={portfolio.showAllocation}
          />
          <Toggle
            label="Performance chart"
            onChange={(showChart) => update({ showChart })}
            value={portfolio.showChart}
          />
        </View>
        <View style={styles.submit}>
          <PrimaryButton
            disabled={portfolio.positions.length === 0}
            label="Add to post"
            onPress={() => onAdd(portfolio)}
          />
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 52,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "600" },
  spacer: { width: 25 },
  content: { padding: 15, paddingBottom: 40 },
  intro: { color: colors.textMuted, fontSize: 11 },
  timeframes: {
    flexDirection: "row",
    marginTop: 15,
    borderRadius: 10,
    backgroundColor: "#181A1D",
    padding: 4,
  },
  timeframe: { flex: 1, paddingVertical: 8, borderRadius: 7, alignItems: "center" },
  timeframeActive: { backgroundColor: colors.surface },
  timeframeText: { color: colors.textMuted, fontSize: 9 },
  timeframeTextActive: { color: colors.text },
  sectionTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 23,
    marginBottom: 9,
  },
  assets: { flexDirection: "row", gap: 8 },
  asset: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  assetActive: { backgroundColor: "#25272C" },
  assetText: { color: colors.textMuted, fontSize: 9, fontWeight: "700" },
  assetTextActive: { color: colors.accent },
  limit: { color: colors.textFaint, fontSize: 8, marginTop: 8 },
  settings: { borderRadius: 12, backgroundColor: "#181A1D", paddingHorizontal: 13 },
  toggle: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLabel: { flex: 1, color: colors.text, fontSize: 11 },
  submit: { marginTop: 22 },
});
