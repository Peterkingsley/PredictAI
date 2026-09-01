import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ProfilePhotoAvatar } from "../components/ProfilePhotoAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";

type Panel =
  | "edit"
  | "google"
  | "sessions"
  | "limit"
  | "help"
  | "support"
  | "terms"
  | "privacy"
  | "rules"
  | "signout"
  | "delete"
  | null;
type Currency = "USD" | "NGN" | "USDC";
type Theme = "Dark" | "System";

const information: Record<
  Exclude<Panel, "edit" | "google" | "sessions" | "limit" | "signout" | "delete" | null>,
  { title: string; body: string }
> = {
  help: {
    title: "Help center",
    body: "Find answers about predictions, deposits, withdrawals, event resolution and account access. For urgent account issues, contact support.",
  },
  support: {
    title: "Contact support",
    body: "Support requests can include your account ID and app diagnostics. In-app support messaging will connect here when the support service is configured.",
  },
  terms: {
    title: "Terms of use",
    body: "By using PredictAI, you agree to follow applicable eligibility requirements, event rules, payment terms and responsible-use policies.",
  },
  privacy: {
    title: "Privacy policy",
    body: "PredictAI uses account, device and transaction information to provide and protect the service. Privacy controls and data requests remain available from your account.",
  },
  rules: {
    title: "Prediction rules",
    body: "Each market resolves from the source listed in its event rules. Predictions cannot be changed after confirmation, and settlement follows the published resolution result.",
  },
};

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text allowFontScaling={false} style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function MenuRow({ danger, description, icon, label, onPress, value }: {
  danger?: boolean;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  value?: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <View style={styles.iconSlot}>
        <Ionicons color={danger ? colors.danger : "#D7D8DA"} name={icon} size={20} />
      </View>
      <View style={styles.menuCopy}>
        <Text allowFontScaling={false} style={[styles.menuLabel, danger && styles.dangerText]}>{label}</Text>
        {description ? <Text allowFontScaling={false} numberOfLines={2} style={styles.menuDescription}>{description}</Text> : null}
      </View>
      {value ? <Text allowFontScaling={false} numberOfLines={1} style={styles.menuValue}>{value}</Text> : null}
      <Ionicons color={colors.navInactive} name="chevron-forward" size={18} />
    </Pressable>
  );
}

function ToggleRow({ description, icon, label, onChange, value }: {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.iconSlot}><Ionicons color="#D7D8DA" name={icon} size={20} /></View>
      <View style={styles.menuCopy}>
        <Text allowFontScaling={false} style={styles.menuLabel}>{label}</Text>
        <Text allowFontScaling={false} style={styles.menuDescription}>{description}</Text>
      </View>
      <Switch
        ios_backgroundColor="#35383E"
        onValueChange={onChange}
        thumbColor={value ? colors.primary : "#A5A7AC"}
        trackColor={{ false: "#35383E", true: colors.background }}
        value={value}
      />
    </View>
  );
}

