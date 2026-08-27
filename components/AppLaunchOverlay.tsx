import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export function AppLaunchOverlay() {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.delay(260),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return <Animated.View pointerEvents="none" style={[styles.overlay, { opacity }]}>
    <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
      <View style={styles.mark}><Text style={styles.markText}>↗</Text></View>
      <Text style={styles.name}>DropLink</Text>
      <Text style={styles.tagline}>Private sharing, made simple</Text>
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', zIndex: 10 },
  content: { alignItems: 'center' },
  mark: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#2563eb' },
  markText: { color: '#fff', fontSize: 41, fontWeight: '700' },
  name: { marginTop: 18, color: '#fff', fontSize: 28, fontWeight: '800' },
  tagline: { marginTop: 7, color: '#93c5fd', fontSize: 13 },
});