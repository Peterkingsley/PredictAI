import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';

const historyTabs = ['Deposit', 'Withdrawal', 'Predict'] as const;
type HistoryTab = (typeof historyTabs)[number];

export function FundsHistoryScreen({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('Predict');
  return <View style={styles.root}>
    <View style={styles.header}><Pressable onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={26} /></Pressable><Text allowFontScaling={false} style={styles.title}>Funds History</Text><View style={styles.spacer} /></View>
    <View style={styles.tabs}>{historyTabs.map((tab) => <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.tabButton}><Text allowFontScaling={false} style={[styles.tab, activeTab === tab && styles.active]}>{tab}</Text></Pressable>)}</View>
    <View style={styles.filter}><Text allowFontScaling={false} style={styles.filterText}>All⌄</Text><Ionicons color={colors.text} name="filter-outline" size={22} /></View>
    <EmptyState />
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, header: { height: 51, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: colors.text, fontSize: 18, fontWeight: '700' }, spacer: { width: 26 }, tabs: { height: 46, flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, gap: 28 }, tabButton: { justifyContent: 'center' }, tab: { color: colors.textMuted, fontSize: 13, paddingVertical: 13 }, active: { color: colors.text, borderBottomWidth: 2, borderBottomColor: colors.text }, filter: { height: 54, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }, filterText: { color: colors.textMuted, fontSize: 14 } });
