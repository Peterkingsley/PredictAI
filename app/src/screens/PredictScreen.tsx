import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MarketCard } from '../components/MarketCard';
import { AnnouncementCarousel } from '../components/FeaturedMarketsCarousel';
import { markets } from '../services/marketData';
import { colors } from '../theme/colors';
import type { Market } from '../types/market';
import { DepositScreen } from './DepositScreen';
import { HomeWalletHeader } from '../components/HomeWalletHeader';

const categories = ['Recommend', 'All', 'Sports', 'Crypto'] as const;
const subcategories = { Recommend: ['HOT', 'Favorite'], All: ['HOT', 'New'], Sports: ['Soccer', 'NBA', 'NFL', 'EPL'], Crypto: ['Target Price', 'Tiered', 'Airdrops'] } as const;

export function PredictScreen({ onMarket }: { onMarket: (market: Market) => void }) {
  const [category, setCategory] = useState<(typeof categories)[number]>('Recommend');
  const [sub, setSub] = useState('HOT');
  const [allMarket, setAllMarket] = useState<Market | null>(null);
  const [depositing, setDepositing] = useState(false);
  const visible = useMemo(() => category === 'All' ? markets : markets.filter((market) => market.category === category), [category]);
  const chooseCategory = (next: (typeof categories)[number]) => { setCategory(next); setSub(subcategories[next][0]); };

  if (depositing) return <DepositScreen onBack={() => setDepositing(false)} />;

  return <View style={styles.root}>
    <ScrollView showsVerticalScrollIndicator={false}>
    <HomeWalletHeader onDeposit={() => setDepositing(true)} />
    {category === 'Recommend' ? <AnnouncementCarousel /> : null}
    <View style={styles.ticker}><Ionicons color={colors.textMuted} name="volume-medium-outline" size={20} /><Text numberOfLines={1} style={styles.tickerText}>Live markets · Trade on real-world outcomes responsibly</Text></View>
    <View style={styles.categories}>{categories.map((item) => <Pressable key={item} onPress={() => chooseCategory(item)}><Text style={[styles.category, category === item && styles.categoryActive]}>{item}</Text></Pressable>)}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subcategories}>{subcategories[category].map((item) => <Pressable key={item} onPress={() => setSub(item)}><Text style={[styles.subcategory, sub === item && styles.subcategoryActive]}>{item}</Text></Pressable>)}</ScrollView>
    {category === 'Sports' ? <View style={styles.modeRow}><Text style={styles.modeActive}>Matches</Text><Text style={styles.mode}>Betting Games</Text></View> : null}
    <View style={styles.list}>{visible.map((market) => <MarketCard key={market.id} market={market} onPress={() => market.category === 'Sports' ? onMarket(market) : market.outcomes.length > 2 ? setAllMarket(market) : onMarket(market)} />)}</View>
    </ScrollView>
    <Modal animationType="slide" transparent visible={!!allMarket} onRequestClose={() => setAllMarket(null)}><Pressable style={styles.overlay} onPress={() => setAllMarket(null)}><Pressable style={styles.sheet} onPress={() => undefined}><View style={styles.handle} /><Text style={styles.sheetTitle}>All Markets</Text><ScrollView>{allMarket?.outcomes.map((outcome) => <Pressable key={outcome.label} onPress={() => { const selected = allMarket; setAllMarket(null); if (selected) onMarket(selected); }} style={styles.sheetRow}><View style={[styles.dot, { backgroundColor: outcome.color ?? colors.accent }]} /><Text style={styles.sheetName}>{outcome.label}</Text><Text style={styles.sheetOdds}>{outcome.odds}</Text><View style={styles.sheetProbability}><Text style={styles.probabilityText}>{outcome.probability}%</Text></View></Pressable>)}</ScrollView></Pressable></Pressable></Modal>
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, header: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 }, headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 15 }, ticker: { height: 29, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, tickerText: { color: colors.textMuted, fontSize: 10 }, categories: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 18, paddingLeft: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, category: { color: colors.textMuted, fontSize: 13 }, categoryActive: { color: colors.text, fontWeight: '700' }, search: { marginLeft: 'auto', marginRight: 12, backgroundColor: colors.surface, padding: 7, borderRadius: 8 }, subcategories: { height: 36, alignItems: 'center', gap: 20, paddingHorizontal: 14 }, subcategory: { color: colors.textMuted, fontSize: 11, paddingVertical: 10 }, subcategoryActive: { color: colors.text, fontWeight: '700', borderBottomWidth: 2, borderBottomColor: colors.text }, modeRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 14, paddingVertical: 8 }, mode: { color: colors.textMuted, fontSize: 11, padding: 6 }, modeActive: { color: colors.text, fontSize: 11, padding: 6, backgroundColor: colors.surface, borderRadius: 5 }, list: { padding: 14, gap: 12, paddingBottom: 22 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.72)', justifyContent: 'flex-end' }, sheet: { maxHeight: '72%', minHeight: '48%', backgroundColor: '#1A1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18 }, handle: { width: 58, height: 5, borderRadius: 3, backgroundColor: '#484A4F', alignSelf: 'center', marginBottom: 24 }, sheetTitle: { color: colors.text, fontSize: 21, marginBottom: 16 }, sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 52 }, dot: { width: 24, height: 24, borderRadius: 12 }, sheetName: { flex: 1, color: colors.text, fontSize: 14 }, sheetOdds: { color: colors.textMuted, fontSize: 11 }, sheetProbability: { width: 66, paddingVertical: 8, borderRadius: 8, backgroundColor: '#304019', alignItems: 'center' }, probabilityText: { color: colors.accent, fontSize: 15 } });
const walletStyles = StyleSheet.create({ wallet: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 13, borderTopWidth: 1, borderTopColor: colors.border }, toolbar: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 13 }, avatar: { width: 27, height: 27, borderRadius: 14, backgroundColor: colors.button, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: colors.accent }, avatarText: { color: colors.buttonText, fontSize: 12, fontWeight: '800' }, searchBar: { flex: 1, height: 30, borderRadius: 8, paddingHorizontal: 10, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 7 }, searchText: { color: colors.textMuted, fontSize: 12 }, notificationDot: { position: 'absolute', top: -1, right: -1, width: 5, height: 5, borderRadius: 3, backgroundColor: '#F23861' }, balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }, walletLabel: { color: colors.textMuted, fontSize: 11 }, walletValue: { color: colors.text, fontSize: 24, fontWeight: '600', marginTop: 3 }, currency: { fontSize: 12, fontWeight: '400' }, usdValue: { color: colors.textMuted, fontSize: 10, marginTop: 3 }, depositButton: { minWidth: 72, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9, backgroundColor: colors.button, alignItems: 'center' }, depositText: { color: colors.buttonText, fontSize: 13, fontWeight: '500' }, pnl: { color: colors.text, fontSize: 11, marginTop: 10 }, pnlValue: { color: colors.text, fontSize: 11, fontWeight: '500' } });
