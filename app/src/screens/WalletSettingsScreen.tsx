import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';

type AutoLock = '1 min' | '5 min' | '15 min' | 'Never';
type Currency = 'USD' | 'NGN' | 'USDC';
export type FeeSpeed = 'Standard' | 'Fast';
export type Network = 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base';
type SortMode = 'Balance' | 'Name' | 'Performance';
type WalletMode = 'Prediction' | 'Trading';

export type WalletSettings = {
  requireBiometrics: boolean;
  withdrawalConfirmation: boolean;
  autoLock: AutoLock;
  trustedAddresses: string[];
  defaultNetwork: Network;
  withdrawalLimit: string;
  feeSpeed: FeeSpeed;
  transactionNotifications: boolean;
  currency: Currency;
  hideBalances: boolean;
  assetSort: SortMode;
  compactView: boolean;
  walletMode: WalletMode;
  supportedAssets: Record<'USDC' | 'USDT', boolean>;
  connectedWallet: string | null;
};

export const defaultWalletSettings: WalletSettings = {
  requireBiometrics: true,
  withdrawalConfirmation: true,
  autoLock: '5 min',
  trustedAddresses: [],
  defaultNetwork: 'Polygon',
  withdrawalLimit: '1000',
  feeSpeed: 'Standard',
  transactionNotifications: true,
  currency: 'USD',
  hideBalances: false,
  assetSort: 'Balance',
  compactView: false,
  walletMode: 'Prediction',
  supportedAssets: { USDC: true, USDT: true },
  connectedWallet: null,
};

function Section({ children, icon, title }: { children: React.ReactNode; icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return <View style={styles.section}>
    <View style={styles.sectionHeader}><Ionicons color={colors.accent} name={icon} size={18} /><Text allowFontScaling={false} style={styles.sectionTitle}>{title}</Text></View>
    <View style={styles.sectionBody}>{children}</View>
  </View>;
}

function ToggleRow({ description, label, onChange, value }: { description: string; label: string; onChange: (value: boolean) => void; value: boolean }) {
  return <View style={styles.row}>
    <View style={styles.rowCopy}><Text allowFontScaling={false} style={styles.rowLabel}>{label}</Text><Text allowFontScaling={false} style={styles.rowDescription}>{description}</Text></View>
    <Switch ios_backgroundColor="#35383E" onValueChange={onChange} thumbColor={value ? colors.buttonText : '#A5A7AC'} trackColor={{ false: '#35383E', true: colors.accent }} value={value} />
  </View>;
}

function ChoiceRow<T extends string>({ label, onChange, options, value }: { label: string; onChange: (value: T) => void; options: readonly T[]; value: T }) {
  return <View style={styles.choiceBlock}>
    <Text allowFontScaling={false} style={styles.rowLabel}>{label}</Text>
    <View style={styles.choices}>{options.map((option) => <Pressable key={option} onPress={() => onChange(option)} style={[styles.choice, option === value && styles.choiceSelected]}><Text allowFontScaling={false} style={[styles.choiceText, option === value && styles.choiceTextSelected]}>{option}</Text></Pressable>)}</View>
  </View>;
}

function NavigationRow({ detail, icon, label, onPress }: { detail?: string; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.navigationRow, pressed && styles.pressed]}>
    <View style={styles.navigationIcon}><Ionicons color={colors.text} name={icon} size={18} /></View>
    <Text allowFontScaling={false} style={styles.navigationLabel}>{label}</Text>
    {detail ? <Text allowFontScaling={false} style={styles.navigationDetail}>{detail}</Text> : null}
    <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
  </Pressable>;
}

