import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return <><Stack.Screen options={{ title: 'Not found' }} /><View style={styles.container}><Text style={styles.title}>This page does not exist.</Text><Link href="/" style={styles.link}>Go to Local Share</Link></View></>;
}
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, title: { fontSize: 18, fontWeight: '700' }, link: { marginTop: 14, color: '#2563eb', fontWeight: '700' } });