import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { removeProfilePhoto, selectProfilePhoto, useProfilePhoto } from '../services/profilePhoto';
import { colors } from '../theme/colors';

export function ProfilePhotoAvatar({ editable = false, initials, size = 72 }: { editable?: boolean; initials: string; size?: number }) {
  const photo = useProfilePhoto();
  const [busy, setBusy] = useState(false);

  const choose = async () => {
    setBusy(true);
    const result = await selectProfilePhoto();
    setBusy(false);
    if (result === 'denied') Alert.alert('Photo permission needed', 'Allow PredictAI to access your photos, then try again.');
    if (result === 'error') Alert.alert('Photo not changed', 'PredictAI could not save that photo. Please try another image.');
  };

  const openOptions = () => Alert.alert('Profile photo', 'Choose how your profile should appear.', [
    { text: 'Choose from library', onPress: () => void choose() },
    ...(photo.uri ? [{ text: 'Remove current photo', style: 'destructive' as const, onPress: () => void removeProfilePhoto() }] : []),
    { text: 'Cancel', style: 'cancel' },
  ]);

  const content = <>
    {photo.uri ? <Image key={photo.revision} source={{ uri: photo.uri }} style={[styles.image, { borderRadius: size / 2 }]} /> : <Text allowFontScaling={false} style={[styles.initials, { fontSize: size * 0.28 }]}>{initials}</Text>}
    {busy ? <View style={styles.busy}><ActivityIndicator color={colors.text} size="small" /></View> : null}
    {editable && !busy ? <View style={styles.camera}><Ionicons color={colors.buttonText} name="camera" size={13} /></View> : null}
  </>;

  const dimensions = { width: size, height: size, borderRadius: size / 2 };
  if (!editable) return <View style={[styles.avatar, dimensions]}>{content}</View>;
  return <Pressable accessibilityLabel="Change profile photo" disabled={busy} onPress={openOptions} style={({ pressed }) => [styles.avatar, dimensions, pressed && styles.pressed]}>{content}</Pressable>;
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.button, borderWidth: 1, borderColor: '#41444A', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  image: { width: '100%', height: '100%' },
  initials: { color: colors.buttonText, fontWeight: '800' },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  busy: { ...StyleSheet.absoluteFill, borderRadius: 999, backgroundColor: 'rgba(0,0,0,.58)', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
