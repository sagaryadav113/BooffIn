import React from 'react';
import { View, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import { Typography } from '../core/Typography';

export interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  style?: ViewStyle;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Retrieving academic data...',
  subMessage,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.textPrimary} />
      {message && (
        <Typography
          variant="captionBold"
          color={colors.textPrimary}
          align="center"
          style={styles.message}
        >
          {message}
        </Typography>
      )}
      {subMessage && (
        <Typography
          variant="micro"
          color={colors.textSecondary}
          align="center"
          style={styles.subMessage}
        >
          {subMessage}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: spacing.md,
  },
  subMessage: {
    marginTop: spacing.xs,
  },
});
