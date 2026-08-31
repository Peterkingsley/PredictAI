import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { PublicPortfolioSnapshot } from '../../types/social';
import { formatPercent, formatPrice } from '../../utils/socialFormatters';
import { PerformanceLineChart } from './PerformanceLineChart';

const portfolioShapes: Record<PublicPortfolioSnapshot['timeframe'], number[]> = {
  '24H': [0, .12, .05, .2, .15, .32, .27, .45, .39, .56, .51, .68, .62, .78, .73, .88, .84, 1],
  '7D': [0, -.03, .1, .06, .21, .17, .34, .29, .43, .39, .57, .52, .66, .61, .77, .72, .9, 1],
  '30D': [0, .07, .03, .18, .14, .29, .25, .41, .36, .53, .48, .64, .59, .78, .73, .9, .84, 1],
  ALL: [0, .1, .19, .14, .27, .23, .38, .46, .42, .55, .51, .67, .61, .75, .71, .86, .82, 1],
};

export function PublicPortfolioCard({ portfolio, onOpen }: { portfolio: PublicPortfolioSnapshot; onOpen?: () => void }) {
  const positive = portfolio.performancePercent >= 0;
  const ordered = [...portfolio.positions].sort((a, b) => b.performancePercent - a.performancePercent);
  const best = ordered[0];
  const worst = ordered[ordered.length - 1];
  const chartValues = portfolioShapes[portfolio.timeframe].map((point) => point * portfolio.performancePercent);
  const content = <>
    <View style={styles.heading}><Text style={styles.title}>{portfolio.timeframe} Portfolio</Text>{portfolio.showPerformance ? <Text style={[styles.performance, { color: positive ? colors.accent : colors.danger }]}>{formatPercent(portfolio.performancePercent, 2)}</Text> : null}</View>
    {portfolio.showChart ? <View style={styles.chart}><PerformanceLineChart color={positive ? colors.accent : colors.danger} height={82} values={chartValues}/></View> : null}
    {portfolio.positions.length ? <><Text style={styles.holdingsTitle}>Holdings</Text><View style={styles.positions}>{portfolio.positions.slice(0, 5).map((position) => <View key={position.id} style={styles.row}><View style={styles.asset}><Text style={styles.symbol}>{position.assetSymbol}</Text><Text style={styles.assetName}>{position.assetName}</Text></View>{portfolio.showAllocation && position.allocationPercent !== undefined ? <Text style={styles.rowValue}>{position.allocationPercent}%</Text> : portfolio.showPerformance ? <Text style={[styles.rowPerformance, { color: position.performancePercent >= 0 ? colors.accent : colors.danger }]}>{formatPercent(position.performancePercent)}</Text> : <Text style={styles.muted}>Public</Text>}</View>)}</View></> : null}
    {portfolio.showBestWorst && best ? <View style={styles.summary}><SummaryRow label="Best performer" value={`${best.assetSymbol}  ${formatPercent(best.performancePercent)}`} positive={best.performancePercent >= 0}/>{worst && worst.id !== best.id ? <SummaryRow label="Worst performer" value={`${worst.assetSymbol}  ${formatPercent(worst.performancePercent)}`} positive={worst.performancePercent >= 0}/> : null}</View> : null}
    {portfolio.showTotalValue && portfolio.totalValue ? <View style={styles.metaRow}><Text style={styles.muted}>Public portfolio value</Text><Text style={styles.rowValue}>{formatPrice(portfolio.totalValue)}</Text></View> : null}
    {portfolio.showWinLoss ? <Text style={styles.record}>{portfolio.wins} wins · {portfolio.losses} losses</Text> : null}
    {onOpen ? <View style={styles.linkRow}><Text style={styles.link}>View full portfolio</Text><Text style={styles.arrow}>→</Text></View> : null}
  </>;
  return onOpen ? <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.card}>{content}</View>;
}

function SummaryRow({ label, positive, value }: { label: string; positive: boolean; value: string }) { return <View style={styles.metaRow}><Text style={styles.muted}>{label}</Text><Text style={[styles.summaryValue, { color: positive ? colors.accent : colors.danger }]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  card: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#25282C', backgroundColor: '#131517', padding: 16 },
  pressed: { opacity: .72 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 15, fontWeight: '600' },
  performance: { fontSize: 20, fontWeight: '700' },
  chart: { marginTop: 12 },
  holdingsTitle: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 4 },
  positions: { gap: 2 },
  row: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  asset: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  symbol: { color: colors.text, fontSize: 13, fontWeight: '600' },
  assetName: { color: colors.textMuted, fontSize: 11 },
  rowPerformance: { fontSize: 13, fontWeight: '600' },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '500' },
  muted: { color: colors.textMuted, fontSize: 11 },
  summary: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 8, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  summaryValue: { fontSize: 12, fontWeight: '600' },
  record: { color: colors.textMuted, fontSize: 11, marginTop: 12 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 14, paddingTop: 12 },
  link: { color: colors.text, fontSize: 12, fontWeight: '600' },
  arrow: { color: colors.textMuted, fontSize: 15 },
});