export function WalletSettingsScreen({ onBack, onOpenDeposit, onOpenHistory, onUpdate, settings }: { onBack: () => void; onOpenDeposit: () => void; onOpenHistory: () => void; onUpdate: (settings: WalletSettings) => void; settings: WalletSettings }) {
  const [management, setManagement] = useState<'addresses' | 'wallets' | null>(null);
  const [newAddress, setNewAddress] = useState('');
  const [addressError, setAddressError] = useState('');
  const [exported, setExported] = useState(false);
  const update = (patch: Partial<WalletSettings>) => onUpdate({ ...settings, ...patch });
  const addAddress = () => {
    const address = newAddress.trim();
    if (address.length < 12) { setAddressError('Enter a valid wallet address.'); return; }
    if (!settings.trustedAddresses.includes(address)) update({ trustedAddresses: [...settings.trustedAddresses, address] });
    setNewAddress('');
    setAddressError('');
  };

  return <View style={styles.root}>
    <View style={styles.header}><Pressable hitSlop={10} onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={25} /></Pressable><Text allowFontScaling={false} style={styles.headerTitle}>Wallet Settings</Text><View style={styles.headerSpacer} /></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Section icon="shield-checkmark-outline" title="Security">
        <ToggleRow description="Require biometric authentication before withdrawals." label="Biometric approval" onChange={(requireBiometrics) => update({ requireBiometrics })} value={settings.requireBiometrics} />
        <ToggleRow description="Review withdrawal details before funds are sent." label="Withdrawal confirmation" onChange={(withdrawalConfirmation) => update({ withdrawalConfirmation })} value={settings.withdrawalConfirmation} />
        <ChoiceRow label="Automatic wallet lock" onChange={(autoLock) => update({ autoLock })} options={['1 min', '5 min', '15 min', 'Never'] as const} value={settings.autoLock} />
        <NavigationRow detail={`${settings.trustedAddresses.length}`} icon="bookmark-outline" label="Trusted addresses" onPress={() => setManagement('addresses')} />
      </Section>

      <Section icon="swap-horizontal-outline" title="Transaction preferences">
        <ChoiceRow label="Default network" onChange={(defaultNetwork) => update({ defaultNetwork })} options={['Ethereum', 'Polygon', 'Arbitrum', 'Base'] as const} value={settings.defaultNetwork} />
        <View style={styles.fieldBlock}><Text allowFontScaling={false} style={styles.rowLabel}>Daily withdrawal limit</Text><View style={styles.field}><TextInput keyboardType="decimal-pad" onChangeText={(withdrawalLimit) => update({ withdrawalLimit: withdrawalLimit.replace(/[^0-9.]/g, '') })} placeholder="0.00" placeholderTextColor={colors.textFaint} selectionColor={colors.accent} style={styles.input} value={settings.withdrawalLimit} /><Text allowFontScaling={false} style={styles.fieldSuffix}>USDC</Text></View></View>
        <ChoiceRow label="Network fee speed" onChange={(feeSpeed) => update({ feeSpeed })} options={['Standard', 'Fast'] as const} value={settings.feeSpeed} />
        <ToggleRow description="Notify when deposits and withdrawals change status." label="Transaction notifications" onChange={(transactionNotifications) => update({ transactionNotifications })} value={settings.transactionNotifications} />
      </Section>

      <Section icon="options-outline" title="Display preferences">
        <ChoiceRow label="Display currency" onChange={(currency) => update({ currency })} options={['USD', 'NGN', 'USDC'] as const} value={settings.currency} />
        <ToggleRow description="Mask wallet balances whenever the wallet opens." label="Hide balances by default" onChange={(hideBalances) => update({ hideBalances })} value={settings.hideBalances} />
        <ChoiceRow label="Sort assets by" onChange={(assetSort) => update({ assetSort })} options={['Balance', 'Name', 'Performance'] as const} value={settings.assetSort} />
        <ToggleRow description="Use smaller rows to show more assets." label="Compact asset view" onChange={(compactView) => update({ compactView })} value={settings.compactView} />
        <ChoiceRow label="Wallet mode" onChange={(walletMode) => update({ walletMode })} options={['Prediction', 'Trading'] as const} value={settings.walletMode} />
      </Section>

      <Section icon="wallet-outline" title="Wallet management">
        <ToggleRow description="Show USDC in deposits, withdrawals, and balances." label="USDC" onChange={(value) => { if (value || settings.supportedAssets.USDT) update({ supportedAssets: { ...settings.supportedAssets, USDC: value } }); }} value={settings.supportedAssets.USDC} />
        <ToggleRow description="Show USDT in deposits, withdrawals, and balances." label="USDT" onChange={(value) => { if (value || settings.supportedAssets.USDC) update({ supportedAssets: { ...settings.supportedAssets, USDT: value } }); }} value={settings.supportedAssets.USDT} />
        <NavigationRow icon="qr-code-outline" label="Deposit addresses" onPress={onOpenDeposit} />
        <NavigationRow detail={settings.connectedWallet ?? 'None'} icon="link-outline" label="Connected wallets" onPress={() => setManagement('wallets')} />
        <NavigationRow icon="document-text-outline" label="View transaction history" onPress={onOpenHistory} />
        <Pressable onPress={() => setExported(true)} style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}><Ionicons color={colors.accent} name={exported ? 'checkmark-circle-outline' : 'download-outline'} size={18} /><Text allowFontScaling={false} style={styles.exportText}>{exported ? 'History export prepared' : 'Export transaction history'}</Text></Pressable>
      </Section>
    </ScrollView>

    <Modal animationType="slide" onRequestClose={() => setManagement(null)} transparent visible={management !== null}>
      <Pressable onPress={() => setManagement(null)} style={styles.overlay}><Pressable onPress={() => undefined} style={styles.sheet}><View style={styles.handle} />
        {management === 'addresses' ? <>
          <Text allowFontScaling={false} style={styles.sheetTitle}>Trusted addresses</Text>
          <Text allowFontScaling={false} style={styles.sheetDescription}>Withdrawals to trusted addresses are easier to recognize during confirmation.</Text>
          <View style={styles.addressField}><TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setNewAddress} placeholder="Paste wallet address" placeholderTextColor={colors.textFaint} style={styles.addressInput} value={newAddress} /><Pressable onPress={addAddress}><Text allowFontScaling={false} style={styles.addText}>Add</Text></Pressable></View>
          {addressError ? <Text allowFontScaling={false} style={styles.error}>{addressError}</Text> : null}
          {settings.trustedAddresses.length ? settings.trustedAddresses.map((address) => <View key={address} style={styles.addressRow}><Text allowFontScaling={false} numberOfLines={1} style={styles.address}>{address}</Text><Pressable onPress={() => update({ trustedAddresses: settings.trustedAddresses.filter((item) => item !== address) })}><Ionicons color={colors.danger} name="trash-outline" size={18} /></Pressable></View>) : <Text allowFontScaling={false} style={styles.empty}>No trusted addresses yet.</Text>}
        </> : <>
          <Text allowFontScaling={false} style={styles.sheetTitle}>Connected wallets</Text>
          <Text allowFontScaling={false} style={styles.sheetDescription}>Choose a wallet provider to connect for this prototype.</Text>
          {['MetaMask', 'WalletConnect', 'Coinbase Wallet'].map((wallet) => <Pressable key={wallet} onPress={() => { update({ connectedWallet: wallet }); setManagement(null); }} style={styles.walletOption}><View style={styles.walletOptionIcon}><Ionicons color={colors.text} name="wallet-outline" size={20} /></View><Text allowFontScaling={false} style={styles.walletOptionText}>{wallet}</Text>{settings.connectedWallet === wallet ? <Ionicons color={colors.accent} name="checkmark" size={20} /> : null}</Pressable>)}
          {settings.connectedWallet ? <Pressable onPress={() => { update({ connectedWallet: null }); setManagement(null); }} style={styles.disconnect}><Text allowFontScaling={false} style={styles.disconnectText}>Disconnect wallet</Text></Pressable> : null}
        </>}
        <View style={styles.done}><PrimaryButton label="Done" onPress={() => setManagement(null)} /></View>
      </Pressable></Pressable>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  headerSpacer: { width: 25 },
  content: { padding: 14, paddingBottom: 45, gap: 14 },
  section: { borderRadius: 15, overflow: 'hidden', backgroundColor: '#181A1D' },
  sectionHeader: { minHeight: 45, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  sectionBody: { paddingHorizontal: 14 },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowCopy: { flex: 1 },
  rowLabel: { color: colors.text, fontSize: 12, fontWeight: '600' },
  rowDescription: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  choiceBlock: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  choice: { flexGrow: 1, minWidth: 66, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center' },
  choiceSelected: { backgroundColor: '#304019', borderWidth: 1, borderColor: colors.accent },
  choiceText: { color: colors.textMuted, fontSize: 10 },
  choiceTextSelected: { color: colors.accent, fontWeight: '600' },
  fieldBlock: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  field: { height: 43, borderRadius: 9, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 9 },
  input: { flex: 1, color: colors.text, fontSize: 14 },
  fieldSuffix: { color: colors.textMuted, fontSize: 11 },
  navigationRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  navigationIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  navigationLabel: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '500' },
  navigationDetail: { maxWidth: 100, color: colors.textMuted, fontSize: 10 },
  pressed: { opacity: .65 },
  exportButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  exportText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.76)' },
  sheet: { maxHeight: '80%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#191B1E', padding: 18, paddingTop: 9 },
  handle: { width: 48, height: 4, borderRadius: 2, backgroundColor: '#4A4D53', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '600' },
  sheetDescription: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 5, marginBottom: 16 },
  addressField: { minHeight: 48, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  addressInput: { flex: 1, color: colors.text, fontSize: 12 },
  addText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 11, marginTop: 7 },
  empty: { color: colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 24 },
  addressRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  address: { flex: 1, color: colors.textMuted, fontSize: 11 },
  walletOption: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  walletOptionIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  walletOptionText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '500' },
  disconnect: { alignItems: 'center', paddingVertical: 14 },
  disconnectText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  done: { marginTop: 13 },
});
