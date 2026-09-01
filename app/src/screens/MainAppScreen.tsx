import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBottomNav, type MainTab } from '../components/AppBottomNav';
import { PostsNavigator, type PostsIntent } from '../posts/PostsNavigator';
import { markets } from '../services/marketData';
import { colors } from '../theme/colors';
import type { AIAnalysis } from '../types/aiAnalysis';
import type { Market } from '../types/market';
import { AssetsScreen } from './AssetsScreen';
import { AIAnalysisScreen } from './AIAnalysisScreen';
import { FundsHistoryScreen } from './FundsHistoryScreen';
import { MarketDetailScreen } from './MarketDetailScreen';
import { PredictScreen } from './PredictScreen';

export function MainAppScreen({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<MainTab>('predict');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [analysisMarket, setAnalysisMarket] = useState<Market | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [postsIntent, setPostsIntent] = useState<PostsIntent | null>(null);
  const [postsDeep, setPostsDeep] = useState(false);
  const [predictDeep, setPredictDeep] = useState(false);
  const openPosts = (intent: PostsIntent) => { setSelectedMarket(null); setAnalysisMarket(null); setPostsIntent(intent); setTab('posts'); };
  const openMarketById = (marketId: string) => { const market = markets.find((item) => item.id === marketId); if (market) setSelectedMarket(market); };
  const openAnalysisById = (marketId: string) => { const market = markets.find((item) => item.id === marketId); if (market) setAnalysisMarket(market); };
  const shareAnalysis = (analysis: AIAnalysis) => openPosts({ screen: 'create', draft: { marketId: analysis.marketId, aiAnalysis: { probability: analysis.probability, marketProbability: analysis.marketProbability, edge: analysis.edge, verdict: analysis.verdict, confidence: analysis.confidence, summary: analysis.summary } } });
  if (analysisMarket) return <AIAnalysisScreen market={analysisMarket} onBack={() => setAnalysisMarket(null)} onShareToPosts={shareAnalysis} />;
  if (selectedMarket) return <MarketDetailScreen market={selectedMarket} onAskAI={() => setAnalysisMarket(selectedMarket)} onBack={() => setSelectedMarket(null)} onOpenPosts={() => openPosts({ screen: 'marketPosts', marketId: selectedMarket.id })} />;
  if (historyOpen) return <FundsHistoryScreen onBack={() => setHistoryOpen(false)} />;
  return <View style={styles.root}><View style={styles.body}>{tab === 'predict' && <PredictScreen email={email} onAskAI={setAnalysisMarket} onDepthChange={setPredictDeep} onMarket={setSelectedMarket} onOpenPublicProfile={() => openPosts({ screen: 'profile', userId: 'current' })} onSignOut={onSignOut} />}{tab === 'posts' && <PostsNavigator intent={postsIntent} onConsumeIntent={() => setPostsIntent(null)} onDepthChange={setPostsDeep} onOpenAnalysis={openAnalysisById} onOpenMarket={openMarketById}/>} {tab === 'assets' && <AssetsScreen onHistory={() => setHistoryOpen(true)} onSharePortfolio={() => openPosts({ screen: 'portfolioBuilder' })} />}</View>{!postsDeep && !predictDeep ? <AppBottomNav active={tab} onChange={setTab} /> : null}</View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, body: { flex: 1 } });
