import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
export type MainTab = 'predict' | 'explore' | 'assets';
const items: { key: MainTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [{ key: 'predict', label: 'Predict', icon: 'analytics-outline' }, { key: 'explore', label: 'Explore', icon: 'compass-outline' }, { key: 'assets', label: 'Assets', icon: 'wallet-outline' }];
export function AppBottomNav({ active, onChange }: { active: MainTab; onChange: (tab: MainTab) => void }) { return <View style={styles.nav}>{items.map((item) => <Pressable key={item.key} onPress={() => onChange(item.key)} style={styles.item}><Ionicons color={active === item.key ? colors.text : colors.textMuted} name={item.icon} size={25} /><Text style={[styles.label, active === item.key && styles.active]}>{item.label}</Text></Pressable>)}</View>; }
const styles = StyleSheet.create({ nav: { minHeight: 62, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#0E0F11', flexDirection: 'row', paddingTop: 7, paddingBottom: 6 }, item: { flex: 1, alignItems: 'center', gap: 3, transform: [{ scale: 0.88 }] }, label: { color: colors.textMuted, fontSize: 11 }, active: { color: colors.text } });
