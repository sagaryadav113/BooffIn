import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { Send } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme';

export interface ShareToChatButtonProps {
  onPress: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const ShareToChatButton: React.FC<ShareToChatButtonProps> = ({
  onPress,
  size = 19,
  color = colors.textSecondary,
  style,
}) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    // Subtle paper-plane flick animation
    scale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1.15, { damping: 8 }),
      withSpring(1, { damping: 12 })
    );
    translateX.value = withSequence(
      withTiming(2, { duration: 90 }),
      withSpring(0, { damping: 10 })
    );
    translateY.value = withSequence(
      withTiming(-2, { duration: 90 }),
      withSpring(0, { damping: 10 })
    );

    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel="Share post to DM, community or inner circle"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Send size={size} color={color} strokeWidth={2} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
