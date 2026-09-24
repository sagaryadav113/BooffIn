import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import { Typography } from '../core/Typography';

export interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'small',
  color = colors.black,
  fullScreen = false,
  style,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Typography
          variant="captionMedium"
          color={colors.textSecondary}
          style={styles.message}
        >
          {message}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    marginTop: spacing.sm,
  },
});
