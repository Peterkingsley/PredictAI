import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function SocialScreenHeader({ action, actionIcon, onAction, onBack, title }: { action?: string; actionIcon?: keyof typeof Ionicons.glyphMap; onAction?: () => void; onBack: () => void; title: string }) {
  return <View style={styles.header}><Pressable accessibilityLabel="Go back" hitSlop={10} onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={24} /></Pressable><Text numberOfLines={1} style={styles.title}>{title}</Text>{onAction ? <Pressable hitSlop={10} onPress={onAction}>{actionIcon ? <Ionicons color={colors.text} name={actionIcon} size={21} /> : <Text style={styles.action}>{action}</Text>}</Pressable> : <View style={styles.spacer} />}</View>;
}

const styles = StyleSheet.create({ header: { height: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background }, title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' }, spacer: { width: 24 }, action: { color: colors.accent, fontSize: 11, fontWeight: '700' } });
