import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Asset = 'USDC' | 'USDT';
type Chain = 'Ethereum' | 'Polygon' | 'Arbitrum' | 'Base';

const depositAddresses: Record<Chain, string> = {
  Ethereum: '0x7B42eF91A06C8d31a8F5927B09cE41D67A2f9021',
  Polygon: '0x91A8c3F702d4E65B71c9A20F6bE58D1243A76c0B',
  Arbitrum: '0xC46f71D3908a5E21bA794d30E6c7F8A214B65e09',
  Base: '0xE12A68c90B4F7d351A6eD20C9F83B47A50D162fe',
};

export function DepositScreen({ enabledAssets = ['USDC', 'USDT'], onBack }: { enabledAssets?: readonly Asset[]; onBack: () => void }) {
  const [asset, setAsset] = useState<Asset>(enabledAssets[0] ?? 'USDC');
  const [chain, setChain] = useState<Chain>('Polygon');
  const [copied, setCopied] = useState(false);
  const address = useMemo(() => depositAddresses[chain], [chain]);

  const copyAddress = () => {
    // Connect to the platform clipboard when expo-clipboard is configured.
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return <View style={styles.root}>
    <View style={styles.header}><Pressable onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={24} /></Pressable><Text allowFontScaling={false} style={styles.headerTitle}>Deposit</Text><View style={styles.headerSpacer} /></View>
    <View style={styles.content}>
      <Text allowFontScaling={false} style={styles.label}>Deposit asset</Text>
      <View style={styles.options}>{enabledAssets.map((item) => <Pressable key={item} onPress={() => setAsset(item)} style={[styles.assetOption, asset === item && styles.selected]}><View style={[styles.coin, item === 'USDT' && styles.usdtCoin]}><Text style={styles.coinText}>$</Text></View><Text allowFontScaling={false} style={styles.optionText}>{item}</Text>{asset === item ? <Ionicons color={colors.accent} name="checkmark-circle" size={19} /> : null}</Pressable>)}</View>
      <Text allowFontScaling={false} style={styles.label}>Select network</Text>
      <View style={styles.chains}>{(['Ethereum', 'Polygon', 'Arbitrum', 'Base'] as Chain[]).map((item) => <Pressable key={item} onPress={() => { setChain(item); setCopied(false); }} style={[styles.chain, chain === item && styles.chainSelected]}><Text allowFontScaling={false} style={[styles.chainText, chain === item && styles.chainTextSelected]}>{item}</Text></Pressable>)}</View>
      <View style={styles.depositCard}><View style={styles.qrPlaceholder}><Ionicons color={colors.text} name="qr-code-outline" size={94} /></View><Text allowFontScaling={false} style={styles.depositTitle}>{asset} deposit address</Text><Text allowFontScaling={false} style={styles.network}>Network: {chain}</Text><Pressable onPress={copyAddress} style={styles.addressRow}><Text allowFontScaling={false} numberOfLines={2} style={styles.address}>{address}</Text><Ionicons color={copied ? colors.accent : colors.text} name={copied ? 'checkmark-circle' : 'copy-outline'} size={20} /></Pressable><Pressable onPress={copyAddress} style={styles.copyButton}><Text allowFontScaling={false} style={styles.copyText}>{copied ? 'Address copied' : 'Copy address'}</Text></Pressable></View>
      <View style={styles.warning}><Ionicons color="#F0A23A" name="warning-outline" size={20} /><Text allowFontScaling={false} style={styles.warningText}>Only send {asset} using the {chain} network. Sending another asset or using another network may permanently lose your funds.</Text></View>
      <Pressable onPress={onBack} style={styles.doneButton}><Text allowFontScaling={false} style={styles.doneText}>Back to wallet</Text></Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, header: { height: 52, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' }, headerSpacer: { width: 24 }, content: { flex: 1, padding: 18 }, label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 9 }, options: { flexDirection: 'row', gap: 10, marginBottom: 22 }, assetOption: { flex: 1, height: 48, borderRadius: 11, paddingHorizontal: 12, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'transparent' }, selected: { borderColor: colors.accent, backgroundColor: '#202719' }, coin: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#2775CA', alignItems: 'center', justifyContent: 'center' }, usdtCoin: { backgroundColor: '#26A17B' }, coinText: { color: '#fff', fontWeight: '800' }, optionText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' }, chains: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }, chain: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.surface }, chainSelected: { backgroundColor: '#304019' }, chainText: { color: colors.textMuted, fontSize: 12 }, chainTextSelected: { color: colors.accent }, depositCard: { borderRadius: 16, backgroundColor: '#181A1D', padding: 18, alignItems: 'center' }, qrPlaceholder: { width: 126, height: 126, borderRadius: 12, backgroundColor: colors.button, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, depositTitle: { color: colors.text, fontSize: 16, fontWeight: '700' }, network: { color: colors.textMuted, fontSize: 12, marginTop: 5 }, addressRow: { width: '100%', minHeight: 54, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 12, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }, address: { flex: 1, color: colors.text, fontSize: 11, lineHeight: 16 }, copyButton: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 9, backgroundColor: '#304019' }, copyText: { color: colors.accent, fontSize: 12, fontWeight: '600' }, warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: 11, backgroundColor: '#261C12', marginTop: 16 }, warningText: { flex: 1, color: '#D9A15D', fontSize: 11, lineHeight: 17 }, doneButton: { marginTop: 'auto', minHeight: 46, borderRadius: 12, backgroundColor: colors.button, alignItems: 'center', justifyContent: 'center' }, doneText: { color: colors.buttonText, fontSize: 15, fontWeight: '600' } });
