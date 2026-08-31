import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { followUser, getPrivacySettings, getUser, getUserPosts, unfollowUser } from '../../services/social';
import { colors } from '../../theme/colors';
import type { SocialPost, SocialUser } from '../../types/social';
import { formatCompactNumber, formatPercent, formatProbability } from '../../utils/socialFormatters';
import { PerformanceLineChart } from '../components/PerformanceLineChart';
import { PublicPortfolioCard } from '../components/PublicPortfolioCard';
import { PublicPositionCard } from '../components/PublicPositionCard';
import { SocialAvatar } from '../components/SocialAvatar';
import { SocialPostCard } from '../components/SocialPostCard';
import { SocialScreenHeader } from '../components/SocialScreenHeader';

type ProfileTab = 'posts' | 'positions' | 'portfolio';
type PerformanceRange = '7D' | '30D' | '3M' | 'All';

type Props = {
  onBack: () => void;
  onEdit: () => void;
  onFollowers: () => void;
  onFollowing: () => void;
  onOpenAnalysis: (id: string) => void;
  onOpenMarket: (id: string) => void;
  onOpenPortfolio: (id: string) => void;
  onOpenPost: (id: string) => void;
  onOpenProfile: (id: string) => void;
  onPrivacy: () => void;
  onQuote: (id: string) => void;
  onSaved: () => void;
  userId: string;
};

const rangeMultipliers: Record<PerformanceRange, number> = { '7D': .42, '30D': 1, '3M': 1.68, All: 2.35 };
const chartShapes: Record<PerformanceRange, number[]> = {
  '7D': [0, .12, .06, .18, .14, .3, .24, .38, .34, .48, .42, .58, .53, .68, .64, .79, .74, .9, .86, 1],
  '30D': [0, .08, .03, .16, .13, .28, .24, .36, .31, .48, .44, .58, .54, .7, .63, .77, .74, .9, .85, 1],
  '3M': [0, -.04, .08, .02, .16, .24, .19, .31, .28, .44, .39, .52, .48, .61, .58, .72, .7, .83, .91, 1],
  All: [0, .06, .18, .12, .25, .21, .36, .44, .39, .53, .49, .62, .59, .73, .68, .81, .78, .9, .87, 1],
};

