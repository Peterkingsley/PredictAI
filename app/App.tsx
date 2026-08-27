import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet } from 'react-native';
import { BiometricScreen } from './src/screens/BiometricScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PasswordScreen } from './src/screens/PasswordScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { MainAppScreen } from './src/screens/MainAppScreen';
import { colors } from './src/theme/colors';
import type { AuthRoute } from './src/types/auth';

export default function App() {
  const [route, setRoute] = useState<AuthRoute>('login');
  const [email, setEmail] = useState('');
  return <SafeAreaView style={styles.app}>
    <StatusBar style="light" />
    {route === 'login' && <LoginScreen initialEmail={email} onBack={() => undefined} onNext={(value) => { setEmail(value); setRoute('password'); }} onSignUp={() => setRoute('signup')} />}
    {route === 'signup' && <SignUpScreen onBack={() => setRoute('login')} onLogin={() => setRoute('login')} onSubmit={(value) => { setEmail(value); setRoute('password'); }} />}
    {route === 'password' && <PasswordScreen email={email} onBack={() => setRoute('login')} onForgotPassword={() => setRoute('forgot-password')} onSignUp={() => setRoute('signup')} onAuthenticated={() => setRoute('app')} />}
    {route === 'forgot-password' && <ForgotPasswordScreen initialEmail={email} onBack={() => setRoute('password')} onSignUp={() => setRoute('signup')} />}
    {route === 'biometric' && <BiometricScreen email={email} onUsePassword={() => setRoute('password')} />}
    {route === 'app' && <MainAppScreen />}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ app: { flex: 1, paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0, backgroundColor: colors.background } });
