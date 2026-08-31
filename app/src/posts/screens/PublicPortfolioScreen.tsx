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
  const [user, setUser] = useState<SocialUser | null>(null);
  const [portfolio, setPortfolio] = useState<PublicPortfolioSnapshot | null>(null);
  useEffect(() => { void Promise.all([getUser(userId), getUserPosts(userId)]).then(([nextUser, posts]) => { setUser(nextUser); setPortfolio(posts.find((post) => post.portfolio)?.portfolio ?? null); }); }, [userId]);
  const privacy = getPrivacySettings();
  const allowed = user && user.portfolioPublic !== false && (!user.isCurrentUser || (privacy.publicProfile && privacy.showPortfolioPerformance));
  const holdingsVisible = !user?.isCurrentUser || privacy.showHoldings;
  return <View style={styles.root}>
    <SocialScreenHeader onBack={onBack} title="Public portfolio"/>
    {allowed && portfolio ? <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.identity}><SocialAvatar initials={user.initials} isCurrentUser={user.isCurrentUser} size={48}/><View><Text style={styles.name}>{user.displayName}</Text><Text style={styles.handle}>@{user.username} · shared portfolio</Text></View></View>
      <PublicPortfolioCard portfolio={{ ...portfolio, positions: holdingsVisible ? portfolio.positions : [], showTotalValue: portfolio.showTotalValue && (!user.isCurrentUser || privacy.showTotalPortfolioValue) }}/>
      <Text style={styles.heading}>Public positions</Text>
      {holdingsVisible ? portfolio.positions.map((position) => <PublicPositionCard key={position.id} position={position}/>) : <Text style={styles.muted}>Holdings are private.</Text>}
      <View style={styles.disclosure}><Ionicons color={colors.textMuted} name="shield-checkmark-outline" size={18}/><Text style={styles.disclosureText}>Only information this trader chose to publish is shown. Wallet addresses and private balances remain hidden.</Text></View>
    </ScrollView> : <View style={styles.private}><Ionicons color={colors.textMuted} name="lock-closed-outline" size={28}/><Text style={styles.privateTitle}>This portfolio is private</Text><Text style={styles.muted}>The trader has not shared public performance or positions.</Text></View>}
  </View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 }, identity: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }, name: { color: colors.text, fontSize: 17, fontWeight: '600' }, handle: { color: colors.textMuted, fontSize: 13, marginTop: 4 }, heading: { color: colors.text, fontSize: 17, fontWeight: '600', marginTop: 32, marginBottom: 4 }, muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 12, textAlign: 'center' }, disclosure: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 16, borderRadius: 10, backgroundColor: '#131517', marginTop: 24 }, disclosureText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 17 }, private: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }, privateTitle: { color: colors.text, fontSize: 17, fontWeight: '600', marginTop: 12 } });
