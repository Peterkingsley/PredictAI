import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { Market } from '../types/market';

const stepsByCategory: Record<Market['category'], readonly string[]> = {
  Crypto: ['Market data', 'Price action', 'On-chain activity', 'Social sentiment', 'News & geopolitical events', 'Macro conditions'],
  Sports: ['Market data', 'Recent form', 'Squad availability', 'Head-to-head history', 'News & event conditions', 'Market consensus'],
  Recommend: ['Market data', 'Fundamental evidence', 'Public sentiment', 'News & external events', 'Market liquidity', 'Macro conditions'],
};

export const getAnalysisSteps = (category: Market['category']) => stepsByCategory[category];

export function AIAnalysisLoading({ category, completedSteps }: { category: Market['category']; completedSteps: number }) {
  const analysisSteps = getAnalysisSteps(category);
  return <View style={styles.root}><View style={styles.orbit}><View style={styles.core}><Ionicons color={colors.accent} name="sparkles" size={27} /></View></View><Text allowFontScaling={false} style={styles.title}>PredictAI is analysing this market</Text><Text allowFontScaling={false} style={styles.subtitle}>Comparing market probability with multiple intelligence signals.</Text><View style={styles.steps}>{analysisSteps.map((step, index) => {
    const complete = index < completedSteps;
    const active = index === completedSteps;
    return <View key={step} style={styles.step}>{complete ? <Ionicons color={colors.accent} name="checkmark-circle" size={18} /> : active ? <ActivityIndicator color={colors.accent} size="small" /> : <Ionicons color={colors.textFaint} name="ellipse-outline" size={18} />}<Text allowFontScaling={false} style={[styles.stepText, (complete || active) && styles.stepTextActive]}>{step}</Text></View>;
  })}<View style={styles.step}>{completedSteps >= analysisSteps.length ? <ActivityIndicator color={colors.accent} size="small" /> : <Ionicons color={colors.textFaint} name="ellipse-outline" size={18} />}<Text allowFontScaling={false} style={[styles.stepText, completedSteps >= analysisSteps.length && styles.stepTextActive]}>Generating verdict...</Text></View></View><Text allowFontScaling={false} style={styles.disclaimer}>AI estimates can be wrong. Review the evidence before predicting.</Text></View>;
}

const styles = StyleSheet.create({
  root: { paddingTop: 32, alignItems: 'center' },
  orbit: { width: 86, height: 86, borderRadius: 43, borderWidth: 1, borderColor: '#415923', alignItems: 'center', justifyContent: 'center', backgroundColor: '#151B11' },
  core: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#263713', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 25, textAlign: 'center' },
  subtitle: { maxWidth: 280, color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7 },
  steps: { width: '100%', marginTop: 27, padding: 15, borderRadius: 15, backgroundColor: '#181A1D' },
  step: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepText: { color: colors.textFaint, fontSize: 11 },
  stepTextActive: { color: colors.text },
  disclaimer: { color: colors.textFaint, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 20 },
});
