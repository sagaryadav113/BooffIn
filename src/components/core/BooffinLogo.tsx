import React from 'react';
import { View, StyleSheet, ViewStyle, Text } from 'react-native';
import { Image } from 'expo-image';
import { typography, colors, spacing } from '../../theme';

export interface BooffinLogoProps {
  size?: number;
  variant?: 'symbol' | 'full';
  showTagline?: boolean;
  style?: ViewStyle;
}

export const BooffinLogo: React.FC<BooffinLogoProps> = ({
  size = 120,
  variant = 'symbol',
  showTagline = false,
  style,
}) => {
  if (variant === 'full') {
    return (
      <View style={[styles.container, style]}>
        <Image
          source={require('../../../assets/images/booffin-full-logo.jpg')}
          style={{ width: size, height: size * 1.05 }}
          contentFit="contain"
          transition={200}
        />
        {showTagline && (
          <Text style={styles.tagline}>Research finds it's people.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../../../assets/images/booffin-symbol.png')}
        style={{ width: size * 0.85, height: size }}
        contentFit="contain"
        transition={200}
      />
      {showTagline && (
        <View style={styles.taglineContainer}>
          <Text style={styles.wordmark}>Let's <Text style={{ fontWeight: '800' }}>BooffIn</Text></Text>
          <Text style={styles.tagline}>Research finds it's people.</Text>
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
    ...typography.h2,
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
