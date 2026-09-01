import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { DepositScreen } from './DepositScreen';
import { defaultWalletSettings, WalletSettingsScreen } from './WalletSettingsScreen';
import { WithdrawalScreen } from './WithdrawalScreen';

export function AssetsScreen({ onHistory, onSharePortfolio }: { onHistory: () => void; onSharePortfolio: () => void }) {
  const [withdrawing, setWithdrawing] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(defaultWalletSettings);
  const enabledAssets = (['USDC', 'USDT'] as const).filter((asset) => settings.supportedAssets[asset]);

  if (withdrawing) return <WithdrawalScreen dailyLimit={Number(settings.withdrawalLimit) || 0} defaultNetwork={settings.defaultNetwork} enabledAssets={enabledAssets} feeSpeed={settings.feeSpeed} onBack={() => setWithdrawing(false)} onComplete={() => setWithdrawing(false)} requireBiometrics={settings.requireBiometrics} requireConfirmation={settings.withdrawalConfirmation} />;
  if (depositing) return <DepositScreen enabledAssets={enabledAssets} onBack={() => setDepositing(false)} />;
  if (settingsOpen) return <WalletSettingsScreen onBack={() => setSettingsOpen(false)} onOpenDeposit={() => { setSettingsOpen(false); setDepositing(true); }} onOpenHistory={onHistory} onUpdate={setSettings} settings={settings} />;

  const balance = settings.hideBalances ? '••••' : settings.currency === 'NGN' ? '₦0.00' : settings.currency === 'USDC' ? '0.00 USDC' : '$0.00';
  const hiddenValue = settings.hideBalances ? '••••' : '$0';

  return <View style={styles.root}>
    <View style={styles.header}><Ionicons color={colors.text} name="chevron-back" size={23} /><Text allowFontScaling={false} style={styles.headerTitle}>Wallet</Text><View style={styles.actions}><Pressable onPress={onHistory}><Ionicons color={colors.text} name="documents-outline" size={20} /></Pressable><Pressable accessibilityLabel="Wallet settings" onPress={() => setSettingsOpen(true)}><Ionicons color={colors.text} name="settings-outline" size={21} /></Pressable></View></View>
    <View style={styles.content}>
      <Text allowFontScaling={false} style={styles.label}>Total Balance  ◉</Text>
      <Text allowFontScaling={false} style={styles.balance}>{balance}</Text>
      <View style={styles.walletActions}><Pressable onPress={() => setDepositing(true)} style={[styles.add, { backgroundColor: colors.primary }]}><Text allowFontScaling={false} style={styles.addText}>Add</Text></Pressable><Pressable onPress={() => setWithdrawing(true)} style={styles.withdraw}><Ionicons color={colors.text} name="arrow-up-outline" size={16} /><Text allowFontScaling={false} style={styles.withdrawText}>Withdraw</Text></Pressable></View>
      <Text allowFontScaling={false} style={styles.label}>Unrealized PNL  <Text style={styles.value}>{hiddenValue}{settings.hideBalances ? '' : ' (0%)'}</Text></Text>
      <View style={styles.stats}><View><Text style={styles.label}>Today's Realized PNL</Text><Text style={styles.statValue}>{hiddenValue}{settings.hideBalances ? '' : ' (0%)'}</Text></View><View><Text style={styles.label}>Position Value</Text><Text style={styles.statValue}>{hiddenValue}</Text></View></View>
      <Pressable onPress={onSharePortfolio} style={styles.sharePortfolio}><Ionicons color={colors.accent} name="share-social-outline" size={17}/><View style={styles.shareCopy}><Text style={styles.shareTitle}>Share public portfolio</Text><Text style={styles.shareDescription}>Choose exactly which performance and positions appear in Posts.</Text></View><Ionicons color={colors.textMuted} name="chevron-forward" size={17}/></Pressable>
      <View style={styles.tabs}><Text style={styles.activeTab}>Positions (0)</Text><Text style={styles.tab}>Order</Text><Text style={styles.tab}>Filled</Text></View>
      <EmptyState />
    </View>
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, header: { height: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerTitle: { color: colors.text, fontSize: 17, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 17 }, content: { flex: 1, paddingHorizontal: 18 }, label: { color: colors.textMuted, fontSize: 13 }, balance: { color: colors.text, fontSize: 34, fontWeight: '600', marginTop: 4 }, walletActions: { flexDirection: 'row', gap: 10, marginTop: 18, marginBottom: 26 }, add: { minWidth: 92, backgroundColor: colors.button, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 9, alignItems: 'center' }, addText: { color: colors.buttonText, fontSize: 14, fontWeight: '600' }, withdraw: { minWidth: 112, backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, withdrawText: { color: colors.text, fontSize: 14, fontWeight: '600' }, value: { color: colors.text }, stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, marginBottom: 22 }, statValue: { color: colors.text, fontSize: 15, marginTop: 10 }, sharePortfolio: { minHeight: 61, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: '#17191B', marginBottom: 25 }, shareCopy: { flex: 1 }, shareTitle: { color: colors.text, fontSize: 10, fontWeight: '700' }, shareDescription: { color: colors.textMuted, fontSize: 7, lineHeight: 11, marginTop: 3 }, tabs: { flexDirection: 'row', gap: 27, borderBottomWidth: 1, borderBottomColor: colors.border }, tab: { color: colors.textMuted, fontSize: 15, paddingBottom: 13 }, activeTab: { color: colors.text, fontSize: 15, fontWeight: '700', paddingBottom: 13, borderBottomWidth: 2, borderBottomColor: colors.text }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.72)' }, sheet: { backgroundColor: '#1A1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 34 }, handle: { width: 58, height: 4, borderRadius: 2, backgroundColor: '#4A4C51', alignSelf: 'center', marginBottom: 24 }, sheetTitle: { color: colors.text, fontSize: 20, marginBottom: 18 }, mode: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, borderRadius: 12 }, modeSelected: { backgroundColor: colors.surface }, modeCopy: { flex: 1 }, modeTitle: { color: colors.text, fontSize: 15 }, modeDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 } });
