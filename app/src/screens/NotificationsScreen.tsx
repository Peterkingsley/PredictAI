import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  time: string;
  group: 'Today' | 'Earlier';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  read: boolean;
};

export const appNotifications: AppNotification[] = [
  { id: 'prediction-ready', title: 'Prediction confirmed', message: 'Your prediction was placed successfully. You can track it from your activity.', time: '2 min ago', group: 'Today', icon: 'checkmark-circle-outline', color: colors.accent, read: false },
  { id: 'bitcoin-move', title: 'Bitcoin event update', message: 'The market “What price will Bitcoin hit in 2026?” has moved since your last visit.', time: '18 min ago', group: 'Today', icon: 'trending-up-outline', color: '#44C7D6', read: false },
  { id: 'deposit', title: 'Deposit received', message: 'Your wallet deposit has been confirmed and is now available.', time: '1 hr ago', group: 'Today', icon: 'wallet-outline', color: '#FFB14A', read: false },
  { id: 'security', title: 'New account sign-in', message: 'A sign-in was detected from your current Android device in Lagos, Nigeria.', time: '4 hrs ago', group: 'Today', icon: 'shield-checkmark-outline', color: '#9E91EE', read: true },
  { id: 'market-resolved', title: 'Market resolved', message: 'A sports event you followed has been resolved. Open your activity to see the result.', time: 'Yesterday', group: 'Earlier', icon: 'trophy-outline', color: '#FF7B3B', read: true },
  { id: 'welcome', title: 'Welcome to PredictAI', message: 'Discover events, make responsible predictions, and follow results in real time.', time: '3 days ago', group: 'Earlier', icon: 'sparkles-outline', color: colors.accent, read: true },
];

export function NotificationsScreen({ onBack, onMarkAllRead, onRead, readIds }: { onBack: () => void; onMarkAllRead: () => void; onRead: (id: string) => void; readIds: string[] }) {
  const [filter, setFilter] = useState<'All' | 'Unread'>('All');
  const isRead = (notification: AppNotification) => notification.read || readIds.includes(notification.id);
  const unreadCount = appNotifications.filter((notification) => !isRead(notification)).length;
  const visible = filter === 'Unread' ? appNotifications.filter((notification) => !isRead(notification)) : appNotifications;
  const groups = (['Today', 'Earlier'] as const).map((group) => ({ group, items: visible.filter((notification) => notification.group === group) })).filter(({ items }) => items.length > 0);

  return <View style={styles.root}>
    <View style={styles.header}>
      <Pressable accessibilityLabel="Back to home" hitSlop={10} onPress={onBack} style={({ pressed }) => pressed && styles.pressed}><Ionicons color={colors.text} name="chevron-back" size={25} /></Pressable>
      <Text allowFontScaling={false} style={styles.headerTitle}>Notifications</Text>
      <Pressable disabled={unreadCount === 0} hitSlop={8} onPress={onMarkAllRead}><Text allowFontScaling={false} style={[styles.markAll, unreadCount === 0 && styles.markAllDisabled]}>Read all</Text></Pressable>
    </View>

    <View style={styles.summary}>
      <View><Text allowFontScaling={false} style={styles.summaryTitle}>Stay up to date</Text><Text allowFontScaling={false} style={styles.summaryText}>{unreadCount === 0 ? 'You are all caught up.' : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}</Text></View>
      <View style={styles.summaryIcon}><Ionicons color={colors.accent} name="notifications-outline" size={23} /></View>
    </View>

    <View style={styles.tabs}>
      {(['All', 'Unread'] as const).map((tab) => <Pressable key={tab} onPress={() => setFilter(tab)} style={[styles.tab, filter === tab && styles.tabActive]}><Text allowFontScaling={false} style={[styles.tabText, filter === tab && styles.tabTextActive]}>{tab}{tab === 'Unread' && unreadCount > 0 ? ` ${unreadCount}` : ''}</Text></Pressable>)}
    </View>

    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {groups.map(({ group, items }) => <View key={group} style={styles.group}>
        <Text allowFontScaling={false} style={styles.groupTitle}>{group}</Text>
        <View style={styles.list}>{items.map((notification) => {
          const read = isRead(notification);
          return <Pressable key={notification.id} onPress={() => onRead(notification.id)} style={({ pressed }) => [styles.item, !read && styles.itemUnread, pressed && styles.pressed]}>
            <View style={[styles.itemIcon, { backgroundColor: `${notification.color}1F` }]}><Ionicons color={notification.color} name={notification.icon} size={21} /></View>
            <View style={styles.itemCopy}><View style={styles.itemTitleRow}><Text allowFontScaling={false} numberOfLines={1} style={[styles.itemTitle, read && styles.itemTitleRead]}>{notification.title}</Text><Text allowFontScaling={false} style={styles.itemTime}>{notification.time}</Text></View><Text allowFontScaling={false} style={styles.itemMessage}>{notification.message}</Text></View>
            {!read ? <View style={styles.unreadDot} /> : null}
          </Pressable>;
        })}</View>
      </View>)}
      {visible.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons color={colors.textMuted} name="checkmark-done-outline" size={32} /></View><Text allowFontScaling={false} style={styles.emptyTitle}>You’re all caught up</Text><Text allowFontScaling={false} style={styles.emptyText}>New updates about your predictions, wallet, and account will appear here.</Text><Pressable onPress={() => setFilter('All')} style={styles.showAll}><Text allowFontScaling={false} style={styles.showAllText}>View all notifications</Text></Pressable></View> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  markAll: { color: colors.accent, fontSize: 11, fontWeight: '600' },
  markAllDisabled: { color: colors.textFaint },
  summary: { margin: 14, marginBottom: 10, padding: 15, borderRadius: 15, backgroundColor: '#181A1D', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  summaryText: { color: colors.textMuted, fontSize: 10, marginTop: 5 },
  summaryIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#273217', alignItems: 'center', justifyContent: 'center' },
  tabs: { marginHorizontal: 14, height: 40, padding: 4, borderRadius: 11, backgroundColor: '#181A1D', flexDirection: 'row', gap: 4 },
  tab: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  tabTextActive: { color: colors.text },
  content: { padding: 14, paddingTop: 18, paddingBottom: 40 },
  group: { marginBottom: 20 },
  groupTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: .8, textTransform: 'uppercase', marginBottom: 8 },
  list: { borderRadius: 15, overflow: 'hidden', backgroundColor: '#181A1D' },
  item: { minHeight: 84, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemUnread: { backgroundColor: '#1B2017' },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '700' },
  itemTitleRead: { fontWeight: '500' },
  itemTime: { color: colors.textFaint, fontSize: 9 },
  itemMessage: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 5 },
  pressed: { opacity: .65 },
  empty: { paddingTop: 74, paddingHorizontal: 30, alignItems: 'center' },
  emptyIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 17 },
  emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7 },
  showAll: { marginTop: 17, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 9, backgroundColor: '#273217' },
  showAllText: { color: colors.accent, fontSize: 11, fontWeight: '600' },
});
