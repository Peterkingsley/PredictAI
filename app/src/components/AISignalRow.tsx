import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { AISignal } from '../types/aiAnalysis';

export function AISignalRow({ signal }: { signal: AISignal }) {
  const positive = signal.sentiment === 'bullish' || signal.sentiment === 'positive';
  const negative = signal.sentiment === 'bearish' || signal.sentiment === 'negative';
  const tone = positive ? colors.positive : negative ? '#FF728C' : '#B4B6BC';
  return <View style={styles.row}><View style={styles.copy}><Text allowFontScaling={false} style={styles.name}>{signal.name}</Text><Text allowFontScaling={false} style={styles.explanation}>{signal.explanation}</Text></View><View style={styles.score}><Text allowFontScaling={false} style={[styles.scoreValue, { color: tone }]}>{signal.score}</Text><Text allowFontScaling={false} style={[styles.sentiment, { color: tone }]}>{signal.sentiment.toUpperCase()}</Text></View></View>;
}

const styles = StyleSheet.create({
  row: { minHeight: 65, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  copy: { flex: 1 },
  name: { color: colors.text, fontSize: 12, fontWeight: '600' },
  explanation: { color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  score: { width: 64, alignItems: 'flex-end' },
  scoreValue: { fontSize: 15, fontWeight: '700' },
  sentiment: { fontSize: 7, fontWeight: '700', marginTop: 2 },
});
