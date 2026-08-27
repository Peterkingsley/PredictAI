import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { Market } from '../types/market';

export function MarketCard({ market, onPress }: { market: Market; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.heading}><Text allowFontScaling={false} numberOfLines={2} style={styles.title}>{market.title}</Text><Ionicons color={colors.textMuted} name="star-outline" size={16} /></View>
    {market.outcomes.slice(0, 2).map((outcome, index) => <View key={outcome.label} style={styles.outcome}>
      <View style={[styles.token, { backgroundColor: market.category === 'Crypto' ? '#f7931a' : index ? '#43464d' : colors.accent }]}><Text style={styles.tokenText}>{market.category === 'Crypto' ? '₿' : outcome.label.slice(0, 1)}</Text></View>
      <Text numberOfLines={1} style={styles.outcomeName}>{outcome.label}</Text><Text style={styles.odds}>{outcome.odds}</Text><View style={styles.probability}><Text style={styles.probabilityText}>{outcome.probability}%</Text></View>
    </View>)}
    <View style={styles.meta}><Text style={styles.metaText}>{market.volume} Volume</Text><Text style={styles.metaText}>+{market.more} More⌄</Text></View>
  </Pressable>;
}
const styles = StyleSheet.create({ card: { backgroundColor: '#191B1D', borderRadius: 13, padding: 11, gap: 8 }, pressed: { opacity: .78 }, heading: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 }, title: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 17, fontWeight: '700' }, outcome: { flexDirection: 'row', alignItems: 'center', gap: 7 }, token: { width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, tokenText: { color: '#fff', fontSize: 10, fontWeight: '800' }, outcomeName: { flex: 1, color: colors.text, fontSize: 12 }, odds: { color: colors.textMuted, fontSize: 10 }, probability: { width: 60, paddingVertical: 6, borderRadius: 7, backgroundColor: '#2B3A17', alignItems: 'center' }, probabilityText: { color: colors.accent, fontSize: 13 }, meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }, metaText: { color: colors.textFaint, fontSize: 10 } });
