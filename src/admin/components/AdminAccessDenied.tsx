// ============================================================================
// BOOFFIN ADMIN PORTAL — ACCESS DENIED / ZERO-TRUST VIEW
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';

interface AdminAccessDeniedProps {
  reason?: string;
  onRetry?: () => void;
  onSignOut?: () => void;
}

export const AdminAccessDenied: React.FC<AdminAccessDeniedProps> = ({
  reason = 'You do not have administrative privileges on this platform.',
  onRetry,
  onSignOut,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🛡️</Text>
        </View>
        <Text style={styles.title}>403 — Administrative Access Denied</Text>
        <Text style={styles.description}>
          This interface is strictly restricted to verified BooffIn administrative staff.
        </Text>
        <Text style={styles.reasonText}>{reason}</Text>

        <View style={styles.actions}>
          {onRetry ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={onRetry}>
              <Text style={styles.secondaryButtonText}>Re-check Session</Text>
            </TouchableOpacity>
          ) : null}
          {onSignOut ? (
            <TouchableOpacity style={styles.primaryButton} onPress={onSignOut}>
              <Text style={styles.primaryButtonText}>Sign Out</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    maxWidth: 480,
    width: '100%',
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.dangerBorder,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ADMIN_COLORS.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: ADMIN_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 12,
    color: ADMIN_COLORS.danger,
    backgroundColor: ADMIN_COLORS.dangerBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: ADMIN_COLORS.bgHover,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderStrong,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  secondaryButtonText: {
    color: ADMIN_COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
});
