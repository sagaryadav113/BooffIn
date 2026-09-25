import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { typography, colors } from '../../theme';

export type TypographyVariant =
  | 'display'
  | 'displaySmall'
  | 'pageTitle'
  | 'sectionTitle'
  | 'contentTitle'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'titleSerif'
  | 'bodyLarge'
  | 'bodyLargeMedium'
  | 'bodyLargeBold'
  | 'body'
  | 'bodyMedium'
  | 'bodyBold'
  | 'label'
  | 'labelBold'
  | 'caption'
  | 'captionMedium'
  | 'captionBold'
  | 'metadata'
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
