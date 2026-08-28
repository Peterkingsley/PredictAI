import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import type { FeeSpeed, Network } from './WalletSettingsScreen';

type Asset = 'USDC' | 'USDT';
type Chain = Network;

const estimatedFees: Record<Chain, number> = {
  Ethereum: 3.5,
  Polygon: 0.1,
  Arbitrum: 0.2,
  Base: 0.15,
};

export function WithdrawalScreen({ dailyLimit, defaultNetwork, enabledAssets, feeSpeed, onBack, onComplete, requireBiometrics, requireConfirmation }: { dailyLimit: number; defaultNetwork: Network; enabledAssets: readonly Asset[]; feeSpeed: FeeSpeed; onBack: () => void; onComplete: () => void; requireBiometrics: boolean; requireConfirmation: boolean }) {
  const [asset, setAsset] = useState<Asset>(enabledAssets[0] ?? 'USDC');
  const [chain, setChain] = useState<Chain>(defaultNetwork);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'confirm' | 'processing' | 'success'>('idle');
  const baseFee = estimatedFees[chain];
  const fee = feeSpeed === 'Fast' ? baseFee * 1.35 : baseFee;
  const receiveAmount = Math.max((Number(amount) || 0) - fee, 0);

  useEffect(() => {
    if (status !== 'processing') return;
    const timer = setTimeout(() => setStatus('success'), 1800);
    return () => clearTimeout(timer);
  }, [status]);

  const authorizeWithdrawal = async () => {
    if (requireBiometrics) {
      const [hasHardware, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
      if (!hasHardware || !enrolled) { setStatus('idle'); setError('Biometric approval is enabled but unavailable on this device.'); return; }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Approve withdrawal', cancelLabel: 'Cancel' });
      if (!result.success) { setStatus('idle'); setError('Withdrawal approval was cancelled.'); return; }
    }
    setStatus('processing');
  };

  const withdraw = () => {
    const numericAmount = Number(amount);
    if (address.trim().length < 12) { setError('Enter a valid wallet address.'); return; }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) { setError('Enter a valid withdrawal amount.'); return; }
    if (numericAmount <= fee) { setError(`Amount must be greater than the ${fee.toFixed(2)} ${asset} estimated fee.`); return; }
    if (dailyLimit > 0 && numericAmount > dailyLimit) { setError(`Amount exceeds your ${dailyLimit.toFixed(2)} USDC daily withdrawal limit.`); return; }
    setError('');
    if (requireConfirmation) setStatus('confirm');
    else void authorizeWithdrawal();
  };

  return <View style={styles.root}>
    <View style={styles.header}><Pressable onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={24} /></Pressable><Text allowFontScaling={false} style={styles.headerTitle}>Withdraw</Text><View style={styles.headerSpacer} /></View>
    <View style={styles.content}>
      <Text allowFontScaling={false} style={styles.label}>Receive funds as</Text>
      <View style={styles.options}>{enabledAssets.map((item) => <Pressable key={item} onPress={() => setAsset(item)} style={[styles.assetOption, asset === item && styles.selected]}><View style={[styles.coin, item === 'USDT' && styles.usdtCoin]}><Text style={styles.coinText}>$</Text></View><Text allowFontScaling={false} style={styles.optionText}>{item}</Text>{asset === item ? <Ionicons color={colors.accent} name="checkmark-circle" size={19} /> : null}</Pressable>)}</View>
      <Text allowFontScaling={false} style={styles.label}>Select network</Text>
      <View style={styles.chains}>{(['Ethereum', 'Polygon', 'Arbitrum', 'Base'] as Chain[]).map((item) => <Pressable key={item} onPress={() => setChain(item)} style={[styles.chain, chain === item && styles.chainSelected]}><Text allowFontScaling={false} style={[styles.chainText, chain === item && styles.chainTextSelected]}>{item}</Text></Pressable>)}</View>
      <Text allowFontScaling={false} style={styles.label}>Wallet address</Text>
      <View style={styles.field}><TextInput allowFontScaling={false} autoCapitalize="none" autoCorrect={false} onChangeText={setAddress} placeholder={`Paste ${chain} address`} placeholderTextColor={colors.textFaint} style={styles.input} value={address} /><Ionicons color={colors.textMuted} name="clipboard-outline" size={19} /></View>
      <View style={styles.amountHeading}><Text allowFontScaling={false} style={styles.label}>Amount</Text><Text allowFontScaling={false} style={styles.available}>Available: 0.00 {asset}</Text></View>
      <View style={styles.field}><TextInput allowFontScaling={false} keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.textFaint} style={styles.amountInput} value={amount} /><Text allowFontScaling={false} style={styles.assetSuffix}>{asset}</Text><Pressable onPress={() => setAmount('0')}><Text allowFontScaling={false} style={styles.max}>MAX</Text></Pressable></View>
      <View style={styles.summary}><View style={styles.summaryRow}><Text style={styles.summaryLabel}>Network</Text><Text style={styles.summaryValue}>{chain}</Text></View><View style={styles.summaryRow}><Text style={styles.summaryLabel}>Estimated network fee</Text><Text style={styles.summaryValue}>{fee.toFixed(2)} {asset}</Text></View><View style={styles.summaryRow}><Text style={styles.summaryLabel}>You receive</Text><Text style={styles.summaryValue}>{receiveAmount.toFixed(2)} {asset}</Text></View></View>
      {error ? <Text allowFontScaling={false} style={styles.error}>{error}</Text> : null}
      <View style={styles.submit}><PrimaryButton label="Withdraw" onPress={withdraw} /></View>
    </View>
    <Modal transparent animationType="fade" onRequestClose={() => status === 'confirm' && setStatus('idle')} visible={status !== 'idle'}><View style={styles.overlay}><View style={styles.statusCard}>{status === 'confirm' ? <><View style={styles.confirmIcon}><Ionicons color={colors.accent} name="shield-checkmark-outline" size={34} /></View><Text allowFontScaling={false} style={styles.statusTitle}>Confirm withdrawal</Text><View style={styles.confirmSummary}><View style={styles.summaryRow}><Text style={styles.summaryLabel}>Amount</Text><Text style={styles.summaryValue}>{amount} {asset}</Text></View><View style={styles.summaryRow}><Text style={styles.summaryLabel}>Network</Text><Text style={styles.summaryValue}>{chain}</Text></View><View style={styles.summaryRow}><Text style={styles.summaryLabel}>Fee speed</Text><Text style={styles.summaryValue}>{feeSpeed}</Text></View><View style={styles.summaryRow}><Text style={styles.summaryLabel}>You receive</Text><Text style={styles.summaryValue}>{receiveAmount.toFixed(2)} {asset}</Text></View></View><View style={styles.confirmActions}><Pressable onPress={() => setStatus('idle')} style={styles.cancelButton}><Text style={styles.cancelText}>Cancel</Text></Pressable><View style={styles.confirmButton}><PrimaryButton label="Confirm" onPress={() => void authorizeWithdrawal()} /></View></View></> : status === 'processing' ? <><View style={styles.processingIcon}><Ionicons color={colors.accent} name="sync" size={38} /></View><Text allowFontScaling={false} style={styles.statusTitle}>Processing withdrawal</Text><Text allowFontScaling={false} style={styles.statusText}>Confirming your withdrawal details securely…</Text></> : <><View style={styles.successIcon}><Ionicons color="#101113" name="checkmark" size={40} /></View><Text allowFontScaling={false} style={styles.statusTitle}>Withdrawal submitted</Text><Text allowFontScaling={false} style={styles.statusText}>Your {asset} withdrawal has been submitted on {chain}.</Text><View style={styles.backButton}><PrimaryButton label="Back to wallet" onPress={onComplete} /></View></>}</View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, header: { height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' }, headerSpacer: { width: 24 }, content: { flex: 1, padding: 18 }, label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 9 }, options: { flexDirection: 'row', gap: 10, marginBottom: 22 }, assetOption: { flex: 1, height: 48, borderRadius: 11, paddingHorizontal: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'transparent' }, selected: { borderColor: colors.accent, backgroundColor: '#202719' }, coin: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#2775CA', alignItems: 'center', justifyContent: 'center' }, usdtCoin: { backgroundColor: '#26A17B' }, coinText: { color: '#fff', fontWeight: '800' }, optionText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }, chains: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }, chain: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.surface }, chainSelected: { backgroundColor: '#304019' }, chainText: { color: colors.textMuted, fontSize: 12 }, chainTextSelected: { color: colors.accent }, field: { minHeight: 49, borderRadius: 11, backgroundColor: colors.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 }, input: { flex: 1, color: colors.text, fontSize: 13 }, amountHeading: { flexDirection: 'row', justifyContent: 'space-between' }, available: { color: colors.textMuted, fontSize: 11 }, amountInput: { flex: 1, color: colors.text, fontSize: 18 }, assetSuffix: { color: colors.text, fontSize: 13 }, max: { color: colors.accent, fontSize: 11, fontWeight: '700' }, summary: { borderRadius: 11, backgroundColor: '#17191B', padding: 14, gap: 11 }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between' }, summaryLabel: { color: colors.textMuted, fontSize: 12 }, summaryValue: { color: colors.text, fontSize: 12 }, error: { color: colors.danger, fontSize: 12, marginTop: 10 }, submit: { marginTop: 'auto', paddingTop: 20 }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.78)', alignItems: 'center', justifyContent: 'center', padding: 24 }, statusCard: { width: '100%', borderRadius: 20, backgroundColor: '#1B1D20', padding: 28, alignItems: 'center' }, confirmIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#263019', alignItems: 'center', justifyContent: 'center' }, confirmSummary: { alignSelf: 'stretch', borderRadius: 11, backgroundColor: '#17191B', padding: 14, gap: 11, marginTop: 18 }, confirmActions: { alignSelf: 'stretch', flexDirection: 'row', gap: 10, marginTop: 20 }, cancelButton: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: colors.text, fontSize: 14, fontWeight: '500' }, confirmButton: { flex: 2 }, processingIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#263019', alignItems: 'center', justifyContent: 'center' }, successIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, statusTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 20 }, statusText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 }, backButton: { alignSelf: 'stretch', marginTop: 24 } });
