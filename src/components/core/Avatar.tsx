import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors, radii, layout } from '../../theme';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

const sizeMap: Record<string, number> = {
  xs: layout.avatarSizes.xs,
  sm: layout.avatarSizes.sm,
  md: layout.avatarSizes.md,
  lg: layout.avatarSizes.lg,
  xl: layout.avatarSizes.xl,
};

interface AvatarProps {
  url?: string;
  uri?: string;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
  verified?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  url,
  uri,
  name = 'User',
  size = 'md',
  style,
  verified = false,
}) => {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size] || layout.avatarSizes.md;
  const imageSource = uri || url;
  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <View style={[{ width: pixelSize, height: pixelSize }, styles.container, style]}>
      {imageSource ? (
        <Image
          source={{ uri: imageSource }}
          style={{ width: pixelSize, height: pixelSize, borderRadius: pixelSize / 2 }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: pixelSize, height: pixelSize, borderRadius: pixelSize / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: Math.max(10, pixelSize * 0.38) }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {verified && (
        <View style={[styles.verifiedBadge, { right: -1, bottom: -1 }]}>
          <Text style={styles.verifiedCheck}>✓</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  fallback: {
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  initials: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: radii.full,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  verifiedCheck: {
    color: colors.white,
    fontSize: 9.5,
    fontWeight: '800',
  },
});