export function TraderProfileScreen(props: Props) {
  const { onBack, onEdit, onFollowers, onFollowing, onOpenAnalysis, onOpenMarket, onOpenPortfolio, onOpenPost, onOpenProfile, onPrivacy, onQuote, onSaved, userId } = props;
  const [user, setUser] = useState<SocialUser | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [tab, setTab] = useState<ProfileTab>('posts');
  const [performanceRange, setPerformanceRange] = useState<PerformanceRange>('30D');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    void Promise.all([getUser(userId), getUserPosts(userId)]).then(([nextUser, nextPosts]) => {
      setUser(nextUser ? { ...nextUser } : null);
      setPosts(nextPosts);
    });
  }, [userId, version]);

  const positions = useMemo(() => posts.flatMap((post) => post.position ? [post.position] : post.portfolio?.positions ?? []), [posts]);
  const portfolio = posts.find((post) => post.portfolio)?.portfolio;
  const privacy = getPrivacySettings();

  if (!user) return <View style={styles.root}><SocialScreenHeader onBack={onBack} title="Profile"/><View style={styles.loading}><View style={styles.loadingAvatar}/><View style={styles.loadingLine}/><View style={styles.loadingLineShort}/></View></View>;

  const publicPerformance = (user.performance30d ?? 0) * rangeMultipliers[performanceRange];
  const performanceSeries = chartShapes[performanceRange].map((point) => point * publicPerformance);
  const positivePerformance = publicPerformance >= 0;
  const positionsVisible = !user.isCurrentUser || privacy.showPositionHistory;
  const portfolioVisible = !user.isCurrentUser || privacy.showPortfolioPerformance;

  const toggleFollow = async () => {
    user.isFollowing ? await unfollowUser(user.id) : await followUser(user.id);
    setVersion((value) => value + 1);
  };
  const menu = () => user.isCurrentUser
    ? Alert.alert('Profile options', undefined, [{ text: 'Saved posts', onPress: onSaved }, { text: 'Privacy settings', onPress: onPrivacy }, { text: 'Cancel', style: 'cancel' }])
    : Alert.alert('Profile options', `Manage interactions with @${user.username}.`, [{ text: 'Mute', onPress: () => Alert.alert('Muted', `You will see fewer posts from @${user.username}.`) }, { text: 'Report', style: 'destructive', onPress: () => Alert.alert('Report received', 'Our moderation team will review this profile.') }, { text: 'Cancel', style: 'cancel' }]);

  const profileHeader = <>
    <View style={styles.hero}>
      <View style={styles.identityRow}>
        <SocialAvatar initials={user.initials} size={72}/>
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>{user.displayName}</Text>
          <Text style={styles.handle}>@{user.username}</Text>
        </View>
        <Pressable onPress={user.isCurrentUser ? onEdit : () => void toggleFollow()} style={[styles.profileAction, user.isFollowing && styles.profileActionFollowing]}>
          <Text style={[styles.profileActionText, user.isFollowing && styles.profileActionFollowingText]}>{user.isCurrentUser ? 'Edit' : user.isFollowing ? 'Following' : 'Follow'}</Text>
        </Pressable>
      </View>
      <Text style={styles.bio}>{user.bio}</Text>
      <Text style={styles.specialization}>{user.specialization.join('  ·  ')}</Text>
      <View style={styles.connections}>
        <Pressable onPress={onFollowers}><Text style={styles.connection}><Text style={styles.connectionValue}>{formatCompactNumber(user.followers)}</Text> Followers</Text></Pressable>
        <Pressable onPress={onFollowing}><Text style={styles.connection}><Text style={styles.connectionValue}>{formatCompactNumber(user.following)}</Text> Following</Text></Pressable>
      </View>
    </View>

    <View style={styles.reputation}>
      <Text style={styles.sectionTitle}>Public track record</Text>
      <View style={styles.metricRow}>
        <Metric label="Prediction accuracy" value={formatProbability(user.predictionAccuracy ?? 0, 0)}/>
        <Metric accent negative={(user.performance30d ?? 0) < 0} label="30D performance" value={formatPercent(user.performance30d ?? 0, 1)}/>
      </View>
      <View style={styles.metricRow}>
        <Metric label="Consistency" value={`${user.consistency ?? 0} / 100`}/>
        <Metric label="Markets called" value={`${user.marketsCalled ?? 0}`}/>
      </View>
    </View>

    <View style={styles.performanceSection}>
      <View style={styles.performanceHeading}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <Text style={[styles.performanceValue, { color: positivePerformance ? colors.accent : colors.danger }]}>{formatPercent(publicPerformance, 1)}</Text>
      </View>
      <PerformanceLineChart color={positivePerformance ? colors.accent : colors.danger} height={116} values={performanceSeries}/>
      <View style={styles.ranges}>{(['7D', '30D', '3M', 'All'] as const).map((range) => <Pressable key={range} onPress={() => setPerformanceRange(range)} style={styles.range}><Text style={[styles.rangeText, performanceRange === range && styles.rangeTextActive]}>{range.toUpperCase()}</Text>{performanceRange === range ? <View style={styles.rangeIndicator}/> : null}</Pressable>)}</View>
    </View>

    <View style={styles.tabs}>{(['posts', 'positions', 'portfolio'] as ProfileTab[]).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={styles.tab}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item.charAt(0).toUpperCase() + item.slice(1)}</Text>{tab === item ? <View style={styles.tabIndicator}/> : null}</Pressable>)}</View>
  </>;

  if (user.isCurrentUser && !privacy.publicProfile) return <View style={styles.root}><SocialScreenHeader actionIcon="ellipsis-horizontal" onAction={menu} onBack={onBack} title="Profile"/><View style={styles.private}><Ionicons color={colors.textMuted} name="lock-closed-outline" size={28}/><Text style={styles.privateTitle}>Your public profile is off</Text><Pressable onPress={onPrivacy} style={styles.profileAction}><Text style={styles.profileActionText}>Review privacy</Text></Pressable></View></View>;

  const tabContent = tab === 'positions'
    ? <View style={styles.tabContent}>{positionsVisible ? positions.length ? positions.slice(0, 8).map((position, index) => <PublicPositionCard key={`${position.id}-${index}`} position={position}/>) : <EmptyCopy text="No public positions yet."/> : <EmptyCopy text="This position history is private."/>}</View>
    : tab === 'portfolio'
      ? <View style={styles.tabContent}>{portfolioVisible ? portfolio ? <PublicPortfolioCard onOpen={() => onOpenPortfolio(user.id)} portfolio={{ ...portfolio, positions: user.isCurrentUser && !privacy.showHoldings ? [] : portfolio.positions, showTotalValue: portfolio.showTotalValue && (!user.isCurrentUser || privacy.showTotalPortfolioValue) }}/> : <EmptyCopy text="No portfolio snapshot shared."/> : <EmptyCopy text="This portfolio is private."/>}</View>
      : null;

  return <View style={styles.root}>
    <SocialScreenHeader actionIcon="ellipsis-horizontal" onAction={menu} onBack={onBack} title="Profile"/>
    {tab === 'posts' ? <FlatList data={posts} keyExtractor={(item) => item.id} ListEmptyComponent={<EmptyCopy text="No posts yet."/>} ListHeaderComponent={profileHeader} renderItem={({ item }) => <SocialPostCard onChanged={() => setVersion((value) => value + 1)} onComment={() => onOpenPost(item.id)} onOpenAnalysis={onOpenAnalysis} onOpenMarket={onOpenMarket} onOpenPortfolio={onOpenPortfolio} onOpenPost={onOpenPost} onOpenProfile={onOpenProfile} onQuote={onQuote} post={item}/>} showsVerticalScrollIndicator={false}/> : <ScrollView showsVerticalScrollIndicator={false}>{profileHeader}{tabContent}</ScrollView>}
  </View>;
}

