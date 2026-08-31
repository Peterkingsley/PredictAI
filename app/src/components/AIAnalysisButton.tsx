import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function AIAnalysisButton({ onPress }: { onPress: () => void }) {
  const glow = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      glow.setValue(0);
      wave.setValue(0);
      return;
    }
    const glowAnimation = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const waveAnimation = Animated.loop(Animated.timing(wave, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }));
    glowAnimation.start();
    waveAnimation.start();
    return () => { glowAnimation.stop(); waveAnimation.stop(); };
  }, [glow, reduceMotion, wave]);

  const openAnalysis = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onPress();
  };

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [.16, .5] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [.99, 1.035] });
  const waveTranslate = wave.interpolate({ inputRange: [0, 1], outputRange: [-210, 430] });
  const waveOpacity = wave.interpolate({ inputRange: [0, .18, .82, 1], outputRange: [0, .5, .26, 0] });
  const secondWaveOpacity = wave.interpolate({ inputRange: [0, .35, .78, 1], outputRange: [0, 0, .34, 0] });
  const iconScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return <View style={styles.container}>
    <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
    <Pressable accessibilityHint="Opens a detailed intelligence report" accessibilityLabel="Ask PredictAI to research this market" accessibilityRole="button" onPress={openAnalysis} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Animated.View pointerEvents="none" style={[styles.wave, { opacity: waveOpacity, transform: [{ translateX: waveTranslate }, { rotate: '-10deg' }, { scaleY: 1.12 }] }]} />
      <Animated.View pointerEvents="none" style={[styles.wave, styles.secondWave, { opacity: secondWaveOpacity, transform: [{ translateX: waveTranslate }, { rotate: '12deg' }, { scaleY: .82 }] }]} />
      <View style={styles.content}><Animated.View style={[styles.icon, { transform: [{ scale: iconScale }] }]}><Ionicons color={colors.accent} name="search-circle-outline" size={18} /></Animated.View><View style={styles.copy}><Text allowFontScaling={false} style={styles.label}>Ask PredictAI</Text><Text allowFontScaling={false} style={styles.sublabel}>Research this market</Text></View><View style={styles.arrow}><Ionicons color="#17200E" name="arrow-forward" size={13} /></View></View>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  container: { position: 'relative', marginVertical: 2 },
  glow: { position: 'absolute', top: -3, right: -3, bottom: -3, left: -3, borderRadius: 13, backgroundColor: colors.accent },
  button: { minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: '#55752A', backgroundColor: '#192312', overflow: 'hidden' },
  wave: { position: 'absolute', left: -180, top: -20, width: 190, height: 86, borderRadius: 48, backgroundColor: 'rgba(155,225,22,.25)' },
  secondWave: { left: -260, top: -14, width: 150, height: 74, backgroundColor: 'rgba(255,255,255,.16)' },
  content: { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  icon: { width: 29, height: 29, borderRadius: 9, backgroundColor: '#2C3D18', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  label: { color: '#D8FF91', fontSize: 11, fontWeight: '800', letterSpacing: .1 },
  sublabel: { color: '#8EA36B', fontSize: 8, marginTop: 2 },
  arrow: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: .72, transform: [{ scale: .985 }] },
});
