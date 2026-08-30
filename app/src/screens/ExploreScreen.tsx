import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PredictionOrderModal, type PredictionOrder } from '../components/PredictionOrderModal';
import { markets } from '../services/marketData';
import { colors } from '../theme/colors';
import type { Market } from '../types/market';
import { AIAnalysisButton } from '../components/AIAnalysisButton';

const exploreMarkets: Market[] = [
  { id: 'ceasefire', title: 'US–Iran ceasefire continues through…?', category: 'Recommend', subcategory: 'World', volume: '$3.96M', more: 2, outcomes: [{ label: 'August 25', odds: '1.00x', probability: 100 }, { label: 'August 31', odds: '1.03x', probability: 97 }, { label: 'September 15', odds: '1.09x', probability: 91 }], rules: 'This market resolves according to official statements from both governments and a consensus of credible international reporting.' },
  { id: 'nba-2027', title: 'NBA · 2027 Champion', category: 'Sports', subcategory: 'NBA Finals', volume: '$19.11M', more: 27, outcomes: [{ label: 'Oklahoma City Thunder', odds: '4.54x', probability: 22 }, { label: 'San Antonio Spurs', odds: '5.00x', probability: 20 }, { label: 'Philadelphia 76ers', odds: '7.69x', probability: 13 }], rules: 'This market resolves to the team officially declared the 2027 NBA champion.' },
  markets.find((market) => market.id === 'bitcoin-2026')!,
];

export function ExploreScreen({ onAskAI, onMarket }: { onAskAI: (market: Market) => void; onMarket: (market: Market) => void }) {
  const [index, setIndex] = useState(0);
  const [order, setOrder] = useState<PredictionOrder | null>(null);
  const market = exploreMarkets[index] ?? exploreMarkets[0]!;
  const next = () => setIndex((current) => (current + 1) % exploreMarkets.length);
  const predict = (outcome: Market['outcomes'][number]) => setOrder({ marketTitle: market.title, outcomeLabel: outcome.label, odds: outcome.odds, tradeAction: outcome.tradeAction });

  return <View style={styles.root}>
    <View style={styles.header}><Ionicons color={colors.text} name="chevron-back" size={31} /><Text style={styles.title}>Explore</Text><View style={styles.actions}><Pressable onPress={next}><Ionicons color={colors.text} name="refresh" size={27} /></Pressable><Ionicons color={colors.text} name="settings-outline" size={27} /></View></View>
    <Pressable onPress={() => onMarket(market)} style={styles.card}>
      <View style={[styles.hero, market.category === 'Sports' ? styles.sportsHero : market.category === 'Crypto' ? styles.cryptoHero : styles.worldHero]}><Text style={styles.badge}>{market.subcategory}</Text><Text style={styles.heroIcon}>{market.category === 'Sports' ? '🏀' : market.category === 'Crypto' ? '₿' : '🇺🇸  🇮🇷'}</Text><Text style={styles.marketTitle}>{market.title}</Text></View>
      <View style={styles.outcomes}>
        {market.outcomes.slice(0, 3).map((outcome) => <View key={outcome.label} style={styles.outcome}><View style={styles.smallIcon}><Text>{market.category === 'Sports' ? '🏆' : market.category === 'Crypto' ? '₿' : '🇺🇸'}</Text></View><Text numberOfLines={1} style={styles.outcomeName}>{outcome.label}</Text><Text style={styles.odds}>{outcome.odds}</Text><Pressable onPress={(event) => { event.stopPropagation(); predict(outcome); }} style={({ pressed }) => [styles.probability, outcome.tradeAction === 'Sell' && styles.sellAction, pressed && styles.actionPressed]}><Text style={[styles.probabilityText, outcome.tradeAction === 'Sell' && styles.sellActionText]}>{market.category === 'Crypto' ? outcome.tradeAction : `${outcome.probability}%`}</Text></Pressable></View>)}
        <AIAnalysisButton onPress={() => onAskAI(market)} />
        <View style={styles.meta}><Text style={styles.metaText}>{market.volume} Volume</Text><Text style={styles.metaText}>+{market.more} More⌄</Text></View>
      </View>
    </Pressable>
    <View style={styles.decisions}><Pressable onPress={next} style={styles.reject}><Ionicons color={colors.textMuted} name="close" size={38} /></Pressable></View>
    <PredictionOrderModal order={order} onClose={() => setOrder(null)} />
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, paddingHorizontal: 14 }, header: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', transform: [{ scale: 0.78 }] }, title: { color: colors.text, fontSize: 17, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 16 }, card: { marginTop: 22, borderRadius: 24, overflow: 'hidden', backgroundColor: '#17191B', shadowColor: '#000', shadowOpacity: .45, shadowRadius: 13, elevation: 6 }, hero: { height: 203, padding: 15, justifyContent: 'flex-end' }, worldHero: { backgroundColor: '#6A2936' }, sportsHero: { backgroundColor: '#B9A16D' }, cryptoHero: { backgroundColor: '#805312' }, badge: { position: 'absolute', top: 15, left: 15, color: colors.text, fontSize: 11, backgroundColor: 'rgba(0,0,0,.25)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 }, heroIcon: { position: 'absolute', top: 50, alignSelf: 'center', fontSize: 49 }, marketTitle: { color: colors.text, fontSize: 19, lineHeight: 25, fontWeight: '700' }, outcomes: { padding: 11, gap: 9 }, outcome: { minHeight: 46, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#232528', borderRadius: 8 }, smallIcon: { width: 23, height: 23, borderRadius: 12, backgroundColor: colors.button, alignItems: 'center', justifyContent: 'center' }, outcomeName: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '600' }, odds: { color: colors.textMuted, fontSize: 10 }, probability: { width: 59, backgroundColor: '#34411F', borderRadius: 6, paddingVertical: 7, alignItems: 'center' }, actionPressed: { opacity: .65, transform: [{ scale: .97 }] }, probabilityText: { color: colors.accent, fontSize: 13 }, sellAction: { backgroundColor: '#411A23' }, sellActionText: { color: '#FF466B' }, meta: { flexDirection: 'row', justifyContent: 'space-between', padding: 4 }, metaText: { color: colors.textMuted, fontSize: 10 }, decisions: { flexDirection: 'row', justifyContent: 'center', gap: 36, marginTop: 40 }, reject: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#202226', alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.8 }] }, favorite: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFC528', alignItems: 'center', justifyContent: 'center', transform: [{ scale: 0.8 }] } });
