import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthHeader } from '../components/AuthHeader';
import { AuthShell } from '../components/AuthShell';
import { AuthTextField } from '../components/AuthTextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { login } from '../services/auth';
import { colors } from '../theme/colors';

type Props = { email: string; onAuthenticated: () => void; onBack: () => void; onForgotPassword: () => void; onSignUp: () => void };

export function PasswordScreen({ email, onAuthenticated, onBack, onForgotPassword, onSignUp }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    try { setLoading(true); setError(''); await login({ email, password }); onAuthenticated(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to log in.'); }
    finally { setLoading(false); }
  };
  return <AuthShell><AuthHeader action="" onAction={() => undefined} onBack={onBack} /><Text allowFontScaling={false} style={styles.title}>Enter your password</Text><Text allowFontScaling={false} style={styles.email}>{email}</Text><View style={styles.form}><AuthTextField onChangeText={setPassword} onSubmitEditing={submit} placeholder="Password" secureTextEntry value={password} /><Pressable hitSlop={10} onPress={onForgotPassword} style={styles.forgotButton}><Text allowFontScaling={false} style={styles.link}>Forgot password?</Text></Pressable>{error ? <Text allowFontScaling={false} style={styles.error}>{error}</Text> : null}<PrimaryButton label="Log in" loading={loading} onPress={submit} /></View><Pressable onPress={onSignUp} style={styles.signupRow}><Text allowFontScaling={false} style={styles.signupText}>I don't have an account  <Text style={styles.link}>Sign Up</Text></Text></Pressable></AuthShell>;
}

const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 27, fontWeight: '700', marginTop: 50 }, email: { color: colors.textMuted, fontSize: 14, marginTop: 8 }, form: { gap: 10, marginTop: 29 }, forgotButton: { alignSelf: 'flex-end', paddingVertical: 3 }, link: { color: colors.accent, fontSize: 13 }, error: { color: colors.danger, fontSize: 12 }, signupRow: { marginTop: 'auto', alignItems: 'center', paddingVertical: 28 }, signupText: { color: colors.textMuted, fontSize: 13 } });
