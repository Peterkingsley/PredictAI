import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CryptoProbabilityChart } from '../components/CryptoProbabilityChart';
import { PredictionOrderModal, type PredictionOrder } from '../components/PredictionOrderModal';
import { colors, marketOutcomeColors } from '../theme/colors';
import type { Market } from '../types/market';

const ranges = ['1D', '1W', '1M', 'All'] as const;

export function CryptoMarketDetailScreen({ market, onBack }: { market: Market; onBack: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [order, setOrder] = useState<PredictionOrder | null>(null);
  const selectOutcome = (outcome: Market['outcomes'][number]) => {
    setSelectedOutcome(outcome.label);
    setOrder({ marketTitle: market.title, outcomeLabel: outcome.label, odds: outcome.odds, tradeAction: outcome.tradeAction });
  };

  return <View style={styles.root}>
    <View style={styles.header}>
      <Pressable hitSlop={12} onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={27} /></Pressable>
      <Ionicons color={colors.text} name="settings-outline" size={25} />
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text allowFontScaling={false} style={styles.title}>{market.title}</Text>
      <View style={styles.legend}>
        {market.outcomes.slice(0, 4).map((outcome, index) => <View key={outcome.label} style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: outcome.color ?? marketOutcomeColors[index] ?? colors.accent }]} />
          <Text allowFontScaling={false} style={styles.legendLabel}>{outcome.label}</Text>
          <Text allowFontScaling={false} style={styles.legendValue}>{outcome.probability}%</Text>
        </View>)}
      </View>
      <CryptoProbabilityChart outcomes={market.outcomes} />
      <View style={styles.marketToolbar}>
        <Text allowFontScaling={false} style={styles.volume}>{market.volume} <Text style={styles.volumeLabel}>Volume</Text></Text>
        <View style={styles.ranges}>{ranges.map((range) => <Text allowFontScaling={false} key={range} style={[styles.range, range === '1D' && styles.rangeActive]}>{range}</Text>)}<Ionicons color={colors.textMuted} name="list-outline" size={21} /></View>
      </View>
      <View style={styles.outcomes}>
        {(expanded ? market.outcomes : market.outcomes.slice(0, 3)).map((outcome) => <Pressable key={outcome.label} onPress={() => selectOutcome(outcome)} style={[styles.outcomeRow, selectedOutcome === outcome.label && styles.outcomeSelected]}>
          <View style={styles.coin}><Text allowFontScaling={false} style={styles.coinText}>₿</Text></View>
          <Text allowFontScaling={false} style={styles.outcomeLabel}>{outcome.label}</Text>
          <Text allowFontScaling={false} style={styles.odds}>{outcome.odds}</Text>
          <View style={styles.probability}><Text allowFontScaling={false} style={styles.probabilityText}>{outcome.probability}%</Text></View>
        </Pressable>)}
      </View>
      {!expanded ? <Pressable onPress={() => setExpanded(true)} style={styles.more}><Text allowFontScaling={false} style={styles.moreText}>+{market.more} more</Text><Ionicons color={colors.textMuted} name="chevron-down" size={19} /></Pressable> : null}
      <View style={styles.rules}>
        <Text allowFontScaling={false} style={styles.rulesTitle}>Rules</Text>
        <View style={styles.rulesUnderline} />
        <Text allowFontScaling={false} style={styles.rulesText}>{market.rules}</Text>
      </View>
    </ScrollView>
    <PredictionOrderModal order={order} onClose={() => { setOrder(null); setSelectedOutcome(''); }} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 58, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 19 },
  content: { paddingHorizontal: 17, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '600', marginTop: 7 },
  legend: { marginTop: 16, gap: 10 },
  legendRow: { minHeight: 18, flexDirection: 'row', alignItems: 'center', gap: 9 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: '#74777F', fontSize: 13 },
  legendValue: { color: colors.text, fontSize: 14 },
  marketToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  volume: { color: colors.text, fontSize: 16, fontWeight: '600' },
  volumeLabel: { fontWeight: '400' },
  ranges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  range: { minWidth: 32, paddingHorizontal: 7, paddingVertical: 8, color: '#666971', fontSize: 12, textAlign: 'center' },
  rangeActive: { color: colors.text, backgroundColor: '#25272C', borderRadius: 7 },
  outcomes: { marginTop: 16 },
  outcomeRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10 },
  outcomeSelected: { marginHorizontal: -7, paddingHorizontal: 7, borderRadius: 10, backgroundColor: '#171D12' },
  coin: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F7931A', alignItems: 'center', justifyContent: 'center' },
  coinText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  outcomeLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' },
  odds: { color: '#62656D', fontSize: 12 },
  probability: { width: 72, paddingVertical: 10, borderRadius: 9, backgroundColor: '#263713', alignItems: 'center' },
  probabilityText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  more: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20, paddingVertical: 12 },
  moreText: { color: colors.textMuted, fontSize: 13 },
  rules: { marginTop: 72 },
  rulesTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  rulesUnderline: { width: 48, height: 2, marginTop: 9, backgroundColor: colors.text },
  rulesText: { color: colors.textMuted, fontSize: 12, lineHeight: 19, marginTop: 18 },
});
