import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAIAnalysisPreview } from '../../services/aiAnalysis';
import { markets } from '../../services/marketData';
import { colors } from '../../theme/colors';

export function SocialMarketCard({ marketId, onOpen }: { marketId: string; onOpen: () => void }) {
  const market = markets.find((item) => item.id === marketId);
  if (!market) return null;
  const ai = getAIAnalysisPreview(market);
  return <Pressable accessibilityRole="button" onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.top}><Ionicons color={colors.textMuted} name={market.category === 'Crypto' ? 'logo-bitcoin' : market.category === 'Sports' ? 'football-outline' : 'analytics-outline'} size={17}/><Text numberOfLines={2} style={styles.title}>{market.title}</Text></View>
    <View style={styles.metrics}><Metric label="Market" value={`${ai.marketProbability}%`}/><Metric accent label="PredictAI" value={`${ai.probability}%`}/><View style={styles.edge}><Text style={styles.label}>AI edge</Text><Text style={[styles.edgeValue, { color: ai.edge >= 0 ? colors.positive : colors.danger }]}>{ai.edge >= 0 ? '+' : ''}{ai.edge}%</Text></View></View>
    <View style={styles.footer}><Text style={styles.volume}>{market.volume} volume</Text><View style={styles.linkRow}><Text style={styles.link}>View market</Text><Ionicons color={colors.textMuted} name="arrow-forward" size={14}/></View></View>
  </Pressable>;
}
function Metric({ accent, label, value }: { accent?: boolean; label: string; value: string }) { return <View><Text style={styles.label}>{label}</Text><Text style={[styles.value, accent && styles.accent]}>{value}</Text></View>; }
const styles = StyleSheet.create({
  card: { marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#25282C', backgroundColor: '#131517', padding: 16 },
  pressed: { opacity: .72 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  metrics: { flexDirection: 'row', alignItems: 'flex-end', gap: 32, marginTop: 16 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  value: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 4 },
  accent: { color: colors.accent },
  edge: { marginLeft: 'auto', alignItems: 'flex-end' },
  edgeValue: { color: colors.accent, fontSize: 16, fontWeight: '700', marginTop: 4 },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 16, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  volume: { color: colors.textMuted, fontSize: 11 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { color: colors.text, fontSize: 12, fontWeight: '600' },
});
