// ============================================================================
// BOOFFIN ADMIN PORTAL — REAL TOTP MFA ENROLLMENT & CHALLENGE VIEW (STAGE 3A)
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ADMIN_COLORS } from '../lib/constants';
import { adminMfaService, TotpFactorEnrollmentResponse, MfaFactorSummary } from '../services/adminMfaService';
import { ShieldCheck, Key, Lock, LogOut, RefreshCw, AlertCircle } from 'lucide-react-native';

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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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

  // Clean raw SVG from Supabase data URI
  const cleanSvgXml = useMemo(() => {
    if (!enrollmentData?.totp?.qr_code) return '';
    let raw = enrollmentData.totp.qr_code.trim();
    
    // Strip data URI prefixes like data:image/svg+xml;utf-8, or data:image/svg+xml,
    if (raw.startsWith('data:image/svg+xml')) {
      const commaIdx = raw.indexOf(',');
      if (commaIdx !== -1) {
        raw = raw.substring(commaIdx + 1);
      }
    }
    
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // already decoded
    }

    return raw.trim();
  }, [enrollmentData]);

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
      <View style={[styles.card, isMobile && styles.cardMobile]}>
        {/* Top Header Badge */}
        <View style={styles.iconBadge}>
          <ShieldCheck size={24} color="#047857" />
        </View>

        <Text style={styles.title}>
          {mode === 'CHALLENGE' ? 'Two-Factor Authentication (AAL2)' : 'Enroll Authenticator App (MFA)'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'CHALLENGE'
            ? 'Enter the 6-digit security code from Google Authenticator to verify your administrator session.'
            : 'Scan the QR code below using Google Authenticator or Authy, then enter the 6-digit code.'}
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={14} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Enrollment QR Code Display */}
        {mode === 'ENROLL' && enrollmentData ? (
          <View style={styles.qrContainer}>
            {cleanSvgXml ? (
              <View style={styles.qrWrapper}>
                {Platform.OS === 'web' ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: cleanSvgXml }}
                    style={{ 
                      width: 180, 
                      height: 180, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      overflow: 'hidden'
                    }}
                  />
                ) : (
                  <SvgXml xml={cleanSvgXml} width={180} height={180} />
                )}
              </View>
            ) : (
              <View style={styles.qrLoadingBox}>
                <ActivityIndicator size="small" color="#047857" />
                <Text style={styles.qrLoadingText}>Generating QR Code...</Text>
              </View>
            )}

            {/* Manual Secret Fallback */}
            <TouchableOpacity
              style={styles.toggleSecretBtn}
              onPress={() => setShowManualSecret(!showManualSecret)}
              activeOpacity={0.7}
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
                  Keep this secret confidential. Enter it manually if unable to scan the QR code.
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
            placeholder="000 000"
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
            activeOpacity={0.75}
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
              activeOpacity={0.7}
            >
              <RefreshCw size={12} color="#047857" style={{ marginRight: 4 }} />
              <Text style={styles.switchModeText}>Register a New Authenticator Device</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading} activeOpacity={0.7}>
            <LogOut size={12} color={ADMIN_COLORS.textMuted} style={{ marginRight: 4 }} />
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
    backgroundColor: ADMIN_COLORS.bgCanvas,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardMobile: {
    padding: 20,
    borderRadius: 8,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    color: ADMIN_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    flex: 1,
  },
  qrContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  qrWrapper: {
    width: 206,
    height: 206,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  qrLoadingBox: {
    width: 206,
    height: 206,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  qrLoadingText: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
  },
  toggleSecretBtn: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  toggleSecretText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
  secretBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  secretLabel: {
    fontSize: 10.5,
    color: ADMIN_COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  secretText: {
    fontSize: 13,
    color: ADMIN_COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  secretWarn: {
    fontSize: 10.5,
    color: '#B45309',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
    marginBottom: 6,
    alignSelf: 'center',
  },
  otpInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: ADMIN_COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    width: '100%',
    maxWidth: 260,
    marginBottom: 14,
    fontFamily: 'monospace',
  },
  verifyBtn: {
    backgroundColor: '#047857',
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  switchModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  switchModeText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: ADMIN_COLORS.textMuted,
    fontSize: 11.5,
  },
  footer: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10.5,
    color: ADMIN_COLORS.textMuted,
  },
});
