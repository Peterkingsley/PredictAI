import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ProfilePhotoAvatar } from '../components/ProfilePhotoAvatar';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../theme/colors';

type Panel = 'edit' | 'verification' | 'password' | 'sessions' | 'help' | 'support' | 'terms' | 'privacy' | 'rules' | 'signout' | 'delete' | null;
type Currency = 'USD' | 'NGN' | 'USDC';
type Theme = 'Dark' | 'System';

const information: Record<Exclude<Panel, 'edit' | 'verification' | 'password' | 'sessions' | 'signout' | 'delete' | null>, { title: string; body: string }> = {
  help: { title: 'Help center', body: 'Find answers about predictions, deposits, withdrawals, event resolution, and account access. For urgent account issues, use Contact support.' },
  support: { title: 'Contact support', body: 'Support requests will include your account ID and app diagnostics. A support messaging connection can be added when the backend support channel is configured.' },
  terms: { title: 'Terms of use', body: 'By using PredictAI, you agree to follow applicable eligibility requirements, event rules, payment terms, and responsible-use policies.' },
  privacy: { title: 'Privacy policy', body: 'PredictAI uses account, identity, device, and transaction information to provide and protect the service. Privacy controls and data requests are available from your account.' },
  rules: { title: 'Prediction rules', body: 'Each market resolves from the source listed in its event rules. Predictions cannot be changed after confirmation, and final settlement follows the published resolution result.' },
};

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return <View style={styles.section}><Text allowFontScaling={false} style={styles.sectionTitle}>{title}</Text><View style={styles.sectionBody}>{children}</View></View>;
}

