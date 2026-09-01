import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import type { GestureResponderEvent } from "react-native";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "../theme/colors";

export function AIAnalysisButton({ onPress }: { onPress: () => void }) {
  const wave = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      wave.setValue(0);
      return;
    }
    const waveAnimation = Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: 2800,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    waveAnimation.start();
    return () => waveAnimation.stop();
  }, [reduceMotion, wave]);

  const openAnalysis = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPress();
  };

  const waveTranslate = wave.interpolate({ inputRange: [0, 1], outputRange: [-210, 430] });
  const waveOpacity = wave.interpolate({
    inputRange: [0, 0.18, 0.82, 1],
    outputRange: [0, 0.5, 0.26, 0],
  });
  const secondWaveOpacity = wave.interpolate({
    inputRange: [0, 0.35, 0.78, 1],
    outputRange: [0, 0, 0.34, 0],
  });

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityHint="Opens a detailed intelligence report"
        accessibilityLabel="Ask PredictAI to research this market"
        accessibilityRole="button"
        onPress={openAnalysis}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wave,
            {
              opacity: waveOpacity,
              transform: [{ translateX: waveTranslate }, { rotate: "-10deg" }, { scaleY: 1.12 }],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wave,
            styles.secondWave,
            {
              opacity: secondWaveOpacity,
              transform: [{ translateX: waveTranslate }, { rotate: "12deg" }, { scaleY: 0.82 }],
            },
          ]}
        />
        <View style={styles.content}>
          <View style={styles.icon}>
            <Ionicons color={colors.primary} name="search-circle-outline" size={18} />
          </View>
          <View style={styles.copy}>
            <Text allowFontScaling={false} style={styles.label}>
              Ask PredictAI
            </Text>
            <Text allowFontScaling={false} style={styles.sublabel}>
              Research this market
            </Text>
          </View>
          <View style={styles.arrow}>
            <Ionicons color={colors.buttonText} name="arrow-forward" size={13} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", marginVertical: 2 },
  button: {
    minHeight: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#55752A",
    backgroundColor: "#192312",
    overflow: "hidden",
  },
  wave: {
    position: "absolute",
    left: -180,
    top: -20,
    width: 190,
    height: 86,
    borderRadius: 48,
    backgroundColor: "rgba(155,225,22,.25)",
  },
  secondWave: {
    left: -260,
    top: -14,
    width: 150,
    height: 74,
    backgroundColor: "rgba(255,255,255,.16)",
  },
  content: {
    minHeight: 44,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  icon: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: "#2C3D18",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1 },
  label: { color: "#D8FF91", fontSize: 11, fontWeight: "800", letterSpacing: 0.1 },
  sublabel: { color: "#8EA36B", fontSize: 8, marginTop: 2 },
  arrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
