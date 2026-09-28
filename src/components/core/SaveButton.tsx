import React, { useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme';

export interface SaveButtonProps {
  isSaved: boolean;
  onPress: (e?: any) => void;
  size?: number;
  style?: ViewStyle;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  isSaved,
  onPress,
  size = 20,
  style,
}) => {
  // Shared Animation Values
  const unlikedOpacity = useSharedValue(isSaved ? 0 : 1);
  const unlikedScale = useSharedValue(isSaved ? 0.7 : 1);

  const backTranslateX = useSharedValue(isSaved ? -2.5 : 0);
  const backTranslateY = useSharedValue(isSaved ? 2.5 : 0);
  const backOpacity = useSharedValue(isSaved ? 1 : 0);

  const frontScale = useSharedValue(isSaved ? 1 : 0.6);
  const frontOpacity = useSharedValue(isSaved ? 1 : 0);

  const ribbonScale = useSharedValue(isSaved ? 1 : 0);
  const ribbonTranslateY = useSharedValue(isSaved ? 0 : -3);

  const sparksScale = useSharedValue(isSaved ? 1 : 0.3);
  const sparksOpacity = useSharedValue(isSaved ? 0.9 : 0);

  // Sync if isSaved prop changes externally
  useEffect(() => {
    if (isSaved) {
      unlikedOpacity.value = withTiming(0, { duration: 120 });
      unlikedScale.value = withTiming(0.7, { duration: 120 });

      backOpacity.value = withTiming(1, { duration: 100 });
      backTranslateX.value = withSpring(-2.5, { damping: 10, stiffness: 200 });
      backTranslateY.value = withSpring(2.5, { damping: 10, stiffness: 200 });

      frontOpacity.value = withTiming(1, { duration: 100 });
      frontScale.value = withSpring(1, { damping: 9, stiffness: 190 });

      ribbonScale.value = withSpring(1, { damping: 8, stiffness: 220 });
      ribbonTranslateY.value = withSpring(0, { damping: 9, stiffness: 200 });

      sparksScale.value = withSpring(1, { damping: 10, stiffness: 200 });
      sparksOpacity.value = withTiming(0.9, { duration: 150 });
    } else {
      unlikedOpacity.value = withTiming(1, { duration: 150 });
      unlikedScale.value = withSpring(1, { damping: 10, stiffness: 200 });

      backOpacity.value = withTiming(0, { duration: 100 });
      backTranslateX.value = withTiming(0, { duration: 120 });
      backTranslateY.value = withTiming(0, { duration: 120 });

      frontOpacity.value = withTiming(0, { duration: 100 });
      frontScale.value = withTiming(0.6, { duration: 120 });

      ribbonScale.value = withTiming(0, { duration: 100 });
      ribbonTranslateY.value = withTiming(-3, { duration: 100 });

      sparksScale.value = withTiming(0.3, { duration: 100 });
      sparksOpacity.value = withTiming(0, { duration: 100 });
    }
  }, [isSaved]);

  const handlePress = (e?: any) => {
    if (e?.stopPropagation) e.stopPropagation();

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const willSave = !isSaved;

    if (willSave) {
      // 1. Unsaved paper folds down
      unlikedOpacity.value = withTiming(0, { duration: 100 });
      unlikedScale.value = withTiming(0.65, { duration: 100 });

      // 2. Back dark paper slides bottom-left
      backOpacity.value = withTiming(1, { duration: 80 });
      backTranslateX.value = withSequence(
        withTiming(-3.5, { duration: 130, easing: Easing.out(Easing.quad) }),
        withSpring(-2.5, { damping: 10, stiffness: 180 })
      );
      backTranslateY.value = withSequence(
        withTiming(3.5, { duration: 130, easing: Easing.out(Easing.quad) }),
        withSpring(2.5, { damping: 10, stiffness: 180 })
      );

      // 3. Front paper pops forward
      frontOpacity.value = withTiming(1, { duration: 80 });
      frontScale.value = withSequence(
        withTiming(1.24, { duration: 150, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 9, stiffness: 190 })
      );

      // 4. Ribbon bookmark drops & stamps in
      ribbonScale.value = withSequence(
        withTiming(0, { duration: 40 }),
        withTiming(1.3, { duration: 150, easing: Easing.out(Easing.back(2)) }),
        withSpring(1, { damping: 9, stiffness: 210 })
      );
      ribbonTranslateY.value = withSequence(
        withTiming(-4, { duration: 40 }),
        withSpring(0, { damping: 10, stiffness: 200 })
      );

      // 5. Top-Right Radiant Spark burst
      sparksScale.value = withSequence(
        withTiming(1.45, { duration: 170, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 11 })
      );
      sparksOpacity.value = withSequence(
        withTiming(1, { duration: 80 }),
        withTiming(0.9, { duration: 250 })
      );
    } else {
      // Smooth reversal back to single outline
      unlikedOpacity.value = withTiming(1, { duration: 150 });
      unlikedScale.value = withSpring(1, { damping: 10 });

      backOpacity.value = withTiming(0, { duration: 100 });
      backTranslateX.value = withTiming(0, { duration: 120 });
      backTranslateY.value = withTiming(0, { duration: 120 });

      frontOpacity.value = withTiming(0, { duration: 100 });
      frontScale.value = withTiming(0.6, { duration: 120 });

      ribbonScale.value = withTiming(0, { duration: 100 });
      ribbonTranslateY.value = withTiming(-3, { duration: 100 });

      sparksScale.value = withTiming(0.3, { duration: 100 });
      sparksOpacity.value = withTiming(0, { duration: 100 });
    }

    onPress(e);
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
      { translateY: backTranslateY.value },
    ],
  }));

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    opacity: frontOpacity.value,
    transform: [{ scale: frontScale.value }],
  }));

  const ribbonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: ribbonScale.value },
      { translateY: ribbonTranslateY.value },
    ],
  }));

  const sparksAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sparksOpacity.value,
    transform: [{ scale: sparksScale.value }],
  }));

  const iconBoxSize = size + 4;
  const strokeColor = colors.textSecondary || '#64748B';
  const backPaperColor = '#1E293B';
  const frontPaperColor = '#F8FAFC';
  const ribbonColor = '#1E293B';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={isSaved ? 'Remove bookmark' : 'Bookmark post'}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPress={handlePress}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <View style={{ width: iconBoxSize, height: iconBoxSize, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
        {/* State A: Single Outlined Paper with Corner Fold (Unsaved) */}
        <Animated.View style={[StyleSheet.absoluteFill, unlikedAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Path
              d="M 6.5 4 C 6.5 2.9 7.4 2 8.5 2 H 17.5 L 22.5 7 V 23 C 22.5 24.1 21.6 25 20.5 25 H 8.5 C 7.4 25 6.5 24.1 6.5 23 Z"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 17.5 2 V 7 H 22.5"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M 11 8 C 11 7.4 11.4 7 12 7 H 17 C 17.6 7 18 7.4 18 8 V 17 L 14.5 14.2 L 11 17 Z"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.55}
            />
          </Svg>
        </Animated.View>

        {/* State B - Layer 1: Back Dark Paper (Saved) */}
        <Animated.View style={[StyleSheet.absoluteFill, backAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Path
              d="M 4 8 C 4 6.3 5.3 5 7 5 H 18 C 19.7 5 21 6.3 21 8 V 23 C 21 24.7 19.7 26 18 26 H 7 C 5.3 26 4 24.7 4 23 Z"
              fill={backPaperColor}
            />
          </Svg>
        </Animated.View>

        {/* State B - Layer 2: Front Light Paper with Dog-Ear (Saved) */}
        <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Path
              d="M 6.5 4.5 C 6.5 3.1 7.6 2 9 2 H 17.5 L 22.5 7 V 20.5 C 22.5 21.9 21.4 23 20 23 H 9 C 7.6 23 6.5 21.9 6.5 20.5 Z"
              fill={frontPaperColor}
              stroke={backPaperColor}
              strokeWidth="1"
            />
            <Path
              d="M 17.5 2 V 7 H 22.5 Z"
              fill="#E2E8F0"
              stroke={backPaperColor}
              strokeWidth="0.9"
            />
          </Svg>
        </Animated.View>

        {/* State B - Layer 3: Central Ribbon Bookmark */}
        <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle, ribbonAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Path
              d="M 10 7 C 10 6.2 10.7 5.5 11.5 5.5 H 17.5 C 18.3 5.5 19 6.2 19 7 V 18.5 L 14.5 15.2 L 10 18.5 Z"
              fill={ribbonColor}
            />
          </Svg>
        </Animated.View>

        {/* State B - Layer 4: Top-Right Radiant Spark Rays */}
        <Animated.View style={[StyleSheet.absoluteFill, frontAnimatedStyle, sparksAnimatedStyle]}>
          <Svg width={iconBoxSize} height={iconBoxSize} viewBox="0 0 28 28">
            <Path
              d="M 23 3.5 L 25 1.5"
              stroke={ribbonColor}
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <Path
              d="M 24.5 6 L 27.2 4.2"
              stroke={ribbonColor}
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <Path
              d="M 24.8 9 L 27.5 9"
              stroke={ribbonColor}
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
});
