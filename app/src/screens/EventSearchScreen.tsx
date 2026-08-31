import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MarketCard } from '../components/MarketCard';
import { markets } from '../services/marketData';
import { colors } from '../theme/colors';
import type { Market, Outcome } from '../types/market';

const filters = ['All', 'Trending', 'Sports', 'Crypto'] as const;
type SearchFilter = (typeof filters)[number];

export function EventSearchScreen({ onAskAI, onBack, onMarket, onPredict }: { onAskAI: (market: Market) => void; onBack: () => void; onMarket: (market: Market) => void; onPredict: (market: Market, outcome: Outcome) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('All');
  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    return markets.filter((market) => {
      const selectedCategory = filter === 'Trending' ? 'Recommend' : filter;
      const matchesFilter = filter === 'All' || market.category === selectedCategory;
      const searchable = [market.title, market.category, market.subcategory, ...market.outcomes.map((outcome) => outcome.label)].join(' ').toLowerCase();
      return matchesFilter && (!search || searchable.includes(search));
    });
  }, [filter, query]);

  return <View style={styles.root}>
    <View style={styles.header}>
      <Pressable accessibilityLabel="Back to home" hitSlop={10} onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={25} /></Pressable>
      <View style={styles.searchField}><Ionicons color={colors.textMuted} name="search-outline" size={18} /><TextInput autoCapitalize="none" autoCorrect={false} autoFocus clearButtonMode="never" onChangeText={setQuery} placeholder="Search events" placeholderTextColor={colors.textMuted} returnKeyType="search" selectionColor={colors.accent} style={styles.input} value={query} />{query ? <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')}><Ionicons color={colors.textMuted} name="close-circle" size={18} /></Pressable> : null}</View>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{filters.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text allowFontScaling={false} style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>)}</ScrollView>

    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.resultHeading}><View><Text allowFontScaling={false} style={styles.resultTitle}>{query.trim() ? 'Search results' : filter === 'All' ? 'Browse events' : `${filter} events`}</Text><Text allowFontScaling={false} style={styles.resultCount}>{results.length} event{results.length === 1 ? '' : 's'} found</Text></View>{query.trim() ? <View style={styles.queryTag}><Text allowFontScaling={false} numberOfLines={1} style={styles.queryText}>“{query.trim()}”</Text></View> : null}</View>
      {results.length > 0 ? <View style={styles.results}>{results.map((market) => <MarketCard key={market.id} market={market} onAskAI={() => onAskAI(market)} onPredict={(outcome) => onPredict(market, outcome)} onPress={() => onMarket(market)} />)}</View> : <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons color={colors.textMuted} name="search-outline" size={31} /></View><Text allowFontScaling={false} style={styles.emptyTitle}>No events found</Text><Text allowFontScaling={false} style={styles.emptyText}>Try another event name, participant, category, or outcome.</Text><Pressable onPress={() => { setQuery(''); setFilter('All'); }} style={styles.reset}><Text allowFontScaling={false} style={styles.resetText}>Clear filters</Text></Pressable></View>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 58, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchField: { flex: 1, height: 39, borderRadius: 10, paddingHorizontal: 11, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#34363B' },
  input: { flex: 1, color: colors.text, fontSize: 12, paddingVertical: 0 },
  filters: { height: 52, paddingHorizontal: 14, alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  filter: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 18, backgroundColor: '#191B1D' },
  filterActive: { backgroundColor: '#2B3A17', borderWidth: 1, borderColor: '#4C6826' },
  filterText: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  filterTextActive: { color: colors.accent },
  content: { padding: 14, paddingBottom: 42 },
  resultHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  resultTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  resultCount: { color: colors.textMuted, fontSize: 9, marginTop: 4 },
  queryTag: { maxWidth: 130, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, backgroundColor: colors.surface },
  queryText: { color: colors.textMuted, fontSize: 9 },
  results: { gap: 12 },
  empty: { alignItems: 'center', paddingHorizontal: 35, paddingTop: 78 },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 17 },
  emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7 },
  reset: { marginTop: 17, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9, backgroundColor: '#2B3A17' },
  resetText: { color: colors.accent, fontSize: 10, fontWeight: '700' },
});
