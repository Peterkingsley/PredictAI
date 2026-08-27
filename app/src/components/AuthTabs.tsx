import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { AuthMethod } from '../types/auth';
type Tab = { key: AuthMethod; label: string };
export function AuthTabs({ active, onChange, tabs }: { active: AuthMethod; onChange: (method: AuthMethod) => void; tabs: Tab[] }) {
  return <View style={styles.row}>{tabs.map((tab) => {
    const selected = active === tab.key;
    return <Pressable key={tab.key} onPress={() => onChange(tab.key)}><Text allowFontScaling={false} style={[styles.label, selected && styles.selectedLabel]}>{tab.label}</Text><View style={[styles.indicator, selected && styles.selectedIndicator]} /></Pressable>;
  })}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 24 }, label: { color: colors.textMuted, fontSize: 14.5 }, selectedLabel: { color: colors.text }, indicator: { height: 2, marginTop: 9, backgroundColor: 'transparent' }, selectedIndicator: { backgroundColor: colors.text } });
