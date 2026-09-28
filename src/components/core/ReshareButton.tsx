import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '../../theme';

export interface ReshareButtonProps {
  isReposted: boolean;
  repostsCount: number;
  onPress: () => void;
  size?: number;
  showCount?: boolean;
  style?: ViewStyle;
}

export const ReshareButton: React.FC<ReshareButtonProps> = ({
  isReposted,
  repostsCount,
  onPress,
  size = 20,
  showCount = true,
  style,
}) => {
  // Animation shared values
  const flightScale = useSharedValue(1);
  const flightTranslateX = useSharedValue(0);
  const flightTranslateY = useSharedValue(0);
  const flightRotate = useSharedValue(0);
  const ringRotation = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(isReposted ? 1 : 0.7);
  const sparksScale = useSharedValue(isReposted ? 1 : 0);
  const sparksOpacity = useSharedValue(isReposted ? 1 : 0);
  const countScale = useSharedValue(1);

  useEffect(() => {
    if (isReposted) {
      ringOpacity.value = withTiming(1, { duration: 250 });
      sparksScale.value = withSpring(1, { damping: 12 });
      sparksOpacity.value = withTiming(1, { duration: 200 });
    } else {
      ringOpacity.value = withTiming(0.7, { duration: 200 });
      sparksScale.value = withTiming(0, { duration: 150 });
      sparksOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [isReposted]);

  const triggerFlightAnimation = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // 1. Plane Take-off & Glide sequence
    flightScale.value = withSequence(
      withTiming(1.3, { duration: 150, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 10, stiffness: 180 })
    );

    flightTranslateX.value = withSequence(
      withTiming(3.5, { duration: 160, easing: Easing.out(Easing.cubic) }),
      withSpring(0, { damping: 12, stiffness: 160 })
    );

    flightTranslateY.value = withSequence(
      withTiming(-3.5, { duration: 160, easing: Easing.out(Easing.cubic) }),
      withSpring(0, { damping: 12, stiffness: 160 })
    );

    flightRotate.value = withSequence(
      withTiming(-10, { duration: 140 }),
      withSpring(0, { damping: 12, stiffness: 150 })
    );

    // 2. Orbital Ring Spin & Expansion
    ringRotation.value = withSequence(
      withTiming(ringRotation.value + 360, {
        duration: 480,
        easing: Easing.out(Easing.cubic),
      })
    );

    ringScale.value = withSequence(
      withTiming(1.3, { duration: 180, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 12, stiffness: 150 })
    );

    // 3. Sparks Burst
    sparksScale.value = withSequence(
      withTiming(1.4, { duration: 160 }),
      withSpring(1, { damping: 10 })
    );
    sparksOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(isReposted ? 0 : 1, { duration: 300 })
    );

    // 4. Count bump
    countScale.value = withSequence(
      withTiming(1.2, { duration: 120 }),
      withSpring(1, { damping: 12 })
    );

    onPress();
  };

  const planeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: flightTranslateX.value },
      { translateY: flightTranslateY.value },
      { scale: flightScale.value },
      { rotate: `${flightRotate.value}deg` },
    ],
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${ringRotation.value}deg` },
      { scale: ringScale.value },
    ],
    opacity: ringOpacity.value,
  }));

  const sparksAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparksScale.value }],
    opacity: sparksOpacity.value,
  }));

  const countAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
  }));

  // Dynamic Theme Colors
  const activeColor = colors.accentGreen || '#10B981';
  const inactiveColor = colors.textSecondary || '#64748B';
  const discFill = isReposted ? 'rgba(16, 185, 129, 0.18)' : 'rgba(100, 116, 139, 0.12)';
  const discStroke = isReposted ? activeColor : 'rgba(100, 116, 139, 0.3)';
  const planeFillTop = isReposted ? '#10B981' : '#475569';
  const planeFillBottom = isReposted ? '#059669' : '#334155';
  const planeFold = isReposted ? '#34D399' : '#64748B';
  const ringStroke = isReposted ? activeColor : inactiveColor;
  const sparkColor = isReposted ? activeColor : '#0EA5E9';

  const iconBoxSize = size + 4;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={isReposted ? 'Undo re-share' : 'Re-share post'}
      hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
      onPress={triggerFlightAnimation}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <View style={{ width: iconBoxSize, height: iconBoxSize, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        {/* Layer 1: Central Planetary Circle Disc */}
        <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28" style={StyleSheet.absoluteFill}>
          <Circle
            cx="14"
            cy="14"
            r="8.5"
            fill={discFill}
            stroke={discStroke}
            strokeWidth="1.2"
          />
        </Svg>

        {/* Layer 2: Orbital Ring with 360 Spin & Pulsing Expansion */}
        <Animated.View style={[StyleSheet.absoluteFill, ringAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Path
              d="M 3.5 17 C 3.2 22 9.5 24.5 16 22.5 C 22 20.5 25.5 15.5 24.5 11"
              stroke={ringStroke}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="4 2"
              fill="none"
            />
          </Svg>
        </Animated.View>

        {/* Layer 3: Top-Right Launch Sparks */}
        <Animated.View style={[StyleSheet.absoluteFill, sparksAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Path
              d="M 23 2.5 L 24.5 1 M 26 5 L 27.8 3.8 M 20 1.5 L 20.8 0.2"
              stroke={sparkColor}
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>

        {/* Layer 4: Origami Paper Airplane with Physical Flight Translation & Angle */}
        <Animated.View style={[StyleSheet.absoluteFill, planeAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            {/* Left Top Wing */}
            <Path
              d="M 23.5 4.5 L 4.5 15.5 L 12.5 12.5 Z"
              fill={planeFillTop}
            />
            {/* Right Bottom Wing */}
            <Path
              d="M 23.5 4.5 L 12.5 12.5 L 15.5 23.5 Z"
              fill={planeFillBottom}
            />
            {/* Center Fold / Under-crease */}
            <Path
              d="M 12.5 12.5 L 15.5 23.5 L 14 16 Z"
              fill={planeFold}
            />
            {/* Center Ridge Crease */}
            <Path
              d="M 23.5 4.5 L 12.5 12.5"
              stroke="#FFFFFF"
              strokeWidth="0.75"
              strokeLinecap="round"
              opacity={0.8}
            />
          </Svg>
        </Animated.View>
      </View>

      {showCount && (
        <Animated.View style={countAnimatedStyle}>
          <Text
            style={[
              styles.actionCount,
              isReposted && { color: activeColor, fontWeight: '700' },
            ]}
          >
            {repostsCount}
          </Text>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  actionCount: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
});
