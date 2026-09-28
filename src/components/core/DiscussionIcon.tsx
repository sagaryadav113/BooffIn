import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';

export interface DiscussionIconProps {
  size?: number;
  color?: string;
  frontColor?: string;
  backColor?: string;
  style?: ViewStyle;
}

export const DiscussionIcon: React.FC<DiscussionIconProps> = ({
  size = 20,
  color = colors.textPrimary || '#1E293B',
  frontColor,
  backColor,
  style,
}) => {
  const actualBackColor = backColor || '#1E293B';
  const actualFrontColor = frontColor || '#FFFFFF';
  const strokeColor = color || '#1E293B';

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 28 28">
        {/* Acoustic Sound Waves - Top Right */}
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
          opacity={0.8}
        />

        {/* Acoustic Sound Waves - Bottom Left */}
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
          opacity={0.8}
        />

        {/* Back Dark Bubble */}
        <Path
          d="M 5 11 C 5 6.5, 8.5 3.5, 13 3.5 C 17.5 3.5, 20.5 6.8, 20 11.5 C 19.5 16, 15.5 18, 12 18 L 6.5 21.5 L 7.5 16.5 C 5.8 15 5 13 5 11 Z"
          fill={actualBackColor}
        />

        {/* Front Light Bubble */}
        <Path
          d="M 10 16 C 10 11.8, 13.5 8.5, 18 8.5 C 22.5 8.5, 25.5 11.8, 25.5 16 C 25.5 20.2, 22 23.5, 17.5 23.5 L 21 26.5 L 16 23.2 C 12.5 22.8, 10 19.8, 10 16 Z"
          fill={actualFrontColor}
          stroke={actualBackColor}
          strokeWidth="1.2"
        />

        {/* Dialogue 3 Dots inside Front Bubble */}
        <Circle cx="15" cy="15.8" r="1.15" fill={actualBackColor} />
        <Circle cx="17.8" cy="15.8" r="1.15" fill={actualBackColor} />
        <Circle cx="20.6" cy="15.8" r="1.15" fill={actualBackColor} />
      </Svg>
    </View>
  );
};
