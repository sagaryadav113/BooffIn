import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { Typography } from '../core/Typography';

interface SettingsSectionHeaderProps {
  title: string;
  description?: string;
}

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({
  title,
  description,
}) => {
  return (
    <View style={styles.container}>
      <Typography variant="captionBold" color={colors.textSecondary} style={styles.title}>
        {title.toUpperCase()}
      </Typography>
      {description && (
        <Typography variant="micro" color={colors.textMuted} style={styles.description}>
          {description}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontSize: 12,
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  description: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
});
