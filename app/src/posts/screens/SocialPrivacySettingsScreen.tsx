import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { getPrivacySettings, updatePrivacySettings } from "../../services/social";
import { colors } from "../../theme/colors";
import type { SocialPrivacySettings } from "../../types/social";
import { SocialScreenHeader } from "../components/SocialScreenHeader";

const options: { key: keyof SocialPrivacySettings; label: string; description: string }[] = [
  {
    key: "publicProfile",
    label: "Public profile",
    description: "Allow the community to view your social profile.",
  },
  {
    key: "showPortfolioPerformance",
    label: "Portfolio performance",
    description: "Show percentage returns without exposing balances.",
  },
  {
    key: "showTotalPortfolioValue",
    label: "Total portfolio value",
    description: "Display the combined value of shared holdings.",
  },
  {
    key: "showHoldings",
    label: "Holdings",
    description: "Show assets and allocations you choose to share.",
  },
  {
    key: "showPositionHistory",
    label: "Position history",
    description: "Let people review previously shared positions.",
  },
  {
    key: "showLikedPosts",
    label: "Liked posts",
    description: "Show posts you have liked on your profile.",
  },
  {
    key: "showFollowingList",
    label: "Following list",
    description: "Allow others to see who you follow.",
  },
  {
    key: "allowLeaderboards",
    label: "Leaderboard participation",
    description: "Include eligible public activity in rankings.",
  },
  {
    key: "allowSearch",
    label: "Appear in search",
    description: "Let people find your profile by name or expertise.",
  },
];
export function SocialPrivacySettingsScreen({ onBack }: { onBack: () => void }) {
  const [settings, setSettings] = useState(getPrivacySettings());
  const toggle = (key: keyof SocialPrivacySettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    updatePrivacySettings(next);
  };
  return (
    <View style={styles.root}>
      <SocialScreenHeader onBack={onBack} title="Social privacy" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          You control what the PredictAI community can see. Private wallet details are never posted
          automatically.
        </Text>
        {options.map((option) => (
          <View key={option.key} style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.label}>{option.label}</Text>
              <Text style={styles.description}>{option.description}</Text>
            </View>
            <Switch
              onValueChange={(value) => toggle(option.key, value)}
              thumbColor={settings[option.key] ? colors.accent : "#B4B4B6"}
            trackColor={{ false: "#303238", true: colors.navInactive }}
              value={settings[option.key]}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 30 },
  intro: {
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 15,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    minHeight: 72,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  copy: { flex: 1 },
  label: { color: colors.text, fontSize: 11, fontWeight: "600" },
  description: { color: colors.textMuted, fontSize: 8, lineHeight: 13, marginTop: 4 },
});
