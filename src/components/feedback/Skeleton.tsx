import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, radii } from '../../theme';

export interface SkeletonProps {
  width?: number | `${number}%` | '100%';
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  style,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 900 }),
      -1,
      true
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.backgroundSecondary, colors.backgroundTertiary]
    );
    return { backgroundColor };
  });

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
