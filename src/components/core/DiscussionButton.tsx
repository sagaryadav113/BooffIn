import React from 'react';
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

export interface DiscussionButtonProps {
  commentsCount: number;
  onPress: () => void;
  size?: number;
  showCount?: boolean;
  style?: ViewStyle;
}

export const DiscussionButton: React.FC<DiscussionButtonProps> = ({
  commentsCount,
  onPress,
  size = 20,
  showCount = true,
  style,
}) => {
  // Shared animation values
  const frontScale = useSharedValue(1);
  const frontTranslateY = useSharedValue(0);
  const backScale = useSharedValue(1);
  const backTranslateX = useSharedValue(0);
  const wavesScale = useSharedValue(1);
  const wavesOpacity = useSharedValue(0.75);
  const dot1Scale = useSharedValue(1);
  const dot2Scale = useSharedValue(1);
  const dot3Scale = useSharedValue(1);
  const countScale = useSharedValue(1);

  const triggerAnimation = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    // 1. Front bubble elastic bounce
    frontScale.value = withSequence(
      withTiming(1.28, { duration: 140, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 9, stiffness: 190 })
    );
    frontTranslateY.value = withSequence(
      withTiming(-2.5, { duration: 140 }),
      withSpring(0, { damping: 10 })
    );

    // 2. Back bubble depth recoil
    backScale.value = withSequence(
      withTiming(0.92, { duration: 120 }),
      withSpring(1.04, { damping: 10 }),
      withSpring(1, { damping: 12 })
    );
    backTranslateX.value = withSequence(
      withTiming(-2, { duration: 120 }),
      withSpring(0, { damping: 10 })
    );

    // 3. Dialogue 3 Dots Wave
    dot1Scale.value = withSequence(
      withTiming(1.45, { duration: 110 }),
      withSpring(1, { damping: 10 })
    );
    setTimeout(() => {
      dot2Scale.value = withSequence(
        withTiming(1.45, { duration: 110 }),
        withSpring(1, { damping: 10 })
      );
    }, 50);
    setTimeout(() => {
      dot3Scale.value = withSequence(
        withTiming(1.45, { duration: 110 }),
        withSpring(1, { damping: 10 })
      );
    }, 100);

    // 4. Acoustic waves ripple
    wavesScale.value = withSequence(
      withTiming(1.35, { duration: 160, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 11 })
    );
    wavesOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0.75, { duration: 250 })
    );

    // 5. Count text bump
    countScale.value = withSequence(
      withTiming(1.2, { duration: 120 }),
      withSpring(1, { damping: 12 })
    );

    onPress();
  };

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: frontScale.value },
      { translateY: frontTranslateY.value },
    ],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: backScale.value },
      { translateX: backTranslateX.value },
    ],
  }));

  const wavesAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: wavesScale.value }],
    opacity: wavesOpacity.value,
  }));

  const dot1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot1Scale.value }],
  }));

  const dot2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot2Scale.value }],
  }));

  const dot3AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dot3Scale.value }],
  }));

  const countAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
  }));

  const iconBoxSize = size + 4;
  const strokeColor = colors.textPrimary || '#1E293B';
  const backBubbleColor = '#1E293B';
  const frontBubbleColor = '#FFFFFF';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="View discussions"
      hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
      onPress={triggerAnimation}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <View style={{ width: iconBoxSize, height: iconBoxSize, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        {/* Layer 1: Acoustic Sound Waves Ripple */}
        <Animated.View style={[StyleSheet.absoluteFill, wavesAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Path
              d="M 21.5 5.5 C 23.2 6.8, 24.2 8.2, 24.6 9.8"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M 23.8 3 C 26.2 4.8, 27.2 6.8, 27.6 8.8"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
              opacity={0.7}
            />
            <Path
              d="M 8.5 23.5 C 7 22.2, 6 20.8, 5.5 19.2"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M 6.2 26 C 4.2 24.2, 3.2 22.2, 2.8 20.2"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
              opacity={0.7}
            />
          </Svg>
        </Animated.View>

        {/* Layer 2: Back Dark Bubble */}
        <Animated.View style={[StyleSheet.absoluteFill, backAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Path
              d="M 5 11 C 5 6.5, 8.5 3.5, 13 3.5 C 17.5 3.5, 20.5 6.8, 20 11.5 C 19.5 16, 15.5 18, 12 18 L 6.5 21.5 L 7.5 16.5 C 5.8 15 5 13 5 11 Z"
              fill={backBubbleColor}
            />
          </Svg>
        </Animated.View>

        {/* Layer 3: Front Light Bubble (Body) */}
        <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Path
              d="M 10 16 C 10 11.8, 13.5 8.5, 18 8.5 C 22.5 8.5, 25.5 11.8, 25.5 16 C 25.5 20.2, 22 23.5, 17.5 23.5 L 21 26.5 L 16 23.2 C 12.5 22.8, 10 19.8, 10 16 Z"
              fill={frontBubbleColor}
              stroke={backBubbleColor}
              strokeWidth="1.2"
            />
          </Svg>
        </Animated.View>

        {/* Layer 4: Dot 1 */}
        <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle, dot1AnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Circle cx="15" cy="15.8" r="1.15" fill={backBubbleColor} />
          </Svg>
        </Animated.View>

        {/* Layer 5: Dot 2 */}
        <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle, dot2AnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Circle cx="17.8" cy="15.8" r="1.15" fill={backBubbleColor} />
          </Svg>
        </Animated.View>

        {/* Layer 6: Dot 3 */}
        <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle, dot3AnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Circle cx="20.6" cy="15.8" r="1.15" fill={backBubbleColor} />
          </Svg>
        </Animated.View>
      </View>

      {showCount && (
        <AnimatedView style={countAnimatedStyle}>
          <Text style={styles.actionCount}>
            {commentsCount}
          </Text>
        </AnimatedView>
      )}
    </TouchableOpacity>
  );
};

const AnimatedView = Animated.createAnimatedComponent(View);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  actionCount: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 13.5,
  },
});
