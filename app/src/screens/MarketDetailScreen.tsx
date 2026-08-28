import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ProbabilityChart } from '../components/ProbabilityChart';
import { PredictionOrderModal, type PredictionOrder } from '../components/PredictionOrderModal';
import { colors, marketOutcomeColors } from '../theme/colors';
import type { Market } from '../types/market';
import { CryptoMarketDetailScreen } from './CryptoMarketDetailScreen';

function PredictionChoice({ label, value, negative, selected, onSelect }: { label: string; value: string; negative?: boolean; selected: boolean; onSelect: () => void }) {
  return <Pressable onPress={onSelect} style={[styles.choice, negative && styles.negative, selected && styles.choiceSelected]}><Text allowFontScaling={false} numberOfLines={1} style={[styles.choiceText, semanticStyles.flexLabel, negative && styles.negativeText]}>{label}</Text><Text allowFontScaling={false} style={[styles.choiceText, negative && styles.negativeText]}>{value}</Text></Pressable>;
}

function OutcomeChoice({ label, odds, value, color, sell, selected, onSelect }: { label: string; odds: string; value: string; color: string; sell?: boolean; selected: boolean; onSelect: () => void }) {
  return <Pressable onPress={onSelect} style={[semanticStyles.outcomeChoice, selected && semanticStyles.outcomeSelected]}><View style={[semanticStyles.outcomeDot, { backgroundColor: color }]} /><Text allowFontScaling={false} numberOfLines={2} style={semanticStyles.outcomeLabel}>{label}</Text><Text allowFontScaling={false} style={semanticStyles.outcomeOdds}>{odds}</Text><View style={[semanticStyles.outcomeProbability, sell && semanticStyles.sellAction]}><Text allowFontScaling={false} style={[semanticStyles.outcomeProbabilityText, sell && semanticStyles.sellActionText]}>{value}</Text></View></Pressable>;
}

