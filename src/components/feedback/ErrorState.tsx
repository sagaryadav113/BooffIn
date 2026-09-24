import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import { Typography } from '../core/Typography';
import { Button } from '../core/Button';
import { Icon } from '../core/Icon';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this research data.',
  onRetry,
  retryText = 'Retry',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Icon name="AlertCircle" size="lg" color={colors.accentRed} />
      </View>

      <Typography
        variant="h3"
        color={colors.textPrimary}
        align="center"
        style={styles.title}
      >
        {title}
      </Typography>

      <Typography
        variant="caption"
        color={colors.textSecondary}
        align="center"
        style={styles.message}
      >
        {message}
      </Typography>

      {onRetry && (
        <Button
          title={retryText}
          variant="outline"
          size="md"
          onPress={onRetry}
          style={styles.retryButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.xs,
  },
  message: {
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: spacing.lg,
  },
  retryButton: {
    minWidth: 120,
  },
});
