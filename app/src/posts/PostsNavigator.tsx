import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { getAIAnalysisPreview } from '../services/aiAnalysis';
import { markets } from '../services/marketData';
import { createPost } from '../services/social';
import { colors } from '../theme/colors';
import type { ComposerDraft, PublicPortfolioSnapshot, PublicPosition, SocialAIAnalysis } from '../types/social';
import { CreatePostScreen } from './screens/CreatePostScreen';
import { EditPublicProfileScreen } from './screens/EditPublicProfileScreen';
import { FollowersFollowingScreen } from './screens/FollowersFollowingScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { MarketPostsScreen } from './screens/MarketPostsScreen';
import { PortfolioShareBuilderScreen } from './screens/PortfolioShareBuilderScreen';
import { PositionShareBuilderScreen } from './screens/PositionShareBuilderScreen';
import { PostDetailScreen } from './screens/PostDetailScreen';
import { PostMarketPickerScreen } from './screens/PostMarketPickerScreen';
import { PostsScreen } from './screens/PostsScreen';
import { PublicPortfolioScreen } from './screens/PublicPortfolioScreen';
import { SavedPostsScreen } from './screens/SavedPostsScreen';
import { SocialPrivacySettingsScreen } from './screens/SocialPrivacySettingsScreen';
import { SocialSearchScreen } from './screens/SocialSearchScreen';
import { TraderProfileScreen } from './screens/TraderProfileScreen';

type Route = { name: 'feed' } | { name: 'post'; postId: string } | { name: 'create' } | { name: 'marketPicker' } | { name: 'positionBuilder' } | { name: 'portfolioBuilder' } | { name: 'profile'; userId: string } | { name: 'portfolio'; userId: string } | { name: 'connections'; userId: string; tab: 'followers' | 'following' } | { name: 'search' } | { name: 'leaderboard' } | { name: 'marketPosts'; marketId: string } | { name: 'saved' } | { name: 'editProfile' } | { name: 'privacy' };
export type PostsIntent = { screen: 'create'; draft?: Partial<ComposerDraft> } | { screen: 'marketPosts'; marketId: string } | { screen: 'portfolioBuilder' } | { screen: 'profile'; userId?: string };