export function MarketDetailScreen({ market, onBack }: { market: Market; onBack: () => void }) {
  const [selectedPrediction, setSelectedPrediction] = useState('');
  const [order, setOrder] = useState<PredictionOrder | null>(null);
  const select = (id: string, outcomeLabel: string, odds: string) => {
    setSelectedPrediction(id);
    setOrder({ marketTitle: market.title, outcomeLabel, odds });
  };
  const sports = market.category === 'Sports';
  const crypto = market.category === 'Crypto';

  if (crypto) return <CryptoMarketDetailScreen market={market} onBack={onBack} />;

  return <View style={styles.root}>
    <View style={styles.header}><Pressable onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={25} /></Pressable><Ionicons color={colors.text} name="settings-outline" size={23} /></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text allowFontScaling={false} style={styles.title}>{market.title}</Text>
      {market.outcomes.slice(0, 4).map((outcome, index) => <View key={outcome.label} style={styles.legend}><View style={[styles.legendDot, { backgroundColor: outcome.color ?? marketOutcomeColors[index] ?? colors.accent }]} /><Text allowFontScaling={false} numberOfLines={1} style={styles.legendLabel}>{outcome.label}</Text><Text allowFontScaling={false} style={[styles.legendValue, outcome.tradeAction === 'Sell' && styles.sellLegendValue]}>{crypto ? outcome.tradeAction : `${outcome.probability}%`}</Text></View>)}
      <ProbabilityChart outcomes={market.outcomes} />
      <View style={styles.volumeRow}><Text allowFontScaling={false} style={styles.volume}>{market.volume} <Text style={styles.volumeLabel}>Volume</Text></Text><View style={styles.ranges}>{['1D', '1W', '1M', 'All'].map((range) => <Text allowFontScaling={false} key={range} style={[styles.range, range === '1D' && styles.rangeActive]}>{range}</Text>)}</View></View>
      {sports ? <><View style={styles.sectionTabs}><Text style={styles.sectionActive}>Game Lines</Text><Text style={styles.sectionTab}>Exact Score</Text><Text style={styles.sectionTab}>Halves</Text></View><View style={styles.lineCard}><Text allowFontScaling={false} style={styles.lineTitle}>Moneyline</Text><Text allowFontScaling={false} style={styles.lineMeta}>{market.volume} Volume</Text><View style={styles.choiceRow}>{market.outcomes.slice(0, 3).map((outcome, index) => <PredictionChoice key={outcome.label} label={outcome.label} value={`${outcome.probability}%`} negative={index === 2} selected={selectedPrediction === `moneyline-${index}`} onSelect={() => select(`moneyline-${index}`, outcome.label, outcome.odds)} />)}</View></View></> : <View style={semanticStyles.outcomesSection}><Text allowFontScaling={false} style={styles.lineTitle}>Choose an outcome</Text><Text allowFontScaling={false} style={styles.lineMeta}>{market.volume} Volume</Text>{market.outcomes.map((outcome, index) => <OutcomeChoice key={outcome.label} label={outcome.label} odds={outcome.odds} value={`${outcome.probability}%`} color={outcome.color ?? marketOutcomeColors[index] ?? colors.accent} selected={selectedPrediction === `outcome-${index}`} onSelect={() => select(`outcome-${index}`, outcome.label, outcome.odds)} />)}</View>}
      {sports ? <>
        <View style={styles.expandHeading}><Text allowFontScaling={false} style={styles.lineTitle}>Spreads</Text><Ionicons color={colors.text} name="chevron-up" size={19} /></View>
        <Text allowFontScaling={false} style={styles.selectorTitle}>Spreads: <Text style={styles.accent}>1.5</Text></Text><View style={styles.selectorTicks}>{['2.5', '1.5', '1.5', '2.5'].map((tick, index) => <View key={`${tick}-${index}`} style={styles.tick}><Text style={[styles.tickText, index === 2 && styles.tickActive]}>{tick}</Text><View style={[styles.tickLine, index === 2 && styles.tickLineActive]} /></View>)}</View>
        <View style={styles.choiceRow}><PredictionChoice label="Wuhan +1.5" value="65%" selected={selectedPrediction === 'spread-home'} onSelect={() => select('spread-home', 'Wuhan +1.5', '1.54x')} /><PredictionChoice label="Henan -1.5" value="2%" negative selected={selectedPrediction === 'spread-away'} onSelect={() => select('spread-away', 'Henan -1.5', '50.00x')} /></View>
        <View style={styles.divider} /><View style={styles.expandHeading}><Text allowFontScaling={false} style={styles.lineTitle}>Totals</Text><Ionicons color={colors.text} name="chevron-up" size={19} /></View>
        <Text allowFontScaling={false} style={styles.selectorTitle}>Totals: <Text style={styles.accent}>2.5</Text></Text><View style={styles.selectorTicks}>{['0.5', '1.5', '2.5', '3.5', '4.5'].map((tick, index) => <View key={tick} style={styles.tick}><Text style={[styles.tickText, index === 2 && styles.tickActive]}>{tick}</Text><View style={[styles.tickLine, index === 2 && styles.tickLineActive]} /></View>)}</View>
        <View style={styles.choiceRow}><PredictionChoice label="Over 2.5" value="13%" selected={selectedPrediction === 'total-over'} onSelect={() => select('total-over', 'Over 2.5', '7.69x')} /><PredictionChoice label="Under 2.5" value="46%" negative selected={selectedPrediction === 'total-under'} onSelect={() => select('total-under', 'Under 2.5', '2.17x')} /></View>
        <View style={styles.divider} /><View style={styles.expandHeading}><Text allowFontScaling={false} style={styles.lineTitle}>Both Teams to Score</Text><Ionicons color={colors.text} name="chevron-up" size={19} /></View><View style={styles.choiceRow}><PredictionChoice label="Yes" value="10%" selected={selectedPrediction === 'btts-yes'} onSelect={() => select('btts-yes', 'Both teams to score: Yes', '10.00x')} /><PredictionChoice label="No" value="12%" negative selected={selectedPrediction === 'btts-no'} onSelect={() => select('btts-no', 'Both teams to score: No', '8.33x')} /></View>
      </> : null}
      <View style={styles.rules}><Text allowFontScaling={false} style={styles.rulesTitle}>Rules</Text><Text allowFontScaling={false} style={styles.rulesText}>{market.rules}</Text></View>
      <View style={styles.timeline}><Ionicons color={colors.text} name="calendar-outline" size={17} /><Text allowFontScaling={false} style={styles.timelineText}>Timeline</Text><Ionicons color={colors.text} name="chevron-up" size={18} /></View>
      <View style={styles.timelineStep}><Ionicons color={colors.text} name="checkmark-circle" size={16} /><View><Text style={styles.timelineLabel}>Market open</Text><Text style={styles.timelineDate}>2026-06-27 21:49</Text></View></View><View style={styles.rail} /><View style={styles.timelineStep}><Ionicons color={colors.text} name="checkmark-circle" size={16} /><View><Text style={styles.timelineLabel}>Market closed  <Text style={styles.ended}>Ended</Text></Text><Text style={styles.timelineDate}>2027-07-11 12:00</Text></View></View><View style={styles.rail} /><View style={styles.timelineStep}><Ionicons color={colors.textFaint} name="time" size={16} /><View><Text style={styles.timelineLabel}>Market resolved</Text><Text style={styles.timelineDate}>After official result confirmation</Text></View></View>
    </ScrollView>
    <PredictionOrderModal order={order} onClose={() => { setOrder(null); setSelectedPrediction(''); }} />
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, header: { height: 50, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, headerActions: { flexDirection: 'row', gap: 18 }, content: { paddingHorizontal: 17, paddingBottom: 45 }, title: { color: colors.text, fontSize: 20, lineHeight: 27, fontWeight: '700', marginVertical: 16 }, legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 }, legendDot: { width: 10, height: 10, borderRadius: 5 }, legendLabel: { flex: 1, color: colors.textMuted, fontSize: 14 }, legendValue: { color: colors.text, fontSize: 15, fontWeight: '600' }, sellLegendValue: { color: '#FF466B' }, volumeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 17 }, volume: { color: colors.text, fontSize: 16, fontWeight: '700' }, volumeLabel: { fontWeight: '400' }, ranges: { flexDirection: 'row', gap: 7 }, range: { color: colors.textMuted, fontSize: 12, padding: 8 }, rangeActive: { color: colors.text, backgroundColor: colors.surface, borderRadius: 5 }, sectionTabs: { flexDirection: 'row', gap: 25, borderBottomWidth: 1, borderBottomColor: colors.border }, sectionTab: { color: colors.textMuted, fontSize: 14, paddingBottom: 9 }, sectionActive: { color: colors.text, fontSize: 14, fontWeight: '700', paddingBottom: 9, borderBottomWidth: 2, borderBottomColor: colors.text }, lineCard: { backgroundColor: '#191B1D', borderRadius: 14, padding: 14, marginTop: 17 }, lineTitle: { color: colors.text, fontSize: 16, fontWeight: '700' }, lineMeta: { color: colors.textMuted, fontSize: 12, marginTop: 5 }, choiceRow: { flexDirection: 'row', gap: 8, marginTop: 16 }, choice: { flex: 1, minHeight: 54, borderRadius: 11, backgroundColor: '#2B3A17', padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'transparent' }, choiceSelected: { borderColor: colors.accent }, negative: { backgroundColor: '#411A23' }, choiceText: { color: colors.accent, fontSize: 13 }, negativeText: { color: '#FF466B' }, expandHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }, selectorTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: 18 }, accent: { color: colors.accent }, selectorTicks: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14 }, tick: { alignItems: 'center', gap: 7 }, tickText: { color: colors.textMuted, fontSize: 13 }, tickActive: { color: colors.text }, tickLine: { width: 2, height: 15, backgroundColor: '#46484D' }, tickLineActive: { backgroundColor: colors.accent }, divider: { height: 1, backgroundColor: colors.border, marginTop: 27 }, rules: { paddingTop: 42 }, rulesTitle: { color: colors.text, fontSize: 16, fontWeight: '700', paddingBottom: 7, borderBottomWidth: 2, borderBottomColor: colors.text, alignSelf: 'flex-start' }, rulesText: { color: colors.text, fontSize: 12, lineHeight: 19, marginTop: 14 }, timeline: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 24, paddingTop: 17 }, timelineText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' }, timelineStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 }, timelineLabel: { color: colors.text, fontSize: 12 }, timelineDate: { color: colors.textMuted, fontSize: 10, marginTop: 3 }, rail: { width: 1, height: 24, marginLeft: 8, backgroundColor: colors.textMuted }, ended: { color: colors.accent, backgroundColor: '#2B3A17' } });

const semanticStyles = StyleSheet.create({
  flexLabel: { flex: 1, marginRight: 4 },
  outcomesSection: { backgroundColor: '#191B1D', borderRadius: 14, padding: 14, marginTop: 17 },
  outcomeChoice: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'transparent', borderRadius: 9, paddingHorizontal: 8, marginTop: 7 },
  outcomeSelected: { borderColor: colors.accent, backgroundColor: '#202719' },
  outcomeDot: { width: 10, height: 10, borderRadius: 5 },
  outcomeLabel: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 17 },
  outcomeOdds: { color: colors.textMuted, fontSize: 10 },
  outcomeProbability: { width: 58, paddingVertical: 7, borderRadius: 7, backgroundColor: '#2B3A17', alignItems: 'center' },
  outcomeProbabilityText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  sellAction: { backgroundColor: '#411A23' },
  sellActionText: { color: '#FF466B' },
});
