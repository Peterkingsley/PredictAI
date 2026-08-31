import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { PublicPosition } from '../../types/social';
import { formatPercent, formatPrice } from '../../utils/socialFormatters';

export function PublicPositionCard({ position }: { position: PublicPosition }) {
  const positive = position.performancePercent >= 0;
  const hasDetails = position.showEntryPrice || position.showCurrentPrice || position.showPositionValue || position.showEntryDate || position.showAllocation;
  return <View style={styles.card}>
    <View style={styles.heading}>
      <View style={styles.identity}><Text style={styles.symbol}>{position.assetSymbol}</Text><Text numberOfLines={1} style={styles.name}>{position.assetName}</Text></View>
      {position.showPerformance ? <View style={styles.performance}><Text style={[styles.performanceValue, { color: positive ? colors.accent : colors.danger }]}>{formatPercent(position.performancePercent, 2)}</Text><Text style={styles.performanceLabel}>Since entry</Text></View> : null}
    </View>
    {hasDetails ? <View style={styles.rows}>
      {position.showEntryPrice && position.entryPrice ? <Row label="Entry" value={formatPrice(position.entryPrice)}/> : null}
      {position.showCurrentPrice && position.currentPrice ? <Row label="Current" value={formatPrice(position.currentPrice)}/> : null}
      {position.showPositionValue && position.positionValue ? <Row label="Public value" value={formatPrice(position.positionValue)}/> : null}
      {position.showEntryDate && position.entryDate ? <Row label="Entry date" value={position.entryDate}/> : null}
      {position.showAllocation && position.allocationPercent !== undefined ? <Row label="Allocation" value={`${position.allocationPercent}%`}/> : null}
    </View> : null}
    <Text style={styles.publicLabel}>Public position</Text>
  </View>;
}

function Row({ label, value }: { label: string; value: string }) { return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  card: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#25282C', backgroundColor: '#131517', padding: 16 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  symbol: { color: colors.text, fontSize: 17, fontWeight: '700' },
  name: { flex: 1, color: colors.textMuted, fontSize: 13 },
  performance: { alignItems: 'flex-end' },
  performanceValue: { fontSize: 20, lineHeight: 24, fontWeight: '700' },
  performanceLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  rows: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 16, paddingTop: 12, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: colors.textMuted, fontSize: 13 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '500' },
  publicLabel: { color: colors.textFaint, fontSize: 11, fontWeight: '500', marginTop: 16 },
});
