import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AIAnalysisLoading, getAnalysisSteps } from '../components/AIAnalysisLoading';
import { AIEdgeCard } from '../components/AIEdgeCard';
import { AISignalRow } from '../components/AISignalRow';
import { analyzeMarket } from '../services/aiAnalysis';
import { colors } from '../theme/colors';
import type { AIAnalysis } from '../types/aiAnalysis';
import type { Market } from '../types/market';

export function AIAnalysisScreen({ market, onBack, onShareToPosts }: { market: Market; onBack: () => void; onShareToPosts?: (analysis: AIAnalysis) => void }) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setAnalysis(null);
    setFailed(false);
    setCompletedSteps(0);
    const timers = getAnalysisSteps(market.category).map((_, index) => setTimeout(() => active && setCompletedSteps(index + 1), 260 * (index + 1)));
    analyzeMarket(market).then((result) => { if (active) setAnalysis(result); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; timers.forEach(clearTimeout); };
  }, [attempt, market]);

  return <View style={styles.root}>
    <View style={styles.header}><Pressable accessibilityLabel="Back" hitSlop={10} onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={25} /></Pressable><Text allowFontScaling={false} style={styles.headerTitle}>PredictAI Intelligence</Text><View style={styles.headerSpacer} /></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.marketTag}><Text allowFontScaling={false} style={styles.marketTagText}>{market.category} · {market.subcategory}</Text></View>
      <Text allowFontScaling={false} style={styles.marketTitle}>{market.title}</Text>

      {!analysis && !failed ? <AIAnalysisLoading category={market.category} completedSteps={completedSteps} /> : null}
      {failed ? <View style={styles.error}><View style={styles.errorIcon}><Ionicons color={colors.danger} name="alert-circle-outline" size={31} /></View><Text allowFontScaling={false} style={styles.errorTitle}>Analysis could not be generated</Text><Text allowFontScaling={false} style={styles.errorText}>Check your connection and try again.</Text><Pressable onPress={() => setAttempt((current) => current + 1)} style={styles.retry}><Text allowFontScaling={false} style={styles.retryText}>Try again</Text></Pressable></View> : null}

      {analysis ? <>
        <View style={styles.reportHeading}><View><Text allowFontScaling={false} style={styles.eyebrow}>PREDICTAI VERDICT</Text><Text allowFontScaling={false} style={styles.reportTitle}>Intelligence report</Text></View><View style={styles.live}><View style={styles.liveDot} /><Text allowFontScaling={false} style={styles.liveText}>LIVE</Text></View></View>
        <AIEdgeCard analysis={analysis} />
        <View style={styles.section}><View style={styles.sectionHeading}><Text allowFontScaling={false} style={styles.sectionTitle}>Market signals</Text><Text allowFontScaling={false} style={styles.signalScore}>{analysis.sentimentScore}/100</Text></View>{analysis.signals.map((signal) => <AISignalRow key={signal.name} signal={signal} />)}</View>
        <View style={styles.section}><Text allowFontScaling={false} style={styles.sectionTitle}>Why PredictAI thinks this</Text><Text allowFontScaling={false} style={styles.bodyText}>{analysis.summary}</Text></View>
        <View style={styles.section}><Text allowFontScaling={false} style={styles.sectionTitle}>What could change this view</Text>{analysis.risks.map((risk) => <View key={risk} style={styles.risk}><View style={styles.riskDot} /><Text allowFontScaling={false} style={styles.riskText}>{risk}</Text></View>)}</View>
        <View style={styles.updated}><Ionicons color={colors.textMuted} name="time-outline" size={14} /><Text allowFontScaling={false} style={styles.updatedText}>Updated just now</Text><Pressable onPress={() => setAttempt((current) => current + 1)} style={styles.refresh}><Ionicons color={colors.accent} name="refresh" size={14} /><Text allowFontScaling={false} style={styles.refreshText}>Refresh</Text></Pressable></View>
        {onShareToPosts ? <Pressable onPress={() => onShareToPosts(analysis)} style={styles.share}><Ionicons color={colors.buttonText} name="share-social-outline" size={17}/><Text style={styles.shareText}>Share analysis to Posts</Text></Pressable> : null}
        <View style={styles.notice}><Ionicons color={colors.textMuted} name="information-circle-outline" size={17} /><Text allowFontScaling={false} style={styles.noticeText}>PredictAI provides model-generated estimates, not financial advice. Probabilities may be wrong and should not be your only basis for a prediction.</Text></View>
      </> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  headerSpacer: { width: 25 },
  content: { padding: 16, paddingBottom: 45 },
  marketTag: { alignSelf: 'flex-start', borderRadius: 6, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 5, marginTop: 4 },
  marketTagText: { color: colors.textMuted, fontSize: 9, fontWeight: '600' },
  marketTitle: { color: colors.text, fontSize: 19, lineHeight: 26, fontWeight: '700', marginTop: 12 },
  error: { alignItems: 'center', paddingTop: 70 },
  errorIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#301B20', alignItems: 'center', justifyContent: 'center' },
  errorTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 16 },
  errorText: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  retry: { marginTop: 18, borderRadius: 9, backgroundColor: '#2B3A17', paddingHorizontal: 24, paddingVertical: 11 },
  retryText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  reportHeading: { marginTop: 24, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  eyebrow: { color: colors.accent, fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
  reportTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: '#263713' },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
  liveText: { color: colors.accent, fontSize: 7, fontWeight: '800' },
  section: { marginTop: 15, padding: 14, borderRadius: 15, backgroundColor: '#181A1D' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  signalScore: { color: colors.accent, fontSize: 10, fontWeight: '700' },
  bodyText: { color: colors.textMuted, fontSize: 11, lineHeight: 18, marginTop: 11 },
  risk: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 12 },
  riskDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFB14A', marginTop: 5 },
  riskText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  updated: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 17 },
  updatedText: { color: colors.textMuted, fontSize: 9 },
  refresh: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, padding: 7 },
  refreshText: { color: colors.accent, fontSize: 9, fontWeight: '600' },
  notice: { marginTop: 10, borderRadius: 10, backgroundColor: '#151719', padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeText: { flex: 1, color: colors.textFaint, fontSize: 8, lineHeight: 13 },
  share: { marginTop: 14, minHeight: 45, borderRadius: 10, backgroundColor: colors.button, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  shareText: { color: colors.buttonText, fontSize: 11, fontWeight: '700' },
});
