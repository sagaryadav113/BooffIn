import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { typography, colors } from '../../theme';

export type TypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'titleSerif'
  | 'bodyLarge'
  | 'body'
  | 'bodyMedium'
  | 'bodyBold'
  | 'caption'
  | 'captionMedium'
  | 'captionBold'
  | 'micro'
  | 'microBold';

export interface TypographyProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  children: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = colors.textPrimary,
  align = 'left',
  style,
  children,
  ...props
}) => {
  const variantStyle = typography[variant] || typography.body;

  return (
    <RNText
      style={[
        variantStyle,
        { color, textAlign: align },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
