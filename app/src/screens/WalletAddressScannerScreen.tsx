import { Ionicons } from "@expo/vector-icons";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import { parseWalletQr, type ScannedWalletAddress } from "../utils/walletAddress";

export function WalletAddressScannerScreen({
  onBack,
  onManual,
  onUseAddress,
}: {
  onBack: () => void;
  onManual: () => void;
  onUseAddress: (result: ScannedWalletAddress) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [candidate, setCandidate] = useState<ScannedWalletAddress | null>(null);
  const [error, setError] = useState("");
  const [torch, setTorch] = useState(false);

  const scanned = ({ data }: BarcodeScanningResult) => {
    const result = parseWalletQr(data);
    if (!result) {
      setError("This QR code does not contain a supported EVM wallet address.");
      return;
    }
    setError("");
    setCandidate(result);
  };

  if (!permission)
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onBack}>
            <Ionicons color={colors.text} name="chevron-back" size={25} />
          </Pressable>
          <Text allowFontScaling={false} style={styles.headerTitle}>
            Scan wallet address
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.permission}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text allowFontScaling={false} style={styles.permissionText}>
            Checking camera permission…
          </Text>
        </View>
      </View>
    );

  if (!permission.granted)
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={onBack}>
            <Ionicons color={colors.text} name="chevron-back" size={25} />
          </Pressable>
          <Text allowFontScaling={false} style={styles.headerTitle}>
            Scan wallet address
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.permission}>
          <View style={styles.permissionIcon}>
            <Ionicons color={colors.accent} name="camera-outline" size={34} />
          </View>
          <Text allowFontScaling={false} style={styles.permissionTitle}>
            Camera access required
          </Text>
          <Text allowFontScaling={false} style={styles.permissionText}>
            PredictAI needs camera access only while you scan a wallet QR code.
          </Text>
          <Pressable
            onPress={() =>
              permission.canAskAgain ? void requestPermission() : void Linking.openSettings()
            }
            style={styles.permissionButton}
          >
            <Text allowFontScaling={false} style={styles.permissionButtonText}>
              {permission.canAskAgain ? "Allow camera access" : "Open device settings"}
            </Text>
          </Pressable>
          <Pressable onPress={onManual} style={styles.manual}>
            <Text allowFontScaling={false} style={styles.manualText}>
              Enter address manually
            </Text>
          </Pressable>
        </View>
      </View>
    );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Ionicons color={colors.text} name="chevron-back" size={25} />
        </Pressable>
        <Text allowFontScaling={false} style={styles.headerTitle}>
          Scan wallet address
        </Text>
        <Pressable
          accessibilityLabel={torch ? "Turn flashlight off" : "Turn flashlight on"}
          hitSlop={10}
          onPress={() => setTorch((current) => !current)}
        >
          <Ionicons
            color={torch ? colors.accent : colors.text}
            name={torch ? "flashlight" : "flashlight-outline"}
            size={22}
          />
        </Pressable>
      </View>
      <View style={styles.cameraArea}>
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          enableTorch={torch}
          facing="back"
          onBarcodeScanned={candidate || error ? undefined : scanned}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.cameraShade}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <View style={styles.scanLine} />
          </View>
        </View>
      </View>
      <View style={styles.footer}>
        {!candidate && !error ? (
          <>
            <Text allowFontScaling={false} style={styles.instruction}>
              Place the wallet QR code inside the frame
            </Text>
            <Text allowFontScaling={false} style={styles.description}>
              Only supported EVM addresses can be used for USDC or USDT withdrawals.
            </Text>
            <Pressable onPress={onManual} style={styles.manual}>
              <Text allowFontScaling={false} style={styles.manualText}>
                Enter address manually
              </Text>
            </Pressable>
          </>
        ) : null}
        {error ? (
          <View style={styles.result}>
            <View style={styles.resultHeading}>
              <Ionicons color={colors.danger} name="alert-circle-outline" size={22} />
              <Text allowFontScaling={false} style={styles.errorTitle}>
                Unsupported QR code
              </Text>
            </View>
            <Text allowFontScaling={false} style={styles.errorText}>
              {error}
            </Text>
            <Pressable onPress={() => setError("")} style={styles.scanAgain}>
              <Text allowFontScaling={false} style={styles.scanAgainText}>
                Scan another code
              </Text>
            </Pressable>
          </View>
        ) : null}
        {candidate ? (
          <View style={styles.result}>
            <View style={styles.resultHeading}>
              <Ionicons color={colors.accent} name="checkmark-circle-outline" size={23} />
              <Text allowFontScaling={false} style={styles.resultTitle}>
                Wallet address detected
              </Text>
            </View>
            <Text allowFontScaling={false} numberOfLines={2} style={styles.address}>
              {candidate.address}
            </Text>
            <View style={styles.networkRow}>
              <Text allowFontScaling={false} style={styles.networkLabel}>
                Network
              </Text>
              <Text allowFontScaling={false} style={styles.networkValue}>
                {candidate.network ?? "Select during withdrawal"}
              </Text>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => setCandidate(null)} style={styles.secondaryButton}>
                <Text allowFontScaling={false} style={styles.secondaryText}>
                  Scan again
                </Text>
              </Pressable>
              <Pressable onPress={() => onUseAddress(candidate)} style={styles.primaryButton}>
                <Text allowFontScaling={false} style={styles.primaryText}>
                  Use address
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
  headerSpacer: { width: 25 },
  permission: { flex: 1, paddingHorizontal: 32, alignItems: "center", justifyContent: "center" },
  permissionIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#25272C",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: { color: colors.text, fontSize: 18, fontWeight: "700", marginTop: 20 },
  permissionText: {
    maxWidth: 290,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },
  permissionButton: {
    minWidth: 190,
    minHeight: 44,
    borderRadius: 11,
    backgroundColor: colors.button,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  permissionButtonText: { color: colors.buttonText, fontSize: 12, fontWeight: "700" },
  cameraArea: { flex: 1, overflow: "hidden" },
  cameraShade: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: { width: 238, height: 238, position: "relative", backgroundColor: "rgba(0,0,0,.08)" },
  corner: { position: "absolute", width: 34, height: 34, borderColor: colors.accent },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: "absolute",
    left: 12,
    right: 12,
    top: "50%",
    height: 1,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 7,
  },
  footer: { minHeight: 210, padding: 18, backgroundColor: "#141618" },
  instruction: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
  },
  description: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 7,
  },
  manual: { alignSelf: "center", paddingHorizontal: 15, paddingVertical: 10, marginTop: 13 },
  manualText: { color: colors.accent, fontSize: 11, fontWeight: "600" },
  result: { borderRadius: 14, backgroundColor: "#1C1E21", padding: 14 },
  resultHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultTitle: { color: colors.text, fontSize: 13, fontWeight: "700" },
  errorTitle: { color: colors.danger, fontSize: 13, fontWeight: "700" },
  errorText: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 8 },
  address: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  networkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  networkLabel: { color: colors.textMuted, fontSize: 10 },
  networkValue: { color: colors.text, fontSize: 10, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 9, marginTop: 13 },
  secondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: colors.text, fontSize: 11, fontWeight: "600" },
  primaryButton: {
    flex: 1.4,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: colors.buttonText, fontSize: 11, fontWeight: "700" },
  scanAgain: {
    alignSelf: "flex-start",
    marginTop: 14,
    borderRadius: 9,
    backgroundColor: "#25272C",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  scanAgainText: { color: colors.accent, fontSize: 10, fontWeight: "700" },
});
