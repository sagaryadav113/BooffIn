import React from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
import { Image } from 'expo-image';
import { typography, colors, spacing } from '../../theme';

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
  if (variant === 'wordmark') {
    return (
      <View style={[styles.container, style]}>
        <Image
          source={require('../../../assets/images/booffin-wordmark.jpg')}
          style={{ width: size * 2.8, height: size }}
          contentFit="contain"
          transition={200}
        />
        {showTagline && (
          <Text style={styles.tagline}>Research finds its people.</Text>
        )}
      </View>
    );
  }

  if (variant === 'full') {
    return (
      <View style={[styles.container, style]}>
        <Image
          source={require('../../../assets/images/booffin-full-logo.jpg')}
          style={{ width: size * 1.5, height: size * 1.5 }}
          contentFit="contain"
          transition={200}
        />
        {showTagline && (
          <Text style={styles.tagline}>Research finds its people.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../../assets/images/booffin-symbol.png')}
        style={{ width: size, height: size * 1.05 }}
        contentFit="contain"
        transition={200}
      />
      {showTagline && (
        <View style={styles.taglineContainer}>
          <Text style={styles.wordmark}>BooffIn</Text>
          <Text style={styles.tagline}>Research finds its people.</Text>
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
