import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
export function AuthHeader({ action, onAction, onBack }: { action: string; onAction: () => void; onBack: () => void }) {
  return <View style={styles.row}>
    <Pressable accessibilityLabel="Go back" hitSlop={14} onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={25} /></Pressable>
    <Pressable hitSlop={12} onPress={onAction}><Text allowFontScaling={false} style={styles.action}>{action}</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ row: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, action: { color: colors.accent, fontSize: 15 } });
