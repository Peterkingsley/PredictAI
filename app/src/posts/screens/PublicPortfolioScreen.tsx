import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getPrivacySettings, getUser, getUserPosts } from '../../services/social';
import { colors } from '../../theme/colors';
import type { PublicPortfolioSnapshot, SocialUser } from '../../types/social';
import { PublicPortfolioCard } from '../components/PublicPortfolioCard';
import { PublicPositionCard } from '../components/PublicPositionCard';
import { SocialAvatar } from '../components/SocialAvatar';
import { SocialScreenHeader } from '../components/SocialScreenHeader';

export function PublicPortfolioScreen({ onBack, userId }: { onBack: () => void; userId: string }) {
  const [user, setUser] = useState<SocialUser | null>(null); const [portfolio, setPortfolio] = useState<PublicPortfolioSnapshot | null>(null);
  useEffect(() => { void Promise.all([getUser(userId), getUserPosts(userId)]).then(([nextUser, posts]) => { setUser(nextUser); setPortfolio(posts.find((post) => post.portfolio)?.portfolio ?? null); }); }, [userId]);
  const privacy = getPrivacySettings(); const allowed = user && user.portfolioPublic !== false && (!user.isCurrentUser || (privacy.publicProfile && privacy.showPortfolioPerformance));
  const holdingsVisible = !user?.isCurrentUser || privacy.showHoldings;
  return <View style={styles.root}><SocialScreenHeader onBack={onBack} title="Public portfolio"/>{allowed && portfolio ? <ScrollView contentContainerStyle={styles.content}><View style={styles.identity}><SocialAvatar initials={user.initials} size={46}/><View><Text style={styles.name}>{user.displayName}</Text><Text style={styles.handle}>@{user.username} · shared portfolio</Text></View></View><PublicPortfolioCard portfolio={{ ...portfolio, positions: holdingsVisible ? portfolio.positions : [], showTotalValue: portfolio.showTotalValue && (!user.isCurrentUser || privacy.showTotalPortfolioValue) }}/><Text style={styles.heading}>Shared positions</Text>{holdingsVisible ? portfolio.positions.map((position) => <PublicPositionCard key={position.id} position={position}/>) : <Text style={styles.muted}>Holdings are private.</Text>}<View style={styles.disclosure}><Ionicons color={colors.textMuted} name="shield-checkmark-outline" size={15}/><Text style={styles.disclosureText}>Only information this trader chose to publish is shown. Wallet addresses and private balances remain hidden.</Text></View></ScrollView> : <View style={styles.private}><Ionicons color={colors.textMuted} name="lock-closed-outline" size={31}/><Text style={styles.privateTitle}>This portfolio is private</Text><Text style={styles.muted}>The trader has not shared public performance or positions.</Text></View>}</View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, content: { padding: 15, paddingBottom: 35 }, identity: { flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 5 }, name: { color: colors.text, fontSize: 13, fontWeight: '700' }, handle: { color: colors.textMuted, fontSize: 9, marginTop: 3 }, heading: { color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 23, marginBottom: 1 }, muted: { color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 8, textAlign: 'center' }, disclosure: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 10, backgroundColor: colors.surface, marginTop: 18 }, disclosureText: { flex: 1, color: colors.textMuted, fontSize: 8, lineHeight: 13 }, private: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 35 }, privateTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 12 } });
