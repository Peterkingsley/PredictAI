import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
import { PrimaryButton } from './PrimaryButton';

const thresholds = [5, 10, 15] as const;

function SettingRow({ description, enabled, label, onChange }: { description: string; enabled: boolean; label: string; onChange: (enabled: boolean) => void }) {
  return <View style={styles.settingRow}>
    <View style={styles.settingCopy}>
      <Text allowFontScaling={false} style={styles.settingLabel}>{label}</Text>
      <Text allowFontScaling={false} style={styles.settingDescription}>{description}</Text>
    </View>
    <Switch ios_backgroundColor="#35383E" onValueChange={onChange} thumbColor={enabled ? colors.buttonText : '#A5A7AC'} trackColor={{ false: '#35383E', true: colors.accent }} value={enabled} />
  </View>;
}

export function EventAlertsModal({ marketTitle, onClose, visible }: { marketTitle: string; onClose: () => void; visible: boolean }) {
  const [movementAlert, setMovementAlert] = useState(true);
  const [threshold, setThreshold] = useState<(typeof thresholds)[number]>(5);
  const [closingReminder, setClosingReminder] = useState(true);
  const [resolutionAlert, setResolutionAlert] = useState(true);
  const [targetAlert, setTargetAlert] = useState(false);
  const [targetProbability, setTargetProbability] = useState('75');

  const updateTarget = (value: string) => {
    const numeric = value.replace(/[^0-9]/g, '').slice(0, 3);
    setTargetProbability(numeric && Number(numeric) > 100 ? '100' : numeric);
  };

  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
    <Pressable onPress={onClose} style={styles.overlay}>
      <Pressable onPress={() => undefined} style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text allowFontScaling={false} style={styles.title}>Event alerts</Text>
            <Text allowFontScaling={false} numberOfLines={2} style={styles.marketTitle}>{marketTitle}</Text>
          </View>
          <Pressable hitSlop={10} onPress={onClose}><Ionicons color={colors.textMuted} name="close" size={24} /></Pressable>
        </View>

        <SettingRow description="Get notified when the probability changes significantly." enabled={movementAlert} label="Probability movement" onChange={setMovementAlert} />
        {movementAlert ? <View style={styles.thresholds}>
          <Text allowFontScaling={false} style={styles.fieldLabel}>Notify after a change of</Text>
          <View style={styles.thresholdRow}>{thresholds.map((value) => <Pressable key={value} onPress={() => setThreshold(value)} style={[styles.threshold, threshold === value && styles.thresholdSelected]}><Text allowFontScaling={false} style={[styles.thresholdText, threshold === value && styles.thresholdTextSelected]}>{value}%</Text></Pressable>)}</View>
        </View> : null}

        <SettingRow description="Receive a reminder before predictions close." enabled={closingReminder} label="Event closing" onChange={setClosingReminder} />
        <SettingRow description="Know when the final outcome is confirmed." enabled={resolutionAlert} label="Event resolved" onChange={setResolutionAlert} />
        <SettingRow description="Notify when an outcome reaches your target." enabled={targetAlert} label="Target probability" onChange={setTargetAlert} />
        {targetAlert ? <View style={styles.targetField}>
          <Text allowFontScaling={false} style={styles.fieldLabel}>Target probability</Text>
          <View style={styles.inputRow}><TextInput keyboardType="number-pad" maxLength={3} onChangeText={updateTarget} selectionColor={colors.accent} style={styles.input} value={targetProbability} /><Text allowFontScaling={false} style={styles.percent}>%</Text></View>
        </View> : null}

        <View style={styles.save}><PrimaryButton label="Save alerts" onPress={onClose} /></View>
      </Pressable>
    </Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.76)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#191B1E', paddingHorizontal: 18, paddingTop: 9, paddingBottom: 24 },
  handle: { width: 48, height: 4, borderRadius: 2, backgroundColor: '#4A4D53', alignSelf: 'center', marginBottom: 17 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 },
  headerCopy: { flex: 1, paddingRight: 16 },
  title: { color: colors.text, fontSize: 19, fontWeight: '600' },
  marketTitle: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  settingRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.border },
  settingCopy: { flex: 1 },
  settingLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  settingDescription: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  thresholds: { borderRadius: 11, backgroundColor: colors.background, padding: 12, marginBottom: 8 },
  fieldLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 9 },
  thresholdRow: { flexDirection: 'row', gap: 8 },
  threshold: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center' },
  thresholdSelected: { backgroundColor: '#304019', borderWidth: 1, borderColor: colors.accent },
  thresholdText: { color: colors.textMuted, fontSize: 12 },
  thresholdTextSelected: { color: colors.accent, fontWeight: '600' },
  targetField: { borderRadius: 11, backgroundColor: colors.background, padding: 12, marginBottom: 8 },
  inputRow: { minHeight: 42, borderRadius: 9, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600', paddingVertical: 7 },
  percent: { color: colors.textMuted, fontSize: 15 },
  save: { marginTop: 13 },
});
