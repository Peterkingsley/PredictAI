import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {children}{footer ? <View style={styles.footer}>{footer}</View> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }, footer: { marginTop: 'auto', paddingTop: 46, paddingBottom: 28 } });
