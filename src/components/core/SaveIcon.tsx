import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Path, G, Rect } from 'react-native-svg';
import { colors } from '../../theme';

export interface SaveIconProps {
  size?: number;
  isSaved?: boolean;
  color?: string;
  backPaperColor?: string;
  frontPaperColor?: string;
  ribbonColor?: string;
  style?: ViewStyle;
}

export const SaveIcon: React.FC<SaveIconProps> = ({
  size = 20,
  isSaved = false,
  color = colors.textSecondary || '#64748B',
  backPaperColor = '#1E293B',
  frontPaperColor = '#F8FAFC',
  ribbonColor = '#1E293B',
  style,
}) => {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {isSaved ? (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          {/* 1. Back Dark Paper (Offset to the bottom-left) */}
          <Path
            d="M 4 8 C 4 6.3 5.3 5 7 5 H 18 C 19.7 5 21 6.3 21 8 V 23 C 21 24.7 19.7 26 18 26 H 7 C 5.3 26 4 24.7 4 23 Z"
            fill={backPaperColor}
          />

          {/* 2. Front Light Paper (Offset to the top-right with dog-ear fold) */}
          <G>
            {/* Front Paper Body */}
            <Path
              d="M 6.5 4.5 C 6.5 3.1 7.6 2 9 2 H 17.5 L 22.5 7 V 20.5 C 22.5 21.9 21.4 23 20 23 H 9 C 7.6 23 6.5 21.9 6.5 20.5 Z"
              fill={frontPaperColor}
              stroke={backPaperColor}
              strokeWidth="0.9"
            />
            {/* Curled Dog-Ear Corner Flap */}
            <Path
              d="M 17.5 2 V 7 H 22.5 Z"
              fill="#E2E8F0"
              stroke={backPaperColor}
              strokeWidth="0.8"
            />

            {/* 3. Central Ribbon Bookmark Emblem */}
            <Path
              d="M 10 7 C 10 6.2 10.7 5.5 11.5 5.5 H 17.5 C 18.3 5.5 19 6.2 19 7 V 18.5 L 14.5 15.2 L 10 18.5 Z"
              fill={ribbonColor}
            />

            {/* 4. Top-Right Radiant Spark Rays */}
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
          </G>
        </Svg>
      ) : (
        <Svg width={size} height={size} viewBox="0 0 28 28">
          {/* Unsaved: Single clean outlined paper with bookmark cutout */}
          <Path
            d="M 6.5 4 C 6.5 2.9 7.4 2 8.5 2 H 17.5 L 22.5 7 V 23 C 22.5 24.1 21.6 25 20.5 25 H 8.5 C 7.4 25 6.5 24.1 6.5 23 Z"
            fill="none"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Top-Right Dog-Ear Crease */}
          <Path
            d="M 17.5 2 V 7 H 22.5"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Minimal Ribbon outline in center */}
          <Path
            d="M 11 8 C 11 7.4 11.4 7 12 7 H 17 C 17.6 7 18 7.4 18 8 V 17 L 14.5 14.2 L 11 17 Z"
            fill="none"
            stroke={color}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.55}
          />
        </Svg>
      )}
    </View>
  );
};
