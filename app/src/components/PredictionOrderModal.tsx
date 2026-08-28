import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
import { PrimaryButton } from './PrimaryButton';

export type PredictionOrder = {
  marketTitle: string;
  outcomeLabel: string;
  odds: string;
  tradeAction?: 'Buy' | 'Sell';
};

type Step = 'amount' | 'confirm' | 'success';

function cleanAmount(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '');
  const [whole = '', ...decimals] = normalized.split('.');
  return decimals.length ? `${whole}.${decimals.join('').slice(0, 2)}` : whole;
}

export function PredictionOrderModal({ order, onClose }: { order: PredictionOrder | null; onClose: () => void }) {
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (order) {
      setStep('amount');
      setAmount('');
    }
  }, [order]);

  const amountValue = Number(amount);
  const multiplier = Number.parseFloat(order?.odds ?? '');
  const estimatedReturn = useMemo(() => Number.isFinite(multiplier) && amountValue > 0 ? amountValue * multiplier : null, [amountValue, multiplier]);
  const close = () => { setStep('amount'); setAmount(''); onClose(); };

  return <Modal animationType="fade" onRequestClose={close} transparent visible={!!order}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.overlay, step === 'success' && styles.successOverlay]}>
      {step === 'success' ? <View style={styles.successCard}>
        <View style={styles.successIcon}><Ionicons color={colors.buttonText} name="checkmark" size={33} /></View>
        <Text allowFontScaling={false} style={styles.successTitle}>Prediction placed</Text>
        <Text allowFontScaling={false} style={styles.successText}>Your {amount} USDC prediction was placed successfully.</Text>
        <View style={styles.successButton}><PrimaryButton label="Done" onPress={close} /></View>
      </View> : <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <View>
            <Text allowFontScaling={false} style={styles.eyebrow}>{step === 'amount' ? 'PLACE PREDICTION' : 'CONFIRM PREDICTION'}</Text>
            <Text allowFontScaling={false} style={styles.sheetTitle}>{step === 'amount' ? 'Enter amount' : 'Review order'}</Text>
          </View>
          <Pressable hitSlop={10} onPress={close}><Ionicons color={colors.textMuted} name="close" size={24} /></Pressable>
        </View>

        <View style={styles.marketCard}>
          <Text allowFontScaling={false} numberOfLines={2} style={styles.marketTitle}>{order?.marketTitle}</Text>
          <View style={styles.selectionRow}>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.selection}>{order?.outcomeLabel}</Text>
            {order?.tradeAction ? <Text allowFontScaling={false} style={[styles.tradeAction, order.tradeAction === 'Sell' && styles.sellAction]}>{order.tradeAction}</Text> : null}
            <Text allowFontScaling={false} style={styles.odds}>{order?.odds}</Text>
          </View>
        </View>

        {step === 'amount' ? <>
          <View style={styles.amountHeading}><Text allowFontScaling={false} style={styles.label}>Amount</Text><Text allowFontScaling={false} style={styles.available}>Available 1,000.00 USDC</Text></View>
          <View style={styles.amountField}>
            <Text allowFontScaling={false} style={styles.currency}>USDC</Text>
            <TextInput autoFocus keyboardType="decimal-pad" onChangeText={(value) => setAmount(cleanAmount(value))} placeholder="0.00" placeholderTextColor={colors.textFaint} selectionColor={colors.accent} style={styles.input} value={amount} />
            <Pressable onPress={() => setAmount('1000')}><Text allowFontScaling={false} style={styles.max}>MAX</Text></Pressable>
          </View>
          <View style={styles.quickAmounts}>{['10', '25', '50', '100'].map((value) => <Pressable key={value} onPress={() => setAmount(value)} style={styles.quickAmount}><Text allowFontScaling={false} style={styles.quickAmountText}>{value}</Text></Pressable>)}</View>
          <View style={styles.estimate}><Text allowFontScaling={false} style={styles.summaryLabel}>Potential win</Text><Text allowFontScaling={false} style={styles.estimateValue}>{estimatedReturn?.toFixed(2) ?? '0.00'} USDC</Text></View>
          <PrimaryButton disabled={!Number.isFinite(amountValue) || amountValue <= 0 || amountValue > 1000} label="Continue" onPress={() => setStep('confirm')} />
        </> : <>
          <View style={styles.summary}>
            <View style={styles.summaryRow}><Text allowFontScaling={false} style={styles.summaryLabel}>Prediction amount</Text><Text allowFontScaling={false} style={styles.summaryValue}>{amount} USDC</Text></View>
            <View style={styles.summaryRow}><Text allowFontScaling={false} style={styles.summaryLabel}>Odds</Text><Text allowFontScaling={false} style={styles.summaryValue}>{order?.odds}</Text></View>
            <View style={styles.summaryRow}><Text allowFontScaling={false} style={styles.summaryLabel}>Potential win</Text><Text allowFontScaling={false} style={styles.returnValue}>{estimatedReturn?.toFixed(2) ?? '0.00'} USDC</Text></View>
          </View>
          <Text allowFontScaling={false} style={styles.disclaimer}>Predictions cannot be changed after confirmation.</Text>
          <View style={styles.confirmActions}>
            <Pressable onPress={() => setStep('amount')} style={styles.backButton}><Text allowFontScaling={false} style={styles.backText}>Back</Text></Pressable>
            <View style={styles.confirmButton}><PrimaryButton label="Confirm" onPress={() => setStep('success')} /></View>
          </View>
        </>}
      </View>}
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.76)', padding: 12 },
  successOverlay: { justifyContent: 'center' },
  sheet: { borderRadius: 22, backgroundColor: '#191B1E', paddingHorizontal: 18, paddingTop: 9, paddingBottom: 20 },
  handle: { width: 48, height: 4, borderRadius: 2, backgroundColor: '#4A4D53', alignSelf: 'center', marginBottom: 17 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '600', marginTop: 4 },
  marketCard: { borderRadius: 13, backgroundColor: colors.surface, padding: 13, marginTop: 16, marginBottom: 18 },
  marketTitle: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  selectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  selection: { flex: 1, color: colors.textMuted, fontSize: 12 },
  tradeAction: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  sellAction: { color: '#FF466B' },
  odds: { color: colors.text, fontSize: 12, fontWeight: '600' },
  amountHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { color: colors.text, fontSize: 12, fontWeight: '600' },
  available: { color: colors.textMuted, fontSize: 10 },
  amountField: { minHeight: 55, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  currency: { color: colors.textMuted, fontSize: 12 },
  input: { flex: 1, color: colors.text, fontSize: 22, fontWeight: '600', textAlign: 'right', paddingVertical: 10 },
  max: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  quickAmounts: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  quickAmount: { flex: 1, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center' },
  quickAmountText: { color: colors.textMuted, fontSize: 12 },
  estimate: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 17 },
  estimateValue: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  summary: { gap: 14, borderRadius: 13, backgroundColor: colors.background, padding: 14, marginBottom: 13 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  summaryLabel: { color: colors.textMuted, fontSize: 12 },
  summaryValue: { color: colors.text, fontSize: 12, fontWeight: '600' },
  returnValue: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  disclaimer: { color: colors.textFaint, fontSize: 10, lineHeight: 15, marginBottom: 16 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  backButton: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  backText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  confirmButton: { flex: 2 },
  successCard: { alignSelf: 'center', width: '88%', borderRadius: 22, backgroundColor: '#1B1D20', padding: 25, alignItems: 'center' },
  successIcon: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: colors.text, fontSize: 20, fontWeight: '600', marginTop: 18 },
  successText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  successButton: { alignSelf: 'stretch', marginTop: 22 },
});
