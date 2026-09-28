import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { colors } from '../../theme';

export interface LikeIconProps {
  size?: number;
  isLiked?: boolean;
  color?: string;
  backPaperColor?: string;
  frontPaperColor?: string;
  handColor?: string;
  style?: ViewStyle;
}

export const LikeIcon: React.FC<LikeIconProps> = ({
  size = 20,
  isLiked = false,
  color = colors.textSecondary || '#64748B',
  backPaperColor = '#1E293B',
  frontPaperColor = '#F5F5F0',
  handColor = '#1E293B',
  style,
}) => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {isLiked ? (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          {/* 1. Back Dark Paper (tilted left) */}
          <G transform="rotate(-7 13 14)">
            <Path
              d="M 5 4.5 C 5 3.4 5.9 2.5 7 2.5 H 17 C 18.1 2.5 19 3.4 19 4.5 V 23.5 C 19 24.6 18.1 25.5 17 25.5 H 7 C 5.9 25.5 5 24.6 5 23.5 Z"
              fill={backPaperColor}
            />
          </G>

          {/* 2. Front Light Paper (tilted right with dog-ear corner fold) */}
          <G transform="rotate(5 15 14)">
            {/* Main sheet body */}
            <Path
              d="M 8.5 4 C 8.5 3.2 9.2 2.5 10 2.5 H 18.5 L 23.5 7.5 V 23.5 C 23.5 24.3 22.8 25 22 25 H 10 C 9.2 25 8.5 24.3 8.5 23.5 Z"
              fill={frontPaperColor}
              stroke={backPaperColor}
              strokeWidth="0.9"
            />
            {/* Top-Right Dog-Ear Corner Curl Flap */}
            <Path
              d="M 18.5 2.5 V 7.5 H 23.5 Z"
              fill="#E2E8F0"
              stroke={backPaperColor}
              strokeWidth="0.8"
            />

            {/* 3. Radiant Approval Rays above thumb */}
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

            {/* 4. Thumbs-Up Hand Emblem */}
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
          </G>
        </Svg>
      ) : (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          {/* Unliked: Single clean outlined paper with subtle top-right corner fold */}
          <Path
            d="M 7.5 4 C 7.5 3.2 8.2 2.5 9 2.5 H 17.5 L 22.5 7.5 V 23.5 C 22.5 24.3 21.8 25 21 25 H 9 C 8.2 25 7.5 24.3 7.5 23.5 Z"
            fill="none"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Corner Fold */}
          <Path
            d="M 17.5 2.5 V 7.5 H 22.5"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Subtle horizontal research note line inside */}
          <Path
            d="M 11 13 H 19"
            stroke={color}
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity={0.4}
          />
          <Path
            d="M 11 17 H 16"
            stroke={color}
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity={0.4}
          />
        </Svg>
      )}
    </View>
  );
};
