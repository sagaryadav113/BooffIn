import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Rect, Circle, Line, Path } from 'react-native-svg';

export interface VaultIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  variant?: 'outline' | 'solid';
  badgeColor?: string;
  style?: ViewStyle;
}

/**
 * VaultIcon - High fidelity vector icon modeled after the reference bank vault/safe.
 * Features an outer rounded chassis, left vertical handle capsule,
 * inner door frame, and centered 8-point combination lock dial.
 */
export const VaultIcon: React.FC<VaultIconProps> = ({
  size = 24,
  color = '#059669',
  strokeWidth = 1.8,
  variant = 'outline',
  badgeColor,
  style,
}) => {
  const isSolid = variant === 'solid';
  const outerFill = isSolid ? color : 'none';
  const strokeColor = isSolid ? (badgeColor || '#FFFFFF') : color;
  const sw = strokeWidth;

  // Dial center at (12.7, 12)
  const cx = 12.7;
  const cy = 12.0;

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Outer Safe Chassis (Rounded Squircle) */}
        <Rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="4.8"
          fill={outerFill}
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Safe Door Frame - Wraps top, right, bottom around handle */}
        <Path
          d="M 5 4.8 H 18.6 A 1.6 1.6 0 0 1 20.2 6.4 V 17.6 A 1.6 1.6 0 0 1 18.6 19.2 H 5"
          stroke={strokeColor}
          strokeWidth={sw * 0.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Vertical Hinge / Handle Capsule on Left */}
        <Rect
          x="3.2"
          y="6.4"
          width="2.0"
          height="11.2"
          rx="1.0"
          stroke={strokeColor}
          strokeWidth={sw * 0.9}
          fill={isSolid ? strokeColor : 'none'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Combination Dial - Outer Wheel */}
        <Circle
          cx={cx}
          cy={cy}
          r="3.8"
          stroke={strokeColor}
          strokeWidth={sw * 0.9}
          fill="none"
        />

        {/* Combination Dial - Inner Ring / Knob */}
        <Circle
          cx={cx}
          cy={cy}
          r="1.9"
          stroke={strokeColor}
          strokeWidth={sw * 0.9}
          fill={isSolid ? strokeColor : 'none'}
        />

        {/* Combination Dial - 8 Radial Dial Notches / Grip Spokes */}
        {/* 0 deg (Right) */}
        <Line x1="16.5" y1="12" x2="17.7" y2="12" stroke={strokeColor} strokeWidth={sw * 0.85} strokeLinecap="round" />
        {/* 45 deg (Bottom-Right) */}
        <Line x1="15.4" y1="14.7" x2="16.2" y2="15.5" stroke={strokeColor} strokeWidth={sw * 0.85} strokeLinecap="round" />
        {/* 90 deg (Bottom) */}
        <Line x1="12.7" y1="15.8" x2="12.7" y2="17.0" stroke={strokeColor} strokeWidth={sw * 0.85} strokeLinecap="round" />
        {/* 135 deg (Bottom-Left) */}
        <Line x1="10.0" y1="14.7" x2="9.2" y2="15.5" stroke={strokeColor} strokeWidth={sw * 0.85} strokeLinecap="round" />
        {/* 180 deg (Left) */}
        <Line x1="8.9" y1="12" x2="7.7" y2="12" stroke={strokeColor} strokeWidth={sw * 0.85} strokeLinecap="round" />
        {/* 225 deg (Top-Left) */}
        <Line x1="10.0" y1="9.3" x2="9.2" y2="8.5" stroke={strokeColor} strokeWidth={sw * 0.85} strokeLinecap="round" />
        {/* 270 deg (Top) */}
        <Line x1="12.7" y1="8.2" x2="12.7" y2="7.0" stroke={strokeColor} strokeWidth={sw * 0.85} strokeLinecap="round" />
        {/* 315 deg (Top-Right) */}
        <Line x1="15.4" y1="9.3" x2="16.2" y2="8.5" stroke={strokeColor} strokeWidth={sw * 0.85} strokeLinecap="round" />
      </Svg>
    </View>
  );
};
