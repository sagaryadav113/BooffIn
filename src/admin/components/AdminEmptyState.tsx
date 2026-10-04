// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN EMPTY STATE COMPONENT
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';

interface AdminEmptyStateProps {
  title: string;
  description: string;
}

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  title,
  description,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    textAlign: 'center',
  },
});
