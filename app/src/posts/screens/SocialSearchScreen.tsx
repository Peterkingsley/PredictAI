import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { markets } from "../../services/marketData";
import { searchSocial } from "../../services/social";
import { colors } from "../../theme/colors";
import type { SocialPost, SocialSearchResults } from "../../types/social";
import { SocialPostCard } from "../components/SocialPostCard";
import { SocialScreenHeader } from "../components/SocialScreenHeader";
import { SocialUserRow } from "../components/SocialUserRow";

type SearchTab = "top" | "people" | "posts" | "markets";
const empty: SocialSearchResults = { users: [], posts: [], marketIds: [] };
const recent = ["Bitcoin", "Fed rates", "Crypto analysts"];
export function SocialSearchScreen({
  onBack,
  onOpenAnalysis,
  onOpenMarketPosts,
  onOpenMarket,
  onOpenPortfolio,
  onOpenPost,
  onOpenProfile,
  onQuote,
}: {
  onBack: () => void;
  onOpenAnalysis: (id: string) => void;
  onOpenMarketPosts: (id: string) => void;
  onOpenMarket: (id: string) => void;
  onOpenPortfolio: (id: string) => void;
  onOpenPost: (id: string) => void;
  onOpenProfile: (id: string) => void;
  onQuote: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("top");
  const [results, setResults] = useState(empty);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      void searchSocial(query).then(setResults);
    }, 180);
    return () => clearTimeout(timer);
  }, [query, version]);
  const showPeople = tab === "top" || tab === "people";
  const showPosts = tab === "top" || tab === "posts";
  const showMarkets = tab === "top" || tab === "markets";
  const content = query.trim() ? (
    <FlatList
      contentContainerStyle={styles.content}
      data={["results"]}
      keyExtractor={(item) => item}
      renderItem={() => (
        <>
          {showPeople && results.users.length ? (
            <Section title="People">
              {results.users.map((user) => (
                <SocialUserRow
                  key={user.id}
                  onChanged={() => setVersion((v) => v + 1)}
                  onOpen={() => onOpenProfile(user.id)}
                  user={user}
                />
              ))}
            </Section>
          ) : null}
          {showMarkets && results.marketIds.length ? (
            <Section title="Markets">
              {results.marketIds.map((id) => {
                const market = markets.find((item) => item.id === id);
                return market ? (
                  <Pressable key={id} onPress={() => onOpenMarketPosts(id)} style={styles.market}>
                    <View style={styles.marketIcon}>
                      <Ionicons color={colors.accent} name="stats-chart" size={16} />
                    </View>
                    <View style={styles.marketCopy}>
                      <Text style={styles.marketTitle}>{market.title}</Text>
                      <Text style={styles.marketMeta}>
                        {market.category} · {market.volume}
                      </Text>
                    </View>
                    <Ionicons color={colors.textMuted} name="chevron-forward" size={17} />
                  </Pressable>
                ) : null;
              })}
            </Section>
          ) : null}
          {showPosts && results.posts.length ? (
            <Section title="Posts">
              {results.posts.map((post: SocialPost) => (
                <SocialPostCard
                  key={post.id}
                  onChanged={() => setVersion((v) => v + 1)}
                  onComment={() => onOpenPost(post.id)}
                  onOpenAnalysis={onOpenAnalysis}
                  onOpenMarket={onOpenMarket}
                  onOpenPortfolio={onOpenPortfolio}
                  onOpenPost={onOpenPost}
                  onOpenProfile={onOpenProfile}
                  onQuote={onQuote}
                  post={post}
                />
              ))}
            </Section>
          ) : null}
          {!results.users.length && !results.posts.length && !results.marketIds.length ? (
            <Text style={styles.none}>No results for “{query}”.</Text>
          ) : null}
        </>
      )}
    />
  ) : (
    <View style={styles.recent}>
      <Text style={styles.sectionTitle}>Recent searches</Text>
      {recent.map((item) => (
        <Pressable key={item} onPress={() => setQuery(item)} style={styles.recentRow}>
          <Ionicons color={colors.textMuted} name="time-outline" size={17} />
          <Text style={styles.recentText}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
  return (
    <View style={styles.root}>
      <SocialScreenHeader onBack={onBack} title="Search" />
      <View style={styles.searchRow}>
        <Ionicons color={colors.textMuted} name="search" size={17} />
        <TextInput
          autoFocus
          onChangeText={setQuery}
          placeholder="Search people, posts, markets"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          value={query}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")}>
            <Ionicons color={colors.textMuted} name="close-circle" size={17} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.tabs}>
        {(["top", "people", "posts", "markets"] as SearchTab[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.active]}
          >
            <Text style={[styles.tabText, tab === item && styles.activeText]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      {content}
    </View>
  );
}
function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 42,
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, color: colors.text, fontSize: 10 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10 },
  active: { borderBottomWidth: 2, borderBottomColor: colors.text },
  tabText: { color: colors.textMuted, fontSize: 9 },
  activeText: { color: colors.text, fontWeight: "700" },
  content: { paddingBottom: 40 },
  section: { marginTop: 8 },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  market: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  marketIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#25272C",
    alignItems: "center",
    justifyContent: "center",
  },
  marketCopy: { flex: 1 },
  marketTitle: { color: colors.text, fontSize: 10, fontWeight: "600" },
  marketMeta: { color: colors.textMuted, fontSize: 8, marginTop: 4 },
  recent: { paddingTop: 5 },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  recentText: { color: colors.text, fontSize: 10 },
  none: { color: colors.textMuted, textAlign: "center", padding: 40, fontSize: 10 },
});
