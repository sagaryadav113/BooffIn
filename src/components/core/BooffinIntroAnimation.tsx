import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors, radii, spacing, typography } from '../../theme';

interface BooffinIntroAnimationProps {
  size?: number;
  showTagline?: boolean;
}

export const BooffinIntroAnimation: React.FC<BooffinIntroAnimationProps> = ({
  size = 110,
  showTagline = true,
}) => {
  // Shared values for continuous loops
  const pulse = useSharedValue(0);
  const glow = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    // 1. Smooth harmonic breathing scale loop (1.8s period)
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );

    // 2. Radiant green aura glow pulse (2.2s period)
    glow.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // 3. Gentle vertical levitation (2.4s period)
    float.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [pulse, glow, float]);

  // Animated style for the main logo container
  const logoAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [0.96, 1.04]);
    const translateY = interpolate(float.value, [0, 1], [3, -3]);
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  // Animated style for the inner radiant green aura
  const innerAuraStyle = useAnimatedStyle(() => {
    const scale = interpolate(glow.value, [0, 1], [0.92, 1.22]);
    const opacity = interpolate(glow.value, [0, 1], [0.25, 0.65]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Animated style for the outer radiant green aura
  const outerAuraStyle = useAnimatedStyle(() => {
    const scale = interpolate(glow.value, [0, 1], [1.1, 1.45]);
    const opacity = interpolate(glow.value, [0, 1], [0.12, 0.35]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Animated style for subtle pulse dots
  const dot1Style = useAnimatedStyle(() => {
    const opacity = interpolate(pulse.value, [0, 0.5, 1], [0.3, 1, 0.3]);
    const scale = interpolate(pulse.value, [0, 0.5, 1], [0.8, 1.2, 0.8]);
    return { opacity, transform: [{ scale }] };
  });

  const dot2Style = useAnimatedStyle(() => {
    const opacity = interpolate(glow.value, [0, 0.5, 1], [0.3, 1, 0.3]);
    const scale = interpolate(glow.value, [0, 0.5, 1], [0.8, 1.2, 0.8]);
    return { opacity, transform: [{ scale }] };
  });

  const dot3Style = useAnimatedStyle(() => {
    const opacity = interpolate(float.value, [0, 0.5, 1], [0.3, 1, 0.3]);
    const scale = interpolate(float.value, [0, 0.5, 1], [0.8, 1.2, 0.8]);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <View style={styles.container}>
      <View style={[styles.logoWrapper, { width: size * 1.8, height: size * 1.8 }]}>
        {/* Outer green glow aura */}
        <Animated.View
          style={[
            styles.auraCircle,
            {
              width: size * 1.55,
              height: size * 1.55,
              backgroundColor: 'rgba(5, 150, 105, 0.22)',
            },
            outerAuraStyle,
          ]}
        />

        {/* Inner intense dark green aura */}
        <Animated.View
          style={[
            styles.auraCircle,
            {
              width: size * 1.25,
              height: size * 1.25,
              backgroundColor: 'rgba(6, 78, 59, 0.35)',
            },
            innerAuraStyle,
          ]}
        />

        {/* Animated Brand "B" Logo */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            source={require('../../../assets/images/booffin-symbol.png')}
            style={{ width: size, height: size * 1.05 }}
            contentFit="contain"
            priority="high"
          />
        </Animated.View>
      </View>

      {/* Brand Title & Tagline with smooth entrance */}
      {showTagline && (
        <View style={styles.textContainer}>
          <Text style={styles.brandTitle}>BooffIn</Text>
          <Text style={styles.tagline}>Research finds its people.</Text>

          {/* Elegant pulsing status dots */}
          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, dot1Style]} />
            <Animated.View style={[styles.dot, dot2Style]} />
            <Animated.View style={[styles.dot, dot3Style]} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  auraCircle: {
    position: 'absolute',
    borderRadius: radii.full,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  brandTitle: {
    ...typography.pageTitle,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  tagline: {
    ...typography.captionMedium,
    fontSize: 14.5,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#064E3B',
  },
});
