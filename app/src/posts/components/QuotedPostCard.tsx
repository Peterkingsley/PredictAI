import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSocialPost } from '../../services/social';
import { colors } from '../../theme/colors';

export function QuotedPostCard({ postId, onOpen }: { postId: string; onOpen?: () => void }) {
  const post = getSocialPost(postId);
  if (!post) return null;
  const content = <><Text style={styles.author}>{post.author.displayName} <Text style={styles.username}>@{post.author.username}</Text></Text><Text numberOfLines={3} style={styles.content}>{post.content || 'Shared market activity'}</Text>{post.marketId ? <Text style={styles.attachment}>Market attached</Text> : post.position ? <Text style={styles.attachment}>Public position attached</Text> : null}</>;
  return onOpen ? <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.card}>{content}</View>;
}
const styles = StyleSheet.create({ card: { marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#111315', padding: 12 }, pressed: { opacity: .72 }, author: { color: colors.text, fontSize: 13, fontWeight: '600' }, username: { color: colors.textMuted, fontWeight: '400' }, content: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 6 }, attachment: { color: colors.textFaint, fontSize: 11, marginTop: 8 } });
