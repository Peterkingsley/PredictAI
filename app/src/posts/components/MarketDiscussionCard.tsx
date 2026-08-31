import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getMarketPosts } from '../../services/social';
import { colors } from '../../theme/colors';

export function MarketDiscussionCard({ marketId, onOpen }: { marketId: string; onOpen: () => void }) {
  const [count, setCount] = useState(0); useEffect(() => { void getMarketPosts(marketId).then((posts) => setCount(posts.length)); }, [marketId]);
  return <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><View style={styles.icon}><Ionicons color={colors.textMuted} name="chatbubbles-outline" size={20}/></View><View style={styles.copy}><Text style={styles.title}>Community discussion</Text><Text style={styles.meta}>{count ? `${count} posts with public market views` : 'Start the conversation on this market'}</Text></View><Text style={styles.open}>View</Text><Ionicons color={colors.textMuted} name="chevron-forward" size={17}/></Pressable>;
}
const styles = StyleSheet.create({ card: { minHeight: 72, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: '#131517', flexDirection: 'row', alignItems: 'center', gap: 10 }, pressed: { opacity: .65 }, icon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, title: { color: colors.text, fontSize: 13, fontWeight: '600' }, meta: { color: colors.textMuted, fontSize: 11, marginTop: 4 }, open: { color: colors.text, fontSize: 11, fontWeight: '600' } });
