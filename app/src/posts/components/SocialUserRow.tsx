import { Pressable, StyleSheet, Text, View } from 'react-native';
import { followUser, unfollowUser } from '../../services/social';
import { colors } from '../../theme/colors';
import type { SocialUser } from '../../types/social';
import { formatPercent } from '../../utils/socialFormatters';
import { SocialAvatar } from './SocialAvatar';

export function SocialUserRow({ onChanged, onOpen, user }: { onChanged: () => void; onOpen: () => void; user: SocialUser }) {
  const toggle = async () => { user.isFollowing ? await unfollowUser(user.id) : await followUser(user.id); onChanged(); };
  return <View style={styles.row}><Pressable accessibilityLabel={`Open ${user.displayName} profile`} onPress={onOpen}><SocialAvatar initials={user.initials} size={38} /></Pressable><Pressable onPress={onOpen} style={styles.copy}><Text style={styles.name}>{user.displayName}</Text><Text style={styles.username}>@{user.username}</Text><Text numberOfLines={1} style={styles.detail}>{user.predictionAccuracy ? `${user.predictionAccuracy}% accuracy` : user.specialization.join(' · ')}{user.performance30d !== undefined ? ` · ${formatPercent(user.performance30d)} 30D` : ''}</Text></Pressable>{!user.isCurrentUser ? <Pressable accessibilityLabel={user.isFollowing ? 'Unfollow user' : 'Follow user'} onPress={() => void toggle()} style={[styles.follow, user.isFollowing && styles.following]}><Text style={[styles.followText, user.isFollowing && styles.followingText]}>{user.isFollowing ? 'Following' : 'Follow'}</Text></Pressable> : null}</View>;
}
const styles = StyleSheet.create({ row: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, copy: { flex: 1 }, name: { color: colors.text, fontSize: 12, fontWeight: '600' }, username: { color: colors.textMuted, fontSize: 9, marginTop: 2 }, detail: { color: colors.textFaint, fontSize: 8, marginTop: 4 }, follow: { minWidth: 66, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.button, alignItems: 'center' }, following: { backgroundColor: colors.surface }, followText: { color: colors.buttonText, fontSize: 9, fontWeight: '700' }, followingText: { color: colors.text } });
