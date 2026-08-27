import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export function AppLaunchOverlay() {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(280),
      Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { opacity }]}>
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        <View style={styles.logoBadge}>
          <Feather name="share-2" size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.name}>DropLink</Text>
        <Text style={styles.tagline}>Fast & Private File Transfer</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080D1A',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  name: {
    marginTop: 20,
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  tagline: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});