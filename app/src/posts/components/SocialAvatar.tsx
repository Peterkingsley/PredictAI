import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const tones = ['#343B43', '#29394A', '#46352F', '#393249', '#29403D'];
export function SocialAvatar({ initials, size = 36 }: { initials: string; size?: number }) {
  const tone = tones[[...initials].reduce((sum, character) => sum + character.charCodeAt(0), 0) % tones.length]!;
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: tone }]}><Text allowFontScaling={false} style={[styles.text, { fontSize: size * .3 }]}>{initials}</Text></View>;
}
const styles = StyleSheet.create({ avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#41444A' }, text: { color: colors.text, fontWeight: '700' } });
