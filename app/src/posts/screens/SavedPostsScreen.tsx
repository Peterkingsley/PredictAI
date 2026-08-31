import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { getSavedPosts } from '../../services/social';
import { colors } from '../../theme/colors';
import type { SocialPost } from '../../types/social';
import { SocialPostCard } from '../components/SocialPostCard';
import { SocialScreenHeader } from '../components/SocialScreenHeader';

export function SavedPostsScreen({ onBack, onOpenAnalysis, onOpenMarket, onOpenPortfolio, onOpenPost, onOpenProfile, onQuote }: { onBack: () => void; onOpenAnalysis: (id: string) => void; onOpenMarket: (id: string) => void; onOpenPortfolio: (id: string) => void; onOpenPost: (id: string) => void; onOpenProfile: (id: string) => void; onQuote: (id: string) => void }) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [version, setVersion] = useState(0);
  useEffect(() => { void getSavedPosts().then(setPosts); }, [version]);
  return <View style={styles.root}><SocialScreenHeader onBack={onBack} title="Saved posts"/><FlatList contentContainerStyle={!posts.length && styles.fill} data={posts} keyExtractor={(item) => item.id} ListEmptyComponent={<View style={styles.empty}><Ionicons color={colors.textMuted} name="bookmark-outline" size={32}/><Text style={styles.title}>No saved posts yet</Text><Text style={styles.copy}>Posts you save will appear here.</Text></View>} renderItem={({ item }) => <SocialPostCard onChanged={() => setVersion((v) => v + 1)} onComment={() => onOpenPost(item.id)} onOpenAnalysis={onOpenAnalysis} onOpenMarket={onOpenMarket} onOpenPortfolio={onOpenPortfolio} onOpenPost={onOpenPost} onOpenProfile={onOpenProfile} onQuote={onQuote} post={item}/>} /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, fill: { flexGrow: 1 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }, title: { color: colors.text, fontSize: 15, fontWeight: '700' }, copy: { color: colors.textMuted, fontSize: 10, marginTop: 7, textAlign: 'center' } });