const blankDraft = (): ComposerDraft => ({ content: '' });
export function PostsNavigator({ intent, onConsumeIntent, onDepthChange, onOpenAnalysis, onOpenMarket }: { intent?: PostsIntent | null; onConsumeIntent?: () => void; onDepthChange?: (deep: boolean) => void; onOpenAnalysis: (marketId: string) => void; onOpenMarket: (marketId: string) => void }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'feed' }]); const [draft, setDraft] = useState<ComposerDraft>(blankDraft); const [version, setVersion] = useState(0);
  const route = stack[stack.length - 1]!; const push = (next: Route) => setStack((current) => [...current, next]); const back = () => setStack((current) => current.length > 1 ? current.slice(0, -1) : current); const changed = () => setVersion((value) => value + 1);
  useEffect(() => { onDepthChange?.(stack.length > 1); }, [onDepthChange, stack.length]);
  useEffect(() => { if (!intent) return; if (intent.screen === 'create') { setDraft({ ...blankDraft(), ...intent.draft }); setStack([{ name: 'feed' }, { name: 'create' }]); } else if (intent.screen === 'marketPosts') setStack([{ name: 'feed' }, { name: 'marketPosts', marketId: intent.marketId }]); else if (intent.screen === 'portfolioBuilder') { setDraft(blankDraft()); setStack([{ name: 'feed' }, { name: 'portfolioBuilder' }]); } else setStack([{ name: 'feed' }, { name: 'profile', userId: intent.userId ?? 'current' }]); onConsumeIntent?.(); }, [intent, onConsumeIntent]);
  const startCreate = (next: Partial<ComposerDraft> = {}) => { setDraft({ ...blankDraft(), ...next }); push({ name: 'create' }); };
  const openProfile = (userId: string) => push({ name: 'profile', userId }); const openPost = (postId: string) => push({ name: 'post', postId }); const openPortfolio = (userId: string) => push({ name: 'portfolio', userId });
  const quote = (postId: string) => startCreate({ quotePostId: postId });
  const addAI = () => { const market = markets.find((item) => item.id === draft.marketId) ?? markets.find((item) => item.id === 'bitcoin-2026') ?? markets[0]; if (!market) return; const preview = getAIAnalysisPreview(market); const aiAnalysis: SocialAIAnalysis = { probability: preview.probability, marketProbability: preview.marketProbability, edge: preview.edge, verdict: preview.verdict, confidence: preview.confidence, summary: `PredictAI sees a ${Math.abs(preview.edge)} point ${preview.edge >= 0 ? 'positive' : 'negative'} edge on “${preview.focusedOutcome}”.` }; setDraft((current) => ({ ...current, marketId: market.id, aiAnalysis })); };
  const publish = async () => { try { await createPost(draft); setDraft(blankDraft()); setVersion((value) => value + 1); setStack([{ name: 'feed' }]); } catch { Alert.alert('Post not published', 'Please try again.'); } };
  const common = { onOpenAnalysis, onOpenMarket, onOpenPortfolio: openPortfolio, onOpenPost: openPost, onOpenProfile: openProfile, onQuote: quote };
  let screen: React.ReactNode;
  switch (route.name) {
    case 'feed': screen = <PostsScreen {...common} onCreate={() => startCreate()} onLeaderboard={() => push({ name: 'leaderboard' })} onSearch={() => push({ name: 'search' })} version={version}/>; break;
    case 'post': screen = <PostDetailScreen {...common} onBack={back} onChanged={changed} postId={route.postId} version={version}/>; break;
    case 'create': screen = <CreatePostScreen draft={draft} onAddAI={addAI} onAddMarket={() => push({ name: 'marketPicker' })} onAddPortfolio={() => push({ name: 'portfolioBuilder' })} onAddPosition={() => push({ name: 'positionBuilder' })} onCancel={back} onChange={setDraft} onOpenMarket={onOpenMarket} onPost={() => void publish()}/>; break;
    case 'marketPicker': screen = <PostMarketPickerScreen onBack={back} onSelect={(marketId) => { setDraft((current) => ({ ...current, marketId })); back(); }}/>; break;
    case 'positionBuilder': screen = <PositionShareBuilderScreen onAdd={(position: PublicPosition) => { setDraft((current) => ({ ...current, position })); setStack((current) => current.some((item) => item.name === 'create') ? current.slice(0, -1) : [{ name: 'feed' }, { name: 'create' }]); }} onBack={back}/>; break;
    case 'portfolioBuilder': screen = <PortfolioShareBuilderScreen onAdd={(portfolio: PublicPortfolioSnapshot) => { setDraft((current) => ({ ...current, portfolio })); setStack((current) => current.some((item) => item.name === 'create') ? current.slice(0, -1) : [{ name: 'feed' }, { name: 'create' }]); }} onBack={back}/>; break;
    case 'profile': screen = <TraderProfileScreen {...common} onBack={back} onEdit={() => push({ name: 'editProfile' })} onFollowers={() => push({ name: 'connections', userId: route.userId, tab: 'followers' })} onFollowing={() => push({ name: 'connections', userId: route.userId, tab: 'following' })} onPrivacy={() => push({ name: 'privacy' })} onSaved={() => push({ name: 'saved' })} userId={route.userId}/>; break;
    case 'portfolio': screen = <PublicPortfolioScreen onBack={back} userId={route.userId}/>; break;
    case 'connections': screen = <FollowersFollowingScreen initialTab={route.tab} onBack={back} onOpenProfile={openProfile} userId={route.userId}/>; break;
    case 'search': screen = <SocialSearchScreen {...common} onBack={back} onOpenMarketPosts={(marketId) => push({ name: 'marketPosts', marketId })}/>; break;
    case 'leaderboard': screen = <LeaderboardScreen onBack={back} onOpenProfile={openProfile}/>; break;
    case 'marketPosts': screen = <MarketPostsScreen {...common} marketId={route.marketId} onBack={back} onCreate={(marketId) => startCreate({ marketId })}/>; break;
    case 'saved': screen = <SavedPostsScreen {...common} onBack={back}/>; break;
    case 'editProfile': screen = <EditPublicProfileScreen onBack={back} onSaved={() => { changed(); back(); }}/>; break;
    case 'privacy': screen = <SocialPrivacySettingsScreen onBack={back}/>; break;
  }
  return <View style={styles.root}>{screen}</View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background } });
