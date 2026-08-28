import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export function AppLaunchOverlay() {
  const opacity  = useRef(new Animated.Value(1)).current;
  const scale    = useRef(new Animated.Value(0.88)).current;
  const ring1    = useRef(new Animated.Value(0)).current;
  const ring2    = useRef(new Animated.Value(0)).current;
  const ring3    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Concentric rings pulse outward
    const makeRing = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const r1 = makeRing(ring1, 0);
    const r2 = makeRing(ring2, 400);
    const r3 = makeRing(ring3, 800);
    r1.start(); r2.start(); r3.start();

    // Fade in content, then fade out overlay
    Animated.sequence([
      Animated.timing(scale, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => { r1.stop(); r2.stop(); r3.stop(); });
  }, [opacity, scale, ring1, ring2, ring3]);

  const makeRingStyle = (val: Animated.Value, size: number) => ({
    width:     size,
    height:    size,
    borderRadius: size / 2,
    position:  'absolute' as const,
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.5)',
    opacity:   val.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 0.3, 0] }),
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { opacity }]}>
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        {/* Pulse rings */}
        <View style={styles.ringContainer}>
          <Animated.View style={makeRingStyle(ring1, 120)} />
          <Animated.View style={makeRingStyle(ring2, 120)} />
          <Animated.View style={makeRingStyle(ring3, 120)} />
          {/* Central badge */}
          <View style={styles.logoBadge}>
            <Text style={styles.logoSymbol}>⌁</Text>
          </View>
        </View>

        <Text style={styles.name}>DropLink</Text>
        <Text style={styles.tagline}>Private · Fast · Everywhere</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#05080F',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
  },
  ringContainer: {
    width:          100,
    height:         100,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   24,
  },
  logoBadge: {
    width:           76,
    height:          76,
    borderRadius:    22,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#1D4ED8',
    shadowColor:     '#3B82F6',
    shadowOpacity:   0.6,
    shadowOffset:    { width: 0, height: 8 },
    shadowRadius:    20,
    elevation:       12,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.2)',
  },
  logoSymbol: {
    fontSize:   38,
    color:      '#F1F5F9',
    lineHeight: 42,
  },
  name: {
    color:         '#F1F5F9',
    fontSize:      32,
    fontWeight:    '900',
    letterSpacing: -0.8,
  },
  tagline: {
    marginTop:  6,
    color:      '#64748B',
    fontSize:   13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