function Choices<T extends string>({ label, onChange, options, value }: {
  label: string;
  onChange: (value: T) => void;
  options: readonly T[];
  value: T;
}) {
  return (
    <View style={styles.choiceBlock}>
      <Text allowFontScaling={false} style={styles.choiceLabel}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => (
          <Pressable accessibilityRole="button" key={option} onPress={() => onChange(option)} style={[styles.choice, value === option && styles.choiceSelected]}>
            <Text allowFontScaling={false} style={[styles.choiceText, value === option && styles.choiceTextSelected]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ProfileScreen({ email: initialEmail, onBack, onOpenPublicProfile, onSignOut }: {
  email: string;
  onBack: () => void;
  onOpenPublicProfile: () => void;
  onSignOut: () => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState("Peter Kingsley");
  const email = initialEmail || "peterkingslayer098@gmail.com";
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [language, setLanguage] = useState("English");
  const [biometrics, setBiometrics] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<Theme>("Dark");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [responsibleLimit, setResponsibleLimit] = useState("500");
  const [referralCopied, setReferralCopied] = useState(false);
  const initials = useMemo(() => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "P", [name]);
  const info = panel && panel in information ? information[panel as keyof typeof information] : null;
  const copyReferral = () => {
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 1600);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" hitSlop={10} onPress={onBack} style={styles.backButton}>
          <Ionicons color={colors.text} name="arrow-back" size={24} />
        </Pressable>
        <Text allowFontScaling={false} style={styles.headerTitle}>Account</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <ProfilePhotoAvatar editable initials={initials} size={70} />
          <View style={styles.profileCopy}>
            <Text allowFontScaling={false} style={styles.name}>{name}</Text>
            <Text allowFontScaling={false} numberOfLines={1} style={styles.email}>{email}</Text>
            <Text allowFontScaling={false} style={styles.username}>@peterk</Text>
          </View>
          <Pressable onPress={() => setPanel("edit")} style={styles.editButton}>
            <Text allowFontScaling={false} style={styles.editText}>Edit</Text>
          </Pressable>
        </View>

        <Section title="Profile">
          <MenuRow description="Control your Posts, performance and visibility" icon="person-circle-outline" label="Public profile" onPress={onOpenPublicProfile} />
        </Section>

        <Section title="Security">
          <MenuRow description={email} icon="logo-google" label="Google account" onPress={() => setPanel("google")} />
          <ToggleRow description="Use your device biometrics to unlock PredictAI" icon="finger-print-outline" label="Biometric unlock" onChange={setBiometrics} value={biometrics} />
          <MenuRow description="1 active session" icon="phone-portrait-outline" label="Active devices" onPress={() => setPanel("sessions")} />
        </Section>

        <Section title="Preferences">
          <ToggleRow description="Event, market and security updates" icon="notifications-outline" label="Notifications" onChange={setNotifications} value={notifications} />
          <Choices label="Theme" onChange={setTheme} options={["Dark", "System"] as const} value={theme} />
          <MenuRow icon="language-outline" label="Language" onPress={() => setLanguage((current) => (current === "English" ? "French" : "English"))} value={language} />
          <Choices label="Currency" onChange={setCurrency} options={["USD", "NGN", "USDC"] as const} value={currency} />
          <MenuRow description="Maximum you can use for predictions per day" icon="speedometer-outline" label="Daily prediction limit" onPress={() => setPanel("limit")} value={`${responsibleLimit || "0"} USDC`} />
        </Section>

        <Section title="Support">
          <MenuRow icon="help-circle-outline" label="Help center" onPress={() => setPanel("help")} />
          <MenuRow icon="chatbubble-ellipses-outline" label="Contact support" onPress={() => setPanel("support")} />
        </Section>

        <Section title="Legal">
          <MenuRow icon="document-text-outline" label="Terms of use" onPress={() => setPanel("terms")} />
          <MenuRow icon="lock-closed-outline" label="Privacy policy" onPress={() => setPanel("privacy")} />
          <MenuRow icon="book-outline" label="Prediction rules" onPress={() => setPanel("rules")} />
        </Section>

        <Section title="Account">
          <Pressable accessibilityRole="button" onPress={copyReferral} style={({ pressed }) => [styles.referral, pressed && styles.pressed]}>
            <View style={styles.referralCopy}>
              <Text allowFontScaling={false} style={styles.menuLabel}>Referral code</Text>
              <Text allowFontScaling={false} style={styles.referralCode}>PRED-PETER</Text>
            </View>
            <View style={styles.copyCode}>
              <Ionicons color={colors.text} name={referralCopied ? "checkmark" : "copy-outline"} size={17} />
              <Text allowFontScaling={false} style={styles.copyText}>{referralCopied ? "Copied" : "Copy"}</Text>
            </View>
          </Pressable>
          <MenuRow icon="log-out-outline" label="Sign out" onPress={() => setPanel("signout")} />
          <MenuRow danger description="Delete your PredictAI account" icon="trash-outline" label="Delete account" onPress={() => setPanel("delete")} />
        </Section>
      </ScrollView>

      {referralCopied ? (
        <View pointerEvents="none" style={styles.toast}>
          <Ionicons color={colors.positive} name="checkmark-circle" size={18} />
          <Text allowFontScaling={false} style={styles.toastText}>Referral code copied</Text>
        </View>
      ) : null}

      <Modal animationType="slide" onRequestClose={() => setPanel(null)} transparent visible={panel !== null}>
        <Pressable onPress={() => setPanel(null)} style={styles.overlay}>
          <Pressable onPress={() => undefined} style={styles.sheet}>
            <View style={styles.handle} />
            {panel === "edit" ? (
              <>
                <Text allowFontScaling={false} style={styles.sheetTitle}>Edit profile</Text>
                <Text style={styles.fieldLabel}>Display name</Text>
                <TextInput onChangeText={setName} placeholderTextColor={colors.textFaint} selectionColor={colors.primary} style={styles.field} value={name} />
                <Text style={styles.fieldLabel}>Google account</Text>
                <View style={styles.readOnlyField}>
                  <Text allowFontScaling={false} numberOfLines={1} style={styles.readOnlyText}>{email}</Text>
                  <Ionicons color={colors.navInactive} name="lock-closed-outline" size={16} />
                </View>
                <Text style={styles.fieldHint}>Email is managed through your Google account.</Text>
                <Text style={styles.fieldLabel}>Phone number</Text>
                <TextInput keyboardType="phone-pad" onChangeText={setPhone} placeholder="Add phone number" placeholderTextColor={colors.textFaint} selectionColor={colors.primary} style={styles.field} value={phone} />
                <Text style={styles.fieldLabel}>Country</Text>
                <TextInput onChangeText={setCountry} selectionColor={colors.primary} style={styles.field} value={country} />
                <View style={styles.sheetAction}><PrimaryButton label="Save profile" onPress={() => setPanel(null)} /></View>
              </>
            ) : null}

            {panel === "google" ? (
              <>
                <Text allowFontScaling={false} style={styles.sheetTitle}>Google account</Text>
                <View style={styles.accountIdentity}>
                  <View style={styles.googleMark}><Ionicons color={colors.text} name="logo-google" size={22} /></View>
                  <View style={styles.menuCopy}>
                    <Text style={styles.accountName}>{name}</Text>
                    <Text numberOfLines={1} style={styles.accountEmail}>{email}</Text>
                  </View>
                </View>
                <Text allowFontScaling={false} style={styles.sheetText}>PredictAI uses Google for sign-in. Password and sign-in security changes are managed by Google.</Text>
                <View style={styles.sheetAction}><PrimaryButton label="Done" onPress={() => setPanel(null)} /></View>
              </>
            ) : null}

            {panel === "limit" ? (
              <>
                <Text allowFontScaling={false} style={styles.sheetTitle}>Daily prediction limit</Text>
                <View style={styles.limitField}>
                  <TextInput autoFocus keyboardType="decimal-pad" onChangeText={(value) => setResponsibleLimit(value.replace(/[^0-9.]/g, ""))} placeholder="0" placeholderTextColor={colors.textFaint} selectionColor={colors.primary} style={styles.limitInput} value={responsibleLimit} />
                  <Text allowFontScaling={false} style={styles.limitCurrency}>USDC</Text>
                </View>
                <Text style={styles.fieldHint}>Maximum you can use for predictions per day.</Text>
                <View style={styles.sheetAction}><PrimaryButton label="Save limit" onPress={() => setPanel(null)} /></View>
              </>
            ) : null}

            {panel === "sessions" ? (
              <>
                <Text allowFontScaling={false} style={styles.sheetTitle}>Active devices</Text>
                <View style={styles.session}>
                  <View style={styles.sessionIcon}><Ionicons color={colors.text} name="phone-portrait-outline" size={21} /></View>
                  <View>
                    <Text allowFontScaling={false} style={styles.sessionTitle}>Current Android device</Text>
                    <Text allowFontScaling={false} style={styles.sessionDetail}>Active now · Lagos, Nigeria</Text>
                  </View>
                </View>
                <View style={styles.sheetAction}><PrimaryButton label="Done" onPress={() => setPanel(null)} /></View>
              </>
            ) : null}

            {info ? (
              <>
                <Text allowFontScaling={false} style={styles.sheetTitle}>{info.title}</Text>
                <Text allowFontScaling={false} style={styles.sheetText}>{info.body}</Text>
                <View style={styles.sheetAction}><PrimaryButton label="Done" onPress={() => setPanel(null)} /></View>
              </>
            ) : null}

            {panel === "signout" || panel === "delete" ? (
              <>
                <View style={[styles.confirmIcon, panel === "delete" && styles.deleteIcon]}>
                  <Ionicons color={panel === "delete" ? colors.danger : colors.text} name={panel === "delete" ? "trash-outline" : "log-out-outline"} size={29} />
                </View>
                <Text allowFontScaling={false} style={styles.confirmTitle}>{panel === "delete" ? "Delete account?" : "Sign out?"}</Text>
                <Text allowFontScaling={false} style={styles.confirmText}>{panel === "delete" ? "This will begin permanent deletion of your PredictAI account and public profile." : "You can sign back in at any time with your Google account."}</Text>
                <View style={styles.confirmActions}>
                  <Pressable onPress={() => setPanel(null)} style={styles.cancel}><Text allowFontScaling={false} style={styles.cancelText}>Cancel</Text></Pressable>
                  {panel === "delete" ? (
                    <Pressable onPress={onSignOut} style={styles.deleteButton}><Text allowFontScaling={false} style={styles.deleteButtonText}>Delete account</Text></Pressable>
                  ) : (
                    <View style={styles.confirmButton}><PrimaryButton label="Sign out" onPress={onSignOut} /></View>
                  )}
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { height: 58, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  backButton: { width: 32, height: 40, justifyContent: "center" },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
  headerSpacer: { width: 32 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  profileHeader: { minHeight: 112, paddingVertical: 18, flexDirection: "row", alignItems: "center", gap: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  profileCopy: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 20, fontWeight: "700" },
  email: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  username: { color: colors.textFaint, fontSize: 12, marginTop: 3 },
  editButton: { minWidth: 54, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  editText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  section: { marginTop: 24 },
  sectionTitle: { color: colors.textFaint, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" },
  sectionBody: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: "#151719", paddingHorizontal: 16, overflow: "hidden" },
  menuRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconSlot: { width: 26, alignItems: "flex-start", justifyContent: "center" },
  menuCopy: { flex: 1, minWidth: 0 },
  menuLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  menuDescription: { color: colors.textFaint, fontSize: 12, lineHeight: 16, marginTop: 3 },
  menuValue: { maxWidth: 112, color: colors.textMuted, fontSize: 12, textAlign: "right" },
  dangerText: { color: colors.danger },
  pressed: { opacity: 0.62 },
  toggleRow: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  choiceBlock: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  choiceLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  choices: { minHeight: 42, flexDirection: "row", marginTop: 10, padding: 3, borderRadius: 10, backgroundColor: colors.background },
  choice: { flex: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  choiceSelected: { backgroundColor: "#25272C", borderWidth: 1, borderColor: "#3A3D42" },
  choiceText: { color: colors.textFaint, fontSize: 12, fontWeight: "500" },
  choiceTextSelected: { color: colors.text, fontWeight: "700" },
  referral: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border },
  referralCopy: { flex: 1 },
  referralCode: { color: colors.text, fontSize: 13, fontWeight: "700", letterSpacing: 1, marginTop: 4 },
  copyCode: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8 },
  copyText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  toast: { position: "absolute", bottom: 22, alignSelf: "center", minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: "#202326", paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  toastText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,.76)" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: "#191B1E", padding: 18, paddingTop: 9 },
  handle: { width: 46, height: 4, borderRadius: 2, backgroundColor: "#4A4D53", alignSelf: "center", marginBottom: 18 },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: 16 },
  sheetText: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 12, marginBottom: 7 },
  fieldHint: { color: colors.textFaint, fontSize: 11, lineHeight: 16, marginTop: 7 },
  field: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 13, paddingHorizontal: 13 },
  readOnlyField: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  readOnlyText: { flex: 1, color: colors.textMuted, fontSize: 13 },
  sheetAction: { marginTop: 22 },
  limitField: { minHeight: 52, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 13, flexDirection: "row", alignItems: "center" },
  limitInput: { flex: 1, color: colors.text, fontSize: 18, fontWeight: "600" },
  limitCurrency: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  accountIdentity: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 13, marginBottom: 14 },
  googleMark: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#25272C", alignItems: "center", justifyContent: "center" },
  accountName: { color: colors.text, fontSize: 13, fontWeight: "600" },
  accountEmail: { color: colors.textFaint, fontSize: 11, marginTop: 3 },
  session: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: 13 },
  sessionIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#25272C", alignItems: "center", justifyContent: "center" },
  sessionTitle: { color: colors.text, fontSize: 13, fontWeight: "600" },
  sessionDetail: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  confirmIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#25272C", alignSelf: "center", alignItems: "center", justifyContent: "center" },
  deleteIcon: { backgroundColor: "#301B20" },
  confirmTitle: { color: colors.text, fontSize: 20, fontWeight: "700", textAlign: "center", marginTop: 16 },
  confirmText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 7 },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 22 },
  cancel: { flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  cancelText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  confirmButton: { flex: 2 },
  deleteButton: { flex: 2, minHeight: 46, borderRadius: 12, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center" },
  deleteButtonText: { color: colors.text, fontSize: 13, fontWeight: "700" },
});
