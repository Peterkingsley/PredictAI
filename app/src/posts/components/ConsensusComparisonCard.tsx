import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function ConsensusComparisonCard({ ai, community, market }: { ai: number; community: number; market: number }) {
  const edge = ai - market;
  return <View style={styles.card}><View style={styles.values}><Metric label="Market" value={market}/><Metric accent label="PredictAI" value={ai}/><Metric label="Posts" value={community}/></View><Text style={styles.context}>PredictAI is {edge >= 0 ? '+' : ''}{edge}% {edge >= 0 ? 'above' : 'below'} market · community view is separate</Text></View>;
}
function Metric({ accent, label, value }: { accent?: boolean; label: string; value: number }) { return <View><Text style={styles.label}>{label}</Text><Text style={[styles.value, accent && styles.accent]}>{value}%</Text></View>; }
const styles = StyleSheet.create({ card: { borderRadius: 12, backgroundColor: '#131517', borderWidth: 1, borderColor: colors.border, padding: 16 }, values: { flexDirection: 'row', justifyContent: 'space-between' }, label: { color: colors.textMuted, fontSize: 11, fontWeight: '500' }, value: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 4 }, accent: { color: colors.accent }, context: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border } });
