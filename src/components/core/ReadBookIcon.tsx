import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Path, G, Rect } from 'react-native-svg';
import { colors } from '../../theme';

export interface ReadBookIconProps {
  size?: number;
  color?: string;
  pageColor?: string;
  coverColor?: string;
  sparkColor?: string;
  style?: ViewStyle;
}

/**
 * Custom Academic Read Book Icon with Radiant Sparks
 * Directly styled after BooffIn's signature open-book illustration.
 */
export const ReadBookIcon: React.FC<ReadBookIconProps> = ({
  size = 18,
  color = '#1B4D3E',
  pageColor,
  coverColor,
  sparkColor,
  style,
}) => {
  const primaryColor = color;
  const activeCoverColor = coverColor || '#1F2937';
  const activePageColor = pageColor || '#F5F2EA';
  const activeLineColor = primaryColor;
  const activeSparkColor = sparkColor || primaryColor;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        {/* 3 Radiant Sparks / Insight Rays Above the Book */}
        <G fill={activeSparkColor}>
          {/* Left Ray */}
          <Path
            d="M 11.5 5 C 10.8 5.6, 12.8 9, 13.8 8.4 C 14.8 7.8, 12.2 4.4, 11.5 5 Z"
            fill={activeSparkColor}
          />
          {/* Center Vertical Ray */}
          <Path
            d="M 16 2.5 C 15.2 2.5, 15.2 7.8, 16 7.8 C 16.8 7.8, 16.8 2.5, 16 2.5 Z"
            fill={activeSparkColor}
          />
          {/* Right Ray */}
          <Path
            d="M 20.5 5 C 19.8 4.4, 17.2 7.8, 18.2 8.4 C 19.2 9, 21.2 5.6, 20.5 5 Z"
            fill={activeSparkColor}
          />
        </G>

        {/* Dark Under-Cover */}
        <Path
          d="M 6 12.5 C 10.5 13 14 14.5 16 16 C 18 14.5 21.5 13 26 12.5 C 26.5 12.5 27 12.9 27 13.5 L 27 24 C 27 24.6 26.5 25 26 25 C 21.5 25.5 18 27.2 16 29 C 14 27.2 10.5 25.5 6 25 C 5.5 25 5 24.6 5 24 L 5 13.5 C 5 12.9 5.5 12.5 6 12.5 Z"
          fill={activeCoverColor}
        />

        {/* Left Book Page */}
        <Path
          d="M 7 11.5 C 10.8 11.8 13.8 13.2 15.6 14.8 L 15.6 27 C 13.8 25.5 10.8 24.2 7 23.8 C 6.5 23.8 6.2 23.4 6.2 23 L 6.2 12.3 C 6.2 11.8 6.5 11.5 7 11.5 Z"
          fill={activePageColor}
          stroke={activeCoverColor}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Right Book Page */}
        <Path
          d="M 25 11.5 C 21.2 11.8 18.2 13.2 16.4 14.8 L 16.4 27 C 18.2 25.5 21.2 24.2 25 23.8 C 25.5 23.8 25.8 23.4 25.8 23 L 25.8 12.3 C 25.8 11.8 25.5 11.5 25 11.5 Z"
          fill={activePageColor}
          stroke={activeCoverColor}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Left Page Text Lines */}
        <Path
          d="M 8.8 15.2 Q 11.5 15.7 13.8 16.8"
          stroke={activeLineColor}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <Path
          d="M 8.8 18.2 Q 11.5 18.7 13.8 19.8"
          stroke={activeLineColor}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <Path
          d="M 8.8 21.2 Q 11.5 21.7 13.8 22.8"
          stroke={activeLineColor}
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Right Page Text Lines */}
        <Path
          d="M 23.2 15.2 Q 20.5 15.7 18.2 16.8"
          stroke={activeLineColor}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <Path
          d="M 23.2 18.2 Q 20.5 18.7 18.2 19.8"
          stroke={activeLineColor}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <Path
          d="M 23.2 21.2 Q 20.5 21.7 18.2 22.8"
          stroke={activeLineColor}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};
