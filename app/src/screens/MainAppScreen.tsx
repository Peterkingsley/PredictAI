import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBottomNav, type MainTab } from '../components/AppBottomNav';
import { colors } from '../theme/colors';
import type { Market } from '../types/market';
import { AssetsScreen } from './AssetsScreen';
import { AIAnalysisScreen } from './AIAnalysisScreen';
import { ExploreScreen } from './ExploreScreen';
import { FundsHistoryScreen } from './FundsHistoryScreen';
import { MarketDetailScreen } from './MarketDetailScreen';
import { PredictScreen } from './PredictScreen';

export function MainAppScreen({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<MainTab>('predict');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [analysisMarket, setAnalysisMarket] = useState<Market | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  if (analysisMarket) return <AIAnalysisScreen market={analysisMarket} onBack={() => setAnalysisMarket(null)} />;
  if (selectedMarket) return <MarketDetailScreen market={selectedMarket} onAskAI={() => setAnalysisMarket(selectedMarket)} onBack={() => setSelectedMarket(null)} />;
  if (historyOpen) return <FundsHistoryScreen onBack={() => setHistoryOpen(false)} />;
  return <View style={styles.root}><View style={styles.body}>{tab === 'predict' && <PredictScreen email={email} onAskAI={setAnalysisMarket} onMarket={setSelectedMarket} onSignOut={onSignOut} />}{tab === 'explore' && <ExploreScreen onAskAI={setAnalysisMarket} onMarket={setSelectedMarket} />}{tab === 'assets' && <AssetsScreen onHistory={() => setHistoryOpen(true)} />}</View><AppBottomNav active={tab} onChange={setTab} /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, body: { flex: 1 } });
