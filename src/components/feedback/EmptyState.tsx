import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, layout, typography } from '../../theme';
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
          <Icon name={icon} size={28} color={colors.textSecondary} strokeWidth={1.75} />
        </View>
      )}

      <Typography variant="sectionTitle" align="center" style={styles.title}>
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body"
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
          variant="primary"
          size="md"
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs + 2,
    letterSpacing: -0.3,
  },
  description: {
    textAlign: 'center',
    maxWidth: 340,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  actionButton: {
    marginTop: spacing.xl,
    minWidth: 160,
  },
});
