import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function ConsensusComparisonCard({ ai, community, market }: { ai: number; community: number; market: number }) {
  const edge = ai - market;
  return <View style={styles.card}><View style={styles.values}><View><Text style={styles.label}>MARKET</Text><Text style={styles.market}>{market}%</Text></View><View><Text style={styles.label}>PREDICTAI</Text><Text style={styles.ai}>{ai}%</Text></View><View><Text style={styles.label}>POSTS</Text><Text style={styles.posts}>{community}%</Text></View></View><Text style={styles.context}>PredictAI is {edge >= 0 ? '+' : ''}{edge}% {edge >= 0 ? 'above' : 'below'} market · Community view is separate</Text></View>;
}
const styles = StyleSheet.create({ card: { borderRadius: 12, backgroundColor: '#17191B', borderWidth: 1, borderColor: colors.border, padding: 13 }, values: { flexDirection: 'row', justifyContent: 'space-between' }, label: { color: colors.textMuted, fontSize: 7, fontWeight: '700' }, market: { color: colors.text, fontSize: 19, fontWeight: '700', marginTop: 3 }, ai: { color: colors.accent, fontSize: 19, fontWeight: '700', marginTop: 3 }, posts: { color: '#43C6D5', fontSize: 19, fontWeight: '700', marginTop: 3 }, context: { color: colors.textMuted, fontSize: 8, marginTop: 12, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.border } });
