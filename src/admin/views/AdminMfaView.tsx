// ============================================================================
// BOOFFIN ADMIN PORTAL — REAL TOTP MFA ENROLLMENT & CHALLENGE VIEW (STAGE 3A)
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ADMIN_COLORS } from '../lib/constants';
import { adminMfaService, TotpFactorEnrollmentResponse, MfaFactorSummary } from '../services/adminMfaService';

interface AdminMfaViewProps {
  onVerified: () => void;
  onCancel: () => void;
  hasEnrolledFactor?: boolean;
}

export const AdminMfaView: React.FC<AdminMfaViewProps> = ({
  onVerified,
  onCancel,
  hasEnrolledFactor = false,
}) => {
  const [mode, setMode] = useState<'CHALLENGE' | 'ENROLL'>(hasEnrolledFactor ? 'CHALLENGE' : 'ENROLL');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Challenge mode state
  const [activeFactorId, setActiveFactorId] = useState<string | null>(null);

  // Enrollment mode state (strictly ephemeral; never persisted)
  const [enrollmentData, setEnrollmentData] = useState<TotpFactorEnrollmentResponse | null>(null);
  const [showManualSecret, setShowManualSecret] = useState(false);

  // 1. Initial factor discovery
  useEffect(() => {
    let isMounted = true;
    const fetchFactors = async () => {
      setLoading(true);
      setError(null);

      const { factors, error: listErr } = await adminMfaService.listFactors();
      if (!isMounted) return;

      if (listErr) {
        setError(`Failed to retrieve MFA factors: ${listErr.message}`);
        setLoading(false);
        return;
      }

      const verifiedFactor = factors.find((f: MfaFactorSummary) => f.status === 'verified');
      if (verifiedFactor) {
        setActiveFactorId(verifiedFactor.id);
        setMode('CHALLENGE');
      } else {
        setMode('ENROLL');
        // Automatically start enrollment if no verified factor exists
        const { data: enrollRes, error: enrollErr } = await adminMfaService.enrollTotp();
        if (enrollErr) {
          setError(`Unable to initiate TOTP enrollment: ${enrollErr.message}`);
        } else if (enrollRes) {
          setEnrollmentData(enrollRes);
          setActiveFactorId(enrollRes.id);
        }
      }
      setLoading(false);
    };

    fetchFactors();

    return () => {
      isMounted = false;
      // Wipe ephemeral enrollment secret on unmount
      setEnrollmentData(null);
    };
  }, []);

  // 2. Handle TOTP Verification (Challenge or Enrollment Verification)
  const handleVerify = async () => {
    const cleanCode = code.trim().replace(/[^0-9]/g, '');
    if (cleanCode.length !== 6) {
      setError('Please enter a valid 6-digit TOTP security code.');
      return;
    }

    if (!activeFactorId) {
      setError('No active MFA factor found. Please reload or restart enrollment.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: verifyErr } = await adminMfaService.challengeAndVerify({
      factorId: activeFactorId,
      code: cleanCode,
    });

    if (verifyErr) {
      setError(verifyErr.message || 'Verification failed. The code may be incorrect or expired.');
      setLoading(false);
      return;
    }

    // Ephemeral cleanup
    setEnrollmentData(null);
    setCode('');
    setLoading(false);

    // Elevated to AAL2
    onVerified();
  };

  // 3. Restart Enrollment
  const handleRestartEnrollment = async () => {
    setLoading(true);
    setError(null);
    setCode('');
    setEnrollmentData(null);

    const { data: enrollRes, error: enrollErr } = await adminMfaService.enrollTotp();
    if (enrollErr) {
      setError(`Enrollment failed: ${enrollErr.message}`);
    } else if (enrollRes) {
      setEnrollmentData(enrollRes);
      setActiveFactorId(enrollRes.id);
      setMode('ENROLL');
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconText}>🔐</Text>
        </View>

        <Text style={styles.title}>
          {mode === 'CHALLENGE' ? 'Two-Factor Authentication (AAL2)' : 'Enroll Authenticator App (MFA)'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'CHALLENGE'
            ? 'Enter the 6-digit security code from your registered authenticator app to upgrade to an AAL2 session.'
            : 'Scan the QR code below using Google Authenticator, 1Password, or Authy, then enter the generated 6-digit code.'}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Enrollment QR Code Display */}
        {mode === 'ENROLL' && enrollmentData ? (
          <View style={styles.qrContainer}>
            {enrollmentData.totp?.qr_code ? (
              <View style={styles.qrWrapper}>
                {Platform.OS === 'web' ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: enrollmentData.totp.qr_code }}
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  />
                ) : (
                  <SvgXml xml={enrollmentData.totp.qr_code} width={180} height={180} />
                )}
              </View>
            ) : null}

            {/* Manual Secret Fallback */}
            <TouchableOpacity
              style={styles.toggleSecretBtn}
              onPress={() => setShowManualSecret(!showManualSecret)}
            >
              <Text style={styles.toggleSecretText}>
                {showManualSecret ? 'Hide Manual Setup Key' : 'Show Manual Setup Key'}
              </Text>
            </TouchableOpacity>

            {showManualSecret && enrollmentData.totp?.secret ? (
              <View style={styles.secretBox}>
                <Text style={styles.secretLabel}>Manual Secret Key:</Text>
                <Text style={styles.secretText} selectable>
                  {enrollmentData.totp.secret}
                </Text>
                <Text style={styles.secretWarn}>
                  ⚠️ Keep this secret confidential. Do not share or log it.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* OTP Input Form */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>6-Digit Security Code</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor={ADMIN_COLORS.textMuted}
            value={code}
            onChangeText={(t) => {
              setCode(t.replace(/[^0-9]/g, ''));
              setError(null);
            }}
            maxLength={6}
            keyboardType="number-pad"
            autoFocus
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyBtnText}>
                {mode === 'CHALLENGE' ? 'Verify & Elevate to AAL2' : 'Verify & Complete Enrollment'}
              </Text>
            )}
          </TouchableOpacity>

          {mode === 'CHALLENGE' && (
            <TouchableOpacity
              style={styles.switchModeBtn}
              onPress={handleRestartEnrollment}
              disabled={loading}
            >
              <Text style={styles.switchModeText}>Register a New Authenticator Device</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
            <Text style={styles.cancelBtnText}>Sign Out of Admin Console</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Supabase TOTP Authenticator Engine • RFC 6238 Standard
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: ADMIN_COLORS.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ADMIN_COLORS.emeraldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 24,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: ADMIN_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },
  errorBox: {
    backgroundColor: ADMIN_COLORS.dangerBg,
    borderColor: ADMIN_COLORS.dangerBorder,
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 18,
    width: '100%',
  },
  errorText: {
    color: ADMIN_COLORS.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  qrContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 18,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  toggleSecretBtn: {
    paddingVertical: 6,
    marginBottom: 10,
  },
  toggleSecretText: {
    color: ADMIN_COLORS.actionBlue,
    fontSize: 13,
    fontWeight: '600',
  },
  secretBox: {
    width: '100%',
    backgroundColor: ADMIN_COLORS.bgPrimary,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  secretLabel: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  secretText: {
    fontSize: 14,
    color: ADMIN_COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  secretWarn: {
    fontSize: 11,
    color: ADMIN_COLORS.warning,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  otpInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderStrong,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: ADMIN_COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    width: '100%',
    marginBottom: 18,
  },
  verifyBtn: {
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  switchModeBtn: {
    paddingVertical: 8,
    marginBottom: 6,
  },
  switchModeText: {
    color: ADMIN_COLORS.actionBlue,
    fontSize: 13,
    fontWeight: '500',
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: ADMIN_COLORS.textMuted,
    fontSize: 12,
  },
  footer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
  },
});
