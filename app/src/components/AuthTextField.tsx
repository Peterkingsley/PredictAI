import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
type Props = { autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; keyboardType?: 'default' | 'email-address' | 'phone-pad'; onChangeText: (value: string) => void; onSubmitEditing?: () => void; placeholder: string; secureTextEntry?: boolean; value: string };
export function AuthTextField({ value, onChangeText, secureTextEntry, ...props }: Props) {
  return <View style={styles.field}><TextInput {...props} allowFontScaling={false} autoCorrect={false} placeholderTextColor={colors.textFaint} secureTextEntry={secureTextEntry} style={styles.input} value={value} onChangeText={onChangeText} />
    {value.length > 0 ? <Pressable accessibilityLabel="Clear field" hitSlop={10} onPress={() => onChangeText('')}><Ionicons color={colors.textFaint} name="close-circle" size={17} /></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({ field: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' }, input: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 12 } });
