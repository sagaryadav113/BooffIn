import React from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
import { Image } from 'expo-image';
import { typography, colors, spacing, useTheme } from '../../theme';

export interface BooffinLogoProps {
  size?: number;
  variant?: 'symbol' | 'full' | 'wordmark';
  showTagline?: boolean;
  style?: ViewStyle;
}

export const BooffinLogo: React.FC<BooffinLogoProps> = ({
  size = 56,
  variant = 'symbol',
  showTagline = false,
  style,
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const wordmarkSource = isDark
    ? require('../../../assets/images/booffin-wordmark-dark.svg')
    : require('../../../assets/images/booffin-wordmark.svg');

  if (variant === 'wordmark') {
    return (
      <View style={[styles.container, style]}>
        <Image
          source={wordmarkSource}
          style={{ width: size * 3.87, height: size }}
          contentFit="contain"
          transition={200}
        />
        {showTagline && (
          <Text style={[styles.tagline, { color: themeColors.textSecondary }]}>Research finds its people.</Text>
        )}
      </View>
    );
  }

  if (variant === 'full') {
    return (
      <View style={[styles.container, style]}>
        <Image
          source={wordmarkSource}
          style={{ width: size * 3.87, height: size }}
          contentFit="contain"
          transition={200}
        />
        {showTagline && (
          <Text style={[styles.tagline, { color: themeColors.textSecondary }]}>Research finds its people.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../../assets/images/booffin-symbol.svg')}
        style={{ width: size * 0.9, height: size }}
        contentFit="contain"
        transition={200}
      />
      {showTagline && (
        <View style={styles.taglineContainer}>
          <Image
            source={wordmarkSource}
            style={{ width: 140, height: 36, marginBottom: 4 }}
            contentFit="contain"
          />
          <Text style={[styles.tagline, { color: themeColors.textSecondary }]}>Research finds its people.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  wordmark: {
    ...typography.pageTitle,
    fontSize: 26,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  tagline: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
});
