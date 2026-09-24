import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors, radii } from '../../theme';

interface AvatarProps {
  url?: string;
  name?: string;
  size?: number;
  style?: ViewStyle;
  verified?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  url,
  name = 'User',
  size = 40,
  style,
  verified = false,
}) => {
  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <View style={[{ width: size, height: size }, styles.container, style]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
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
    fontWeight: '600',
    color: colors.textPrimary,
  },
  verifiedBadge: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: radii.full,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  verifiedCheck: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
});
