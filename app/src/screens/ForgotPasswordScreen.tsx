import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthHeader } from '../components/AuthHeader';
import { AuthShell } from '../components/AuthShell';
import { AuthTextField } from '../components/AuthTextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';

export function ForgotPasswordScreen({ initialEmail, onBack, onSignUp }: { initialEmail: string; onBack: () => void; onSignUp: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState('');
  const sendResetLink = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMessage('Enter a valid email address.'); return; }
    // Connect to the backend password-reset endpoint when it is available.
    setMessage('If an account exists for this email, reset instructions will be sent.');
  };
  return <AuthShell><AuthHeader action="Sign Up" onAction={onSignUp} onBack={onBack} /><Text allowFontScaling={false} style={styles.title}>Forgot password?</Text><Text allowFontScaling={false} style={styles.description}>Enter your email and we'll send instructions to reset your password.</Text><View style={styles.form}><AuthTextField autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} onSubmitEditing={sendResetLink} placeholder="Email address" value={email} />{message ? <Text allowFontScaling={false} style={styles.message}>{message}</Text> : null}<PrimaryButton label="Send reset link" onPress={sendResetLink} /></View></AuthShell>;
}

const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 27, fontWeight: '700', marginTop: 50 }, description: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 10, maxWidth: 300 }, form: { gap: 12, marginTop: 30 }, message: { color: colors.textMuted, fontSize: 12, lineHeight: 17 } });
