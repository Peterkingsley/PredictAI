import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import type { SocialPost } from '../../types/social';
import { formatCompactNumber } from '../../utils/socialFormatters';

function Action({ active, count, icon, activeIcon, label, onPress }: { active?: boolean; count?: number; icon: keyof typeof Ionicons.glyphMap; activeIcon?: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable accessibilityLabel={label} accessibilityRole="button" hitSlop={7} onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><Ionicons color={active ? colors.accent : colors.textMuted} name={active && activeIcon ? activeIcon : icon} size={17} />{count !== undefined ? <Text style={[styles.count, active && styles.active]}>{formatCompactNumber(count)}</Text> : null}</Pressable>;
}

export function SocialActionRow({ onComment, onLike, onQuote, onRepost, onSave, post }: { onComment: () => void; onLike: () => void; onQuote: () => void; onRepost: () => void; onSave: () => void; post: SocialPost }) {
  const chooseRepost = () => Alert.alert('Share this post', undefined, [{ text: 'Repost', onPress: onRepost }, { text: 'Quote post', onPress: onQuote }, { text: 'Cancel', style: 'cancel' }]);
  return <View style={styles.row}><Action count={post.replies} icon="chatbubble-outline" label="Comment" onPress={onComment} /><Action active={post.reposted} count={post.reposts} icon="repeat-outline" label="Repost or quote post" onPress={chooseRepost} /><Action active={post.liked} activeIcon="heart" count={post.likes} icon="heart-outline" label={post.liked ? 'Unlike post' : 'Like post'} onPress={onLike} /><View style={styles.spacer} /><Action active={post.saved} activeIcon="bookmark" icon="bookmark-outline" label={post.saved ? 'Remove saved post' : 'Save post'} onPress={onSave} /><Action icon="share-outline" label="Share post" onPress={() => void Share.share({ message: `${post.author.displayName} (@${post.author.username}) on PredictAI:\n\n${post.content}` })} /></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingTop: 12 }, action: { minWidth: 29, flexDirection: 'row', alignItems: 'center', gap: 5 }, pressed: { opacity: .55 }, count: { color: colors.textMuted, fontSize: 8 }, active: { color: colors.accent }, spacer: { flex: 1 } });
