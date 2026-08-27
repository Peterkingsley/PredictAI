import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBottomNav, type MainTab } from '../components/AppBottomNav';
import { colors } from '../theme/colors';
import type { Market } from '../types/market';
import { AssetsScreen } from './AssetsScreen';
import { ExploreScreen } from './ExploreScreen';
import { FundsHistoryScreen } from './FundsHistoryScreen';
import { MarketDetailScreen } from './MarketDetailScreen';
import { PredictScreen } from './PredictScreen';

export function MainAppScreen() {
  const [tab, setTab] = useState<MainTab>('predict');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  if (selectedMarket) return <MarketDetailScreen market={selectedMarket} onBack={() => setSelectedMarket(null)} />;
  if (historyOpen) return <FundsHistoryScreen onBack={() => setHistoryOpen(false)} />;
  return <View style={styles.root}><View style={styles.body}>{tab === 'predict' && <PredictScreen onMarket={setSelectedMarket} />}{tab === 'explore' && <ExploreScreen onMarket={setSelectedMarket} />}{tab === 'assets' && <AssetsScreen onHistory={() => setHistoryOpen(true)} />}</View><AppBottomNav active={tab} onChange={setTab} /></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, body: { flex: 1 } });