function MenuRow({ detail, danger, icon, label, onPress }: { detail?: string; danger?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><View style={[styles.menuIcon, danger && styles.dangerIcon]}><Ionicons color={danger ? colors.danger : colors.text} name={icon} size={18} /></View><Text allowFontScaling={false} style={[styles.menuLabel, danger && styles.dangerText]}>{label}</Text>{detail ? <Text allowFontScaling={false} style={styles.menuDetail}>{detail}</Text> : null}<Ionicons color={colors.textMuted} name="chevron-forward" size={17} /></Pressable>;
}

function ToggleRow({ description, label, onChange, value }: { description: string; label: string; onChange: (value: boolean) => void; value: boolean }) {
  return <View style={styles.toggleRow}><View style={styles.toggleCopy}><Text allowFontScaling={false} style={styles.menuLabel}>{label}</Text><Text allowFontScaling={false} style={styles.toggleDescription}>{description}</Text></View><Switch ios_backgroundColor="#35383E" onValueChange={onChange} thumbColor={value ? colors.buttonText : '#A5A7AC'} trackColor={{ false: '#35383E', true: colors.accent }} value={value} /></View>;
}

function Choices<T extends string>({ label, onChange, options, value }: { label: string; onChange: (value: T) => void; options: readonly T[]; value: T }) {
  return <View style={styles.choiceBlock}><Text allowFontScaling={false} style={styles.menuLabel}>{label}</Text><View style={styles.choices}>{options.map((option) => <Pressable key={option} onPress={() => onChange(option)} style={[styles.choice, value === option && styles.choiceSelected]}><Text allowFontScaling={false} style={[styles.choiceText, value === option && styles.choiceTextSelected]}>{option}</Text></Pressable>)}</View></View>;
}

export function ProfileScreen({ email: initialEmail, onBack, onOpenPublicProfile, onSignOut }: { email: string; onBack: () => void; onOpenPublicProfile: () => void; onSignOut: () => void }) {
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState('Peter Kingsley');
  const [email, setEmail] = useState(initialEmail || 'peter@example.com');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Nigeria');
  const [language, setLanguage] = useState('English');
  const [verification, setVerification] = useState<'Not verified' | 'In review'>('Not verified');
  const [documentId, setDocumentId] = useState('');
  const [biometrics, setBiometrics] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<Theme>('Dark');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [responsibleLimit, setResponsibleLimit] = useState('500');
  const [referralCopied, setReferralCopied] = useState(false);
  const initials = useMemo(() => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'P', [name]);
  const info = panel && panel in information ? information[panel as keyof typeof information] : null;

  return <View style={styles.root}>
    <View style={styles.header}><Pressable hitSlop={10} onPress={onBack}><Ionicons color={colors.text} name="chevron-back" size={25} /></Pressable><Text allowFontScaling={false} style={styles.headerTitle}>Account & Profile</Text><View style={styles.headerSpacer} /></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}><ProfilePhotoAvatar editable initials={initials} size={54}/><View style={styles.profileCopy}><Text allowFontScaling={false} style={styles.name}>{name}</Text><Text allowFontScaling={false} style={styles.email}>{email}</Text><View style={[styles.status, verification === 'In review' && styles.statusReview]}><Text allowFontScaling={false} style={[styles.statusText, verification === 'In review' && styles.statusReviewText]}>{verification}</Text></View></View><Pressable onPress={() => setPanel('edit')} style={styles.editButton}><Text allowFontScaling={false} style={styles.editText}>Edit</Text></Pressable></View>

      <Pressable onPress={() => setPanel('verification')} style={({ pressed }) => [styles.verificationCard, pressed && styles.pressed]}><View style={styles.verificationIcon}><Ionicons color={colors.accent} name="shield-checkmark-outline" size={24} /></View><View style={styles.verificationCopy}><Text allowFontScaling={false} style={styles.verificationTitle}>Identity verification</Text><Text allowFontScaling={false} style={styles.verificationText}>{verification === 'Not verified' ? 'Verify your identity to unlock higher account limits.' : 'Your documents are being reviewed.'}</Text></View><Ionicons color={colors.textMuted} name="chevron-forward" size={18} /></Pressable>

      <Section title="Community">
        <MenuRow detail="Posts, performance & privacy" icon="people-outline" label="Public profile" onPress={onOpenPublicProfile} />
      </Section>

      <Section title="Account security">
        <MenuRow icon="key-outline" label="Change password or PIN" onPress={() => setPanel('password')} />
        <ToggleRow description="Use your device biometrics when signing in." label="Biometric login" onChange={setBiometrics} value={biometrics} />
        <ToggleRow description="Require an additional code during sign-in." label="Two-factor authentication" onChange={setTwoFactor} value={twoFactor} />
        <MenuRow detail="1 device" icon="phone-portrait-outline" label="Active devices" onPress={() => setPanel('sessions')} />
      </Section>

      <Section title="Preferences">
        <ToggleRow description="Receive event, transaction, and security updates." label="Notifications" onChange={setNotifications} value={notifications} />
        <Choices label="Theme" onChange={setTheme} options={['Dark', 'System'] as const} value={theme} />
        <MenuRow detail={language} icon="language-outline" label="Language" onPress={() => setLanguage((current) => current === 'English' ? 'French' : 'English')} />
        <Choices label="Default currency" onChange={setCurrency} options={['USD', 'NGN', 'USDC'] as const} value={currency} />
        <View style={styles.limitBlock}><Text allowFontScaling={false} style={styles.menuLabel}>Responsible prediction limit</Text><Text allowFontScaling={false} style={styles.toggleDescription}>Maximum prediction amount per day.</Text><View style={styles.limitField}><TextInput keyboardType="decimal-pad" onChangeText={(value) => setResponsibleLimit(value.replace(/[^0-9.]/g, ''))} selectionColor={colors.accent} style={styles.limitInput} value={responsibleLimit} /><Text allowFontScaling={false} style={styles.limitCurrency}>USDC</Text></View></View>
      </Section>

      <Section title="Support & legal">
        <MenuRow icon="help-circle-outline" label="Help center" onPress={() => setPanel('help')} />
        <MenuRow icon="chatbubble-ellipses-outline" label="Contact support" onPress={() => setPanel('support')} />
        <MenuRow icon="document-text-outline" label="Terms of use" onPress={() => setPanel('terms')} />
        <MenuRow icon="lock-closed-outline" label="Privacy policy" onPress={() => setPanel('privacy')} />
        <MenuRow icon="book-outline" label="Prediction rules" onPress={() => setPanel('rules')} />
      </Section>

      <Section title="Account actions">
        <Pressable onPress={() => { setReferralCopied(true); setTimeout(() => setReferralCopied(false), 1600); }} style={styles.referral}><View><Text allowFontScaling={false} style={styles.menuLabel}>Referral code</Text><Text allowFontScaling={false} style={styles.referralCode}>PRED-PETER</Text></View><View style={styles.copyCode}><Ionicons color={colors.accent} name={referralCopied ? 'checkmark' : 'copy-outline'} size={17} /><Text allowFontScaling={false} style={styles.copyText}>{referralCopied ? 'Copied' : 'Copy'}</Text></View></Pressable>
        <MenuRow icon="log-out-outline" label="Sign out" onPress={() => setPanel('signout')} />
        <MenuRow danger icon="trash-outline" label="Delete account" onPress={() => setPanel('delete')} />
      </Section>
    </ScrollView>

    <Modal animationType="slide" onRequestClose={() => setPanel(null)} transparent visible={panel !== null}>
      <Pressable onPress={() => setPanel(null)} style={styles.overlay}><Pressable onPress={() => undefined} style={styles.sheet}><View style={styles.handle} />
        {panel === 'edit' ? <><Text allowFontScaling={false} style={styles.sheetTitle}>Edit profile</Text><Text style={styles.fieldLabel}>Display name</Text><TextInput onChangeText={setName} placeholderTextColor={colors.textFaint} style={styles.field} value={name} /><Text style={styles.fieldLabel}>Email</Text><TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholderTextColor={colors.textFaint} style={styles.field} value={email} /><Text style={styles.fieldLabel}>Phone number</Text><TextInput keyboardType="phone-pad" onChangeText={setPhone} placeholder="Add phone number" placeholderTextColor={colors.textFaint} style={styles.field} value={phone} /><Text style={styles.fieldLabel}>Country</Text><TextInput onChangeText={setCountry} style={styles.field} value={country} /><View style={styles.sheetAction}><PrimaryButton label="Save profile" onPress={() => setPanel(null)} /></View></> : null}
        {panel === 'verification' ? <><Text allowFontScaling={false} style={styles.sheetTitle}>Identity verification</Text><Text allowFontScaling={false} style={styles.sheetText}>{verification === 'In review' ? 'Your verification is in review. We will notify you when a decision is available.' : 'Enter your government-issued document number to start verification.'}</Text>{verification === 'Not verified' ? <><Text style={styles.fieldLabel}>Document number</Text><TextInput autoCapitalize="characters" onChangeText={setDocumentId} placeholder="Enter document number" placeholderTextColor={colors.textFaint} style={styles.field} value={documentId} /><View style={styles.sheetAction}><PrimaryButton disabled={documentId.trim().length < 5} label="Submit for review" onPress={() => { setVerification('In review'); setPanel(null); }} /></View></> : <View style={styles.sheetAction}><PrimaryButton label="Done" onPress={() => setPanel(null)} /></View>}</> : null}
        {panel === 'password' ? <><Text allowFontScaling={false} style={styles.sheetTitle}>Change password or PIN</Text><Text style={styles.fieldLabel}>Current password</Text><TextInput placeholder="Current password" placeholderTextColor={colors.textFaint} secureTextEntry style={styles.field} /><Text style={styles.fieldLabel}>New password</Text><TextInput placeholder="At least 8 characters" placeholderTextColor={colors.textFaint} secureTextEntry style={styles.field} /><View style={styles.sheetAction}><PrimaryButton label="Update password" onPress={() => setPanel(null)} /></View></> : null}
        {panel === 'sessions' ? <><Text allowFontScaling={false} style={styles.sheetTitle}>Active devices</Text><View style={styles.session}><View style={styles.sessionIcon}><Ionicons color={colors.text} name="phone-portrait-outline" size={21} /></View><View><Text allowFontScaling={false} style={styles.sessionTitle}>Current Android device</Text><Text allowFontScaling={false} style={styles.sessionDetail}>Active now · Lagos, Nigeria</Text></View></View><View style={styles.sheetAction}><PrimaryButton label="Done" onPress={() => setPanel(null)} /></View></> : null}
        {info ? <><Text allowFontScaling={false} style={styles.sheetTitle}>{info.title}</Text><Text allowFontScaling={false} style={styles.sheetText}>{info.body}</Text><View style={styles.sheetAction}><PrimaryButton label="Done" onPress={() => setPanel(null)} /></View></> : null}
        {panel === 'signout' || panel === 'delete' ? <><View style={[styles.confirmIcon, panel === 'delete' && styles.deleteIcon]}><Ionicons color={panel === 'delete' ? colors.danger : colors.accent} name={panel === 'delete' ? 'trash-outline' : 'log-out-outline'} size={30} /></View><Text allowFontScaling={false} style={styles.confirmTitle}>{panel === 'delete' ? 'Delete account?' : 'Sign out?'}</Text><Text allowFontScaling={false} style={styles.confirmText}>{panel === 'delete' ? 'This prototype will sign you out. Permanent deletion must be completed by the account backend after identity confirmation.' : 'You will need your credentials to sign in again.'}</Text><View style={styles.confirmActions}><Pressable onPress={() => setPanel(null)} style={styles.cancel}><Text allowFontScaling={false} style={styles.cancelText}>Cancel</Text></Pressable><View style={styles.confirmButton}><PrimaryButton label={panel === 'delete' ? 'Continue' : 'Sign out'} onPress={onSignOut} /></View></View></> : null}
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
  profileCard: { borderRadius: 16, backgroundColor: '#181A1D', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.button, borderBottomWidth: 6, borderBottomColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.buttonText, fontSize: 17, fontWeight: '800' },
  profileCopy: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  email: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  status: { alignSelf: 'flex-start', backgroundColor: '#3B2228', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3, marginTop: 7 },
  statusText: { color: '#FF738E', fontSize: 9, fontWeight: '600' },
  statusReview: { backgroundColor: '#3B331C' },
  statusReviewText: { color: '#FFD05A' },
  editButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.surface },
  editText: { color: colors.text, fontSize: 11, fontWeight: '600' },
  verificationCard: { borderRadius: 14, backgroundColor: '#1C2217', borderWidth: 1, borderColor: '#304019', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  verificationIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: '#304019', alignItems: 'center', justifyContent: 'center' },
  verificationCopy: { flex: 1 },
  verificationTitle: { color: colors.text, fontSize: 13, fontWeight: '600' },
  verificationText: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  section: { borderRadius: 15, overflow: 'hidden', backgroundColor: '#181A1D' },
  sectionTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: .8, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 7, textTransform: 'uppercase' },
  sectionBody: { paddingHorizontal: 14 },
  menuRow: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dangerIcon: { backgroundColor: '#301B20' },
  menuLabel: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '500' },
  menuDetail: { color: colors.textMuted, fontSize: 10 },
  dangerText: { color: colors.danger },
  pressed: { opacity: .65 },
  toggleRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  toggleCopy: { flex: 1 },
  toggleDescription: { color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  choiceBlock: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  choices: { flexDirection: 'row', gap: 7, marginTop: 9 },
  choice: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center' },
  choiceSelected: { backgroundColor: '#304019', borderWidth: 1, borderColor: colors.accent },
  choiceText: { color: colors.textMuted, fontSize: 10 },
  choiceTextSelected: { color: colors.accent, fontWeight: '600' },
  limitBlock: { paddingVertical: 12 },
  limitField: { height: 42, borderRadius: 9, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', marginTop: 9 },
  limitInput: { flex: 1, color: colors.text, fontSize: 14 },
  limitCurrency: { color: colors.textMuted, fontSize: 10 },
  referral: { minHeight: 61, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  referralCode: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 5 },
  copyCode: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8 },
  copyText: { color: colors.accent, fontSize: 10, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.76)' },
  sheet: { maxHeight: '86%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#191B1E', padding: 18, paddingTop: 9 },
  handle: { width: 48, height: 4, borderRadius: 2, backgroundColor: '#4A4D53', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '600', marginBottom: 16 },
  sheetText: { color: colors.textMuted, fontSize: 12, lineHeight: 19 },
  fieldLabel: { color: colors.textMuted, fontSize: 10, marginTop: 11, marginBottom: 6 },
  field: { minHeight: 45, borderRadius: 10, backgroundColor: colors.surface, color: colors.text, fontSize: 12, paddingHorizontal: 12 },
  sheetAction: { marginTop: 20 },
  session: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 11, backgroundColor: colors.surface, padding: 13 },
  sessionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#303238', alignItems: 'center', justifyContent: 'center' },
  sessionTitle: { color: colors.text, fontSize: 12, fontWeight: '600' },
  sessionDetail: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  confirmIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#263019', alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  deleteIcon: { backgroundColor: '#301B20' },
  confirmTitle: { color: colors.text, fontSize: 19, fontWeight: '600', textAlign: 'center', marginTop: 16 },
  confirmText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 7 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancel: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  confirmButton: { flex: 2 },
});
