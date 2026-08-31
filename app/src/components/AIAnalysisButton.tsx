import { Ionicons } from '@expo/vector-icons';
import type { GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

export function AIAnalysisButton({ onPress }: { onPress: () => void }) {
  const openAnalysis = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPress();
  };

  return <Pressable accessibilityLabel="Ask PredictAI to research this market" onPress={openAnalysis} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Ionicons color={colors.accent} name="search-circle-outline" size={17} /><Text allowFontScaling={false} style={styles.label}>Ask PredictAI</Text><Ionicons color={colors.accent} name="arrow-forward" size={14} /></Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 36, borderRadius: 9, borderWidth: 1, borderColor: '#35451D', backgroundColor: '#1C2415', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  label: { color: colors.accent, fontSize: 11, fontWeight: '700', flex: 1 },
  pressed: { opacity: .65, transform: [{ scale: .99 }] },
});
