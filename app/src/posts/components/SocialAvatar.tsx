import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const tones = ['#304019', '#28384B', '#493329', '#3A3150', '#21433D'];
export function SocialAvatar({ initials, size = 36 }: { initials: string; size?: number }) {
  const tone = tones[[...initials].reduce((sum, character) => sum + character.charCodeAt(0), 0) % tones.length]!;
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: tone }]}><Text allowFontScaling={false} style={[styles.text, { fontSize: size * .3 }]}>{initials}</Text></View>;
}
const styles = StyleSheet.create({ avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }, text: { color: colors.text, fontWeight: '800' } });
