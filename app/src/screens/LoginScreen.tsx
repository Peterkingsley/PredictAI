import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthHeader } from '../components/AuthHeader'; import { AuthShell } from '../components/AuthShell'; import { AuthTabs } from '../components/AuthTabs'; import { AuthTextField } from '../components/AuthTextField'; import { PrimaryButton } from '../components/PrimaryButton'; import { SocialAuth } from '../components/SocialAuth'; import { colors } from '../theme/colors'; import type { AuthMethod } from '../types/auth';
type Props = { initialEmail: string; onBack: () => void; onNext: (email: string) => void; onSignUp: () => void };
export function LoginScreen({ initialEmail, onBack, onNext, onSignUp }: Props) {
  const [method, setMethod] = useState<AuthMethod>('email'); const [value, setValue] = useState(initialEmail); const [error, setError] = useState(''); const isEmail = method === 'email';
  const valid = useMemo(() => isEmail ? /^\S+@\S+\.\S+$/.test(value.trim()) : value.trim().length >= 7, [isEmail, value]);
  const next = () => { if (!valid) { setError(isEmail ? 'Enter a valid email address.' : 'Enter a valid account value.'); return; } setError(''); onNext(value.trim()); };
  return <AuthShell footer={<SocialAuth />}><AuthHeader action="Sign Up" onAction={onSignUp} onBack={onBack} /><Text style={styles.title}>Welcome</Text><AuthTabs active={method} onChange={(nextMethod) => { setMethod(nextMethod); setValue(''); setError(''); }} tabs={[{ key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone number' }]} /><View style={styles.form}><AuthTextField autoCapitalize="none" keyboardType={isEmail ? 'email-address' : 'phone-pad'} onChangeText={setValue} onSubmitEditing={next} placeholder={isEmail ? 'Email address' : 'Phone number'} value={value} />{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton label="Next" onPress={next} /></View></AuthShell>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 29, lineHeight: 35, fontWeight: '700', marginTop: 49, marginBottom: 37 }, form: { gap: 10, marginTop: 25 }, error: { color: colors.danger, fontSize: 12, marginHorizontal: 3 } });
