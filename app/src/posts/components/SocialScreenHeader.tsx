import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function SocialScreenHeader({ action, actionIcon, onAction, onBack, title }: { action?: string; actionIcon?: keyof typeof Ionicons.glyphMap; onAction?: () => void; onBack: () => void; title: string }) {
  return <View style={styles.header}><Pressable accessibilityLabel="Go back" hitSlop={8} onPress={onBack} style={styles.side}><Ionicons color={colors.text} name="chevron-back" size={24}/></Pressable><Text numberOfLines={1} style={styles.title}>{title}</Text>{onAction ? <Pressable accessibilityLabel={action ?? 'Profile options'} hitSlop={8} onPress={onAction} style={[styles.side, styles.sideRight]}>{actionIcon ? <Ionicons color={colors.text} name={actionIcon} size={24}/> : <Text style={styles.action}>{action}</Text>}</Pressable> : <View style={styles.side}/>}</View>;
}

const styles = StyleSheet.create({ header: { height: 56, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background }, side: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' }, sideRight: { alignItems: 'flex-end' }, title: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' }, action: { color: colors.accent, fontSize: 13, fontWeight: '600' } });
