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
      <Typography variant="labelBold" color={colors.textSecondary} style={styles.title}>
        {title.toUpperCase()}
      </Typography>
      {description && (
        <Typography variant="caption" color={colors.textMuted} style={styles.description}>
          {description}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontSize: 12.5,
    letterSpacing: 0.7,
    fontWeight: '700',
  },
  description: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },
});
