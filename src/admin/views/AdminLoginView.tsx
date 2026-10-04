// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN LOGIN VIEW
// ============================================================================

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { adminAuthService } from '../services/adminAuthService';

interface AdminLoginViewProps {
  onSuccess: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please enter your administrator email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { error } = await adminAuthService.signInWithPassword(email.trim(), password);

    if (error) {
      setErrorMessage(error.message || 'Invalid credentials or network failure.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>B</Text>
          </View>
          <Text style={styles.title}>BooffIn Administration</Text>
          <Text style={styles.subtitle}>Protected Infrastructure Console</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.inputLabel}>Admin Email</Text>
          <TextInput
            style={styles.input}
            placeholder="admin@booffin.com"
            placeholderTextColor={ADMIN_COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••••••"
            placeholderTextColor={ADMIN_COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Authenticate Admin Session</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Zero-Trust Protected • Stage 1 Isolated Environment
          </Text>
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
    width: '100%',
    maxWidth: 440,
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 16,
    padding: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: ADMIN_COLORS.textMuted,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: ADMIN_COLORS.dangerBg,
    borderColor: ADMIN_COLORS.dangerBorder,
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 18,
  },
  errorText: {
    color: ADMIN_COLORS.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: ADMIN_COLORS.textPrimary,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footer: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 18,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
  },
});
