import { Image, StyleSheet, Text, View } from 'react-native';
import { useProfilePhoto } from '../../services/profilePhoto';
import { getCurrentUser } from '../../services/social';
import { colors } from '../../theme/colors';

const tones = ['#343B43', '#29394A', '#46352F', '#393249', '#29403D'];
export function SocialAvatar({ initials, isCurrentUser = false, size = 36 }: { initials: string; isCurrentUser?: boolean; size?: number }) {
  const photo = useProfilePhoto();
  const tone = tones[[...initials].reduce((sum, character) => sum + character.charCodeAt(0), 0) % tones.length]!;
  const showProfilePhoto = isCurrentUser || initials === getCurrentUser().initials;
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: tone }]}>{showProfilePhoto && photo.uri ? <Image key={photo.revision} source={{ uri: photo.uri }} style={[styles.image, { borderRadius: size / 2 }]} /> : <Text allowFontScaling={false} style={[styles.text, { fontSize: size * .3 }]}>{initials}</Text>}</View>;
}
const styles = StyleSheet.create({ avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#41444A', overflow: 'hidden' }, image: { width: '100%', height: '100%' }, text: { color: colors.text, fontWeight: '700' } });
