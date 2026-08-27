import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
export function EmptyState() { return <View style={styles.root}><View style={styles.folder}><Ionicons color={colors.textMuted} name="folder-open" size={83} /></View><Text style={styles.text}>No Data</Text></View>; }
const styles = StyleSheet.create({ root: { alignItems: 'center', justifyContent: 'center', flex: 1, transform: [{ scale: 0.72 }] }, folder: { width: 98, height: 82, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1D24', borderRadius: 14 }, text: { color: colors.textMuted, fontSize: 14, marginTop: 14 } });
