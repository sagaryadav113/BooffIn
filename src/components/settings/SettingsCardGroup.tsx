import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';

interface SettingsCardGroupProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const SettingsCardGroup: React.FC<SettingsCardGroupProps> = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    // Subtle elevation shadow for card grouping
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
});
