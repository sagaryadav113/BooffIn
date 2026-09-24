import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme';
import { Typography } from '../core/Typography';
import { Button } from '../core/Button';
import { Icon, IconName } from '../core/Icon';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'Inbox',
  title,
  description,
  actionTitle,
  onAction,
  onActionPress,
  style,
}) => {
  const handleAction = onAction || onActionPress;

  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={styles.iconCircle}>
          <Icon name={icon} size="lg" color={colors.textSecondary} />
        </View>
      )}

      <Typography variant="captionBold" align="center" style={styles.title}>
        {title}
      </Typography>

      {description && (
        <Typography
          variant="caption"
          color={colors.textSecondary}
          align="center"
          style={styles.description}
        >
          {description}
        </Typography>
      )}

      {actionTitle && handleAction && (
        <Button
          title={actionTitle}
          variant="outline"
          size="sm"
          onPress={handleAction}
          style={styles.actionButton}
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: spacing.lg,
  },
});
