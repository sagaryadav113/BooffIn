import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
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

export interface LikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onPress: (e?: any) => void;
  onCountPress?: (e?: any) => void;
  size?: number;
  showCount?: boolean;
  style?: ViewStyle;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  isLiked,
  likesCount,
  onPress,
  onCountPress,
  size = 20,
  showCount = true,
  style,
}) => {
  // Shared Animation Values
  const unlikedOpacity = useSharedValue(isLiked ? 0 : 1);
  const unlikedScale = useSharedValue(isLiked ? 0.7 : 1);

  const backTranslateX = useSharedValue(isLiked ? -2.2 : 0);
  const backRotate = useSharedValue(isLiked ? -7 : 0);
  const backOpacity = useSharedValue(isLiked ? 1 : 0);

  const frontScale = useSharedValue(isLiked ? 1 : 0.6);
  const frontRotate = useSharedValue(isLiked ? 5 : 0);
  const frontOpacity = useSharedValue(isLiked ? 1 : 0);

  const handScale = useSharedValue(isLiked ? 1 : 0);
  const sparksScale = useSharedValue(isLiked ? 1 : 0.3);
  const sparksOpacity = useSharedValue(isLiked ? 0.9 : 0);

  const countScale = useSharedValue(1);

  // Sync animation values if isLiked prop changes externally
  useEffect(() => {
    if (isLiked) {
      unlikedOpacity.value = withTiming(0, { duration: 120 });
      unlikedScale.value = withTiming(0.7, { duration: 120 });

      backOpacity.value = withTiming(1, { duration: 100 });
      backTranslateX.value = withSpring(-2.2, { damping: 10, stiffness: 200 });
      backRotate.value = withSpring(-7, { damping: 10, stiffness: 200 });

      frontOpacity.value = withTiming(1, { duration: 100 });
      frontScale.value = withSpring(1, { damping: 9, stiffness: 190 });
      frontRotate.value = withSpring(5, { damping: 10, stiffness: 200 });

      handScale.value = withSpring(1, { damping: 8, stiffness: 220 });
      sparksScale.value = withSpring(1, { damping: 10, stiffness: 200 });
      sparksOpacity.value = withTiming(0.9, { duration: 150 });
    } else {
      unlikedOpacity.value = withTiming(1, { duration: 150 });
      unlikedScale.value = withSpring(1, { damping: 10, stiffness: 200 });

      backOpacity.value = withTiming(0, { duration: 100 });
      backTranslateX.value = withTiming(0, { duration: 120 });
      backRotate.value = withTiming(0, { duration: 120 });

      frontOpacity.value = withTiming(0, { duration: 100 });
      frontScale.value = withTiming(0.6, { duration: 120 });
      frontRotate.value = withTiming(0, { duration: 120 });

      handScale.value = withTiming(0, { duration: 100 });
      sparksScale.value = withTiming(0.3, { duration: 100 });
      sparksOpacity.value = withTiming(0, { duration: 100 });
    }
  }, [isLiked]);

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const willLike = !isLiked;

    if (willLike) {
      // 1. Unliked paper folds & shrinks
      unlikedOpacity.value = withTiming(0, { duration: 100 });
      unlikedScale.value = withTiming(0.65, { duration: 100 });

      // 2. Back dark paper slides out & tilts left
      backOpacity.value = withTiming(1, { duration: 80 });
      backTranslateX.value = withSequence(
        withTiming(-3.2, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(-2.2, { damping: 10, stiffness: 180 })
      );
      backRotate.value = withSequence(
        withTiming(-9, { duration: 140 }),
        withSpring(-7, { damping: 10 })
      );

      // 3. Front paper pops forward & tilts right
      frontOpacity.value = withTiming(1, { duration: 80 });
      frontScale.value = withSequence(
        withTiming(1.26, { duration: 150, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 9, stiffness: 190 })
      );
      frontRotate.value = withSequence(
        withTiming(7, { duration: 150 }),
        withSpring(5, { damping: 10 })
      );

      // 4. Thumbs-Up hand stamps onto page
      handScale.value = withSequence(
        withTiming(0, { duration: 50 }),
        withTiming(1.35, { duration: 160, easing: Easing.out(Easing.back(2)) }),
        withSpring(1, { damping: 9, stiffness: 210 })
      );

      // 5. Radiant Sparks burst
      sparksScale.value = withSequence(
        withTiming(1.45, { duration: 170, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 11 })
      );
      sparksOpacity.value = withSequence(
        withTiming(1, { duration: 90 }),
        withTiming(0.9, { duration: 250 })
      );

      // 6. Like count bump
      countScale.value = withSequence(
        withTiming(1.25, { duration: 120 }),
        withSpring(1, { damping: 11 })
      );
    } else {
      // Revert back smoothly to single clean paper
      unlikedOpacity.value = withTiming(1, { duration: 150 });
      unlikedScale.value = withSpring(1, { damping: 10 });

      backOpacity.value = withTiming(0, { duration: 100 });
      backTranslateX.value = withTiming(0, { duration: 120 });
      backRotate.value = withTiming(0, { duration: 120 });

      frontOpacity.value = withTiming(0, { duration: 100 });
      frontScale.value = withTiming(0.6, { duration: 120 });
      frontRotate.value = withTiming(0, { duration: 120 });

      handScale.value = withTiming(0, { duration: 100 });
      sparksScale.value = withTiming(0.3, { duration: 100 });
      sparksOpacity.value = withTiming(0, { duration: 100 });

      countScale.value = withSequence(
        withTiming(0.85, { duration: 100 }),
        withSpring(1, { damping: 12 })
      );
    }

    onPress();
  };

  // Animated Styles
  const unlikedAnimatedStyle = useAnimatedStyle(() => ({
    opacity: unlikedOpacity.value,
    transform: [{ scale: unlikedScale.value }],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backOpacity.value,
    transform: [
      { translateX: backTranslateX.value },
      { rotate: `${backRotate.value}deg` },
    ],
  }));

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    opacity: frontOpacity.value,
    transform: [
      { scale: frontScale.value },
      { rotate: `${frontRotate.value}deg` },
    ],
  }));

  const handAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: handScale.value }],
  }));

  const sparksAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sparksOpacity.value,
    transform: [{ scale: sparksScale.value }],
  }));

  const countAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
  }));

  const iconBoxSize = size + 4;
  const strokeColor = colors.textSecondary || '#64748B';
  const backPaperColor = '#1E293B';
  const frontPaperColor = '#F8FAFC';
  const handColor = '#1E293B';

  const renderIcon = () => (
    <View style={{ width: iconBoxSize, height: iconBoxSize, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      {/* State A: Single Outlined Paper (Unliked) */}
      <Animated.View style={[StyleSheet.absoluteFill, unlikedAnimatedStyle]}>
        <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
          <Path
            d="M 7.5 4 C 7.5 3.2 8.2 2.5 9 2.5 H 17.5 L 22.5 7.5 V 23.5 C 22.5 24.3 21.8 25 21 25 H 9 C 8.2 25 7.5 24.3 7.5 23.5 Z"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 17.5 2.5 V 7.5 H 22.5"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M 11 13 H 19"
            stroke={strokeColor}
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity={0.35}
          />
          <Path
            d="M 11 17 H 16"
            stroke={strokeColor}
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity={0.35}
          />
        </Svg>
      </Animated.View>

      {/* State B - Layer 1: Back Dark Paper (Liked) */}
      <Animated.View style={[StyleSheet.absoluteFill, backAnimatedStyle]}>
        <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
          <Path
            d="M 5 4.5 C 5 3.4 5.9 2.5 7 2.5 H 17 C 18.1 2.5 19 3.4 19 4.5 V 23.5 C 19 24.6 18.1 25.5 17 25.5 H 7 C 5.9 25.5 5 24.6 5 23.5 Z"
            fill={backPaperColor}
          />
        </Svg>
      </Animated.View>

      {/* State B - Layer 2: Front Light Paper with Dog-Ear (Liked) */}
      <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle]}>
        <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
          {/* Main Sheet */}
          <Path
            d="M 8.5 4 C 8.5 3.2 9.2 2.5 10 2.5 H 18.5 L 23.5 7.5 V 23.5 C 23.5 24.3 22.8 25 22 25 H 10 C 9.2 25 8.5 24.3 8.5 23.5 Z"
            fill={frontPaperColor}
            stroke={backPaperColor}
            strokeWidth="1"
          />
          {/* Top-Right Dog-Ear Curl Flap */}
          <Path
            d="M 18.5 2.5 V 7.5 H 23.5 Z"
            fill="#E2E8F0"
            stroke={backPaperColor}
            strokeWidth="0.9"
          />
        </Svg>
      </Animated.View>

      {/* State B - Layer 3: Thumbs-Up Hand Emblem */}
      <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle, handAnimatedStyle]}>
        <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
          {/* Cuff / Wrist */}
          <Path
            d="M 10.5 14.5 C 10.5 13.8 11 13.5 11.5 13.5 H 12.8 V 21 H 11.5 C 11 21 10.5 20.7 10.5 20 Z"
            fill={handColor}
          />
          <Circle cx="11.65" cy="19.2" r="0.55" fill={frontPaperColor} />

          {/* Thumb & Fist */}
          <Path
            d="M 13.5 14.5 C 13.5 13.5 14.2 10.8 15.5 10.2 C 16.5 9.7 17.2 10.5 16.8 11.8 C 16.5 12.8 16 13.8 15.8 14.5 H 19.5 C 20.5 14.5 21.2 15.2 21 16.2 L 20.5 18 C 20.3 18.7 19.7 19.2 19 19.2 H 18.8 C 19.3 19.5 19.5 20 19.3 20.5 C 19.1 21 18.6 21.3 18 21.3 H 13.5 Z"
            fill={handColor}
          />
        </Svg>
      </Animated.View>

      {/* State B - Layer 4: Radiant Rays */}
      <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle, sparksAnimatedStyle]}>
        <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
          <Path
            d="M 11.5 6.8 L 12.8 8.2"
            stroke={handColor}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <Path
            d="M 15 5 L 15 6.8"
            stroke={handColor}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <Path
            d="M 18.5 6.8 L 17.2 8.2"
            stroke={handColor}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );

  const renderCount = () => {
    if (!showCount) return null;

    const countText = (
      <AnimatedView style={countAnimatedStyle}>
        <Text
          style={[
            styles.actionCount,
            isLiked && { color: colors.textPrimary, fontWeight: '700' },
          ]}
        >
          {likesCount}
        </Text>
      </AnimatedView>
    );

    if (onCountPress) {
      return (
        <TouchableOpacity
          onPress={(e) => {
            try {
              Haptics.selectionAsync();
            } catch {}
            onCountPress(e);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 12 }}
          activeOpacity={0.7}
        >
          {countText}
        </TouchableOpacity>
      );
    }

    return countText;
  };

  if (onCountPress) {
    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike post' : 'Like post'}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 6 }}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          {renderIcon()}
        </TouchableOpacity>
        {renderCount()}
      </View>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={isLiked ? 'Unlike post' : 'Like post'}
      hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
      onPress={handlePress}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      {renderIcon()}
      {renderCount()}
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