function Metric({ accent, label, negative, value }: { accent?: boolean; label: string; negative?: boolean; value: string }) {
  return <View style={styles.metric}><Text style={[styles.metricValue, accent && { color: negative ? colors.danger : colors.accent }]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}
function EmptyCopy({ text }: { text: string }) { return <Text style={styles.empty}>{text}</Text>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { flex: 1 },
  name: { color: colors.text, fontSize: 24, lineHeight: 29, fontWeight: '700' },
  handle: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  profileAction: { minWidth: 64, minHeight: 36, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.button, alignItems: 'center', justifyContent: 'center' },
  profileActionFollowing: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3A3D42' },
  profileActionText: { color: colors.buttonText, fontSize: 13, fontWeight: '600' },
  profileActionFollowingText: { color: colors.text },
  bio: { color: colors.text, fontSize: 15, lineHeight: 21, marginTop: 20 },
  specialization: { color: colors.textMuted, fontSize: 13, fontWeight: '500', marginTop: 12 },
  connections: { flexDirection: 'row', gap: 24, marginTop: 16 },
  connection: { color: colors.textMuted, fontSize: 13 },
  connectionValue: { color: colors.text, fontWeight: '600' },
  reputation: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  metricRow: { flexDirection: 'row', marginTop: 20 },
  metric: { flex: 1 },
  metricValue: { color: colors.text, fontSize: 22, lineHeight: 27, fontWeight: '700' },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '500', marginTop: 4 },
  performanceSection: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 20 },
  performanceHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  performanceValue: { fontSize: 20, fontWeight: '700' },
  ranges: { flexDirection: 'row', marginTop: 8 },
  range: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  rangeText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  rangeTextActive: { color: colors.accent, fontWeight: '700' },
  rangeIndicator: { width: 16, height: 2, borderRadius: 1, backgroundColor: colors.accent, marginTop: 6 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'flex-end' },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: colors.text, fontWeight: '600' },
  tabIndicator: { width: 30, height: 2, borderRadius: 1, backgroundColor: colors.text, marginTop: 10 },
  tabContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', padding: 40 },
  private: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  privateTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  loading: { padding: 16, gap: 12 },
  loadingAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface },
  loadingLine: { width: '62%', height: 14, borderRadius: 7, backgroundColor: colors.surface },
  loadingLineShort: { width: '38%', height: 12, borderRadius: 6, backgroundColor: colors.surface },
});
