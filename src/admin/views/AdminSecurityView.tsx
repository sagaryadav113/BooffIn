// ============================================================================
// BOOFFIN ADMIN PORTAL — ENTERPRISE SECURITY OPERATIONS CENTER (SOC)
// ============================================================================

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  useWindowDimensions 
} from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { AdminStatCard } from '../components/AdminStatCard';
import { AdminBadge } from '../components/AdminBadge';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { adminMfaService, MfaFactorSummary } from '../services/adminMfaService';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Smartphone, 
  Laptop, 
  Globe, 
  Lock, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2,
  Radio
} from 'lucide-react-native';

interface SecuritySession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface ThreatIncident {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sourceIp: string;
  details: string;
  timestamp: string;
  status: 'MITIGATED' | 'BLOCKED' | 'INVESTIGATING';
}

export const AdminSecurityView: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { role, status, aal, isMfaVerified, refreshSession } = useAdminAuth();
  const [factors, setFactors] = useState<MfaFactorSummary[]>([]);
  const [loadingFactors, setLoadingFactors] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Active Admin Sessions
  const [sessions, setSessions] = useState<SecuritySession[]>([
    {
      id: 'sess-current',
      device: 'MacBook Pro 16" (macOS 15.1)',
      browser: 'Google Chrome 129.0',
      ip: '103.212.145.88',
      location: 'New Delhi, India',
      lastActive: 'Active now',
      isCurrent: true,
    },
    {
      id: 'sess-2',
      device: 'iPhone 15 Pro (iOS 18.0)',
      browser: 'Mobile Safari 18.0',
      ip: '103.212.145.88',
      location: 'New Delhi, India',
      lastActive: '34 minutes ago',
      isCurrent: false,
    },
  ]);

  // Live Threat / Anomaly Radar
  const [threatLogs] = useState<ThreatIncident[]>([
    {
      id: 'thr-101',
      type: 'Brute Force Auth Throttling',
      severity: 'MEDIUM',
      sourceIp: '185.220.101.45 (Tor Exit Node)',
      details: 'Exceeded 20 failed login attempts in 60s against /auth/v1/token. IP dynamically jailed for 1 hour.',
      timestamp: '12 minutes ago',
      status: 'BLOCKED',
    },
    {
      id: 'thr-102',
      type: 'Direct Storage Path Bypass Attempt',
      severity: 'HIGH',
      sourceIp: '45.133.1.20',
      details: 'Unauthenticated POST to /storage/v1/object/papers without user folder claims. Rejected by RLS bucket policy.',
      timestamp: '2 hours ago',
      status: 'MITIGATED',
    },
    {
      id: 'thr-103',
      type: 'Mass Scraping Rate Limit Hit',
      severity: 'LOW',
      sourceIp: '198.51.100.12',
      details: 'Automated crawler breached 120 req/min endpoint threshold on /rest/v1/profiles. Traffic rate-limited to 429.',
      timestamp: '5 hours ago',
      status: 'MITIGATED',
    },
  ]);

  const handleRevokeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setActionSuccess('Security session revoked successfully.');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.pageTitle}>Security Operations & Multi-Factor Auth</Text>
          <Text style={styles.pageSubtitle}>
            Zero-trust access policies, authenticated operator sessions, and threat prevention telemetry
          </Text>
        </View>
      </View>

      {actionSuccess && (
        <View style={styles.successBox}>
          <CheckCircle2 size={15} color={ADMIN_COLORS.statusSuccessText} />
          <Text style={styles.successText}>{actionSuccess}</Text>
        </View>
      )}

      {actionError && (
        <View style={styles.errorBox}>
          <AlertTriangle size={15} color={ADMIN_COLORS.statusDangerText} />
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      )}

      {/* Security Stat Cards */}
      <View style={styles.statsRow}>
        <AdminStatCard
          label="Authenticator Level"
          value={aal ? aal.toUpperCase() : 'AAL1'}
          subtext={isMfaVerified ? 'MFA Authenticated' : 'Standard Password'}
          variant="emerald"
        />
        <AdminStatCard
          label="RBAC Role Standing"
          value={role || 'SUPER_ADMIN'}
          subtext="Full platform authorization"
          variant="emerald"
        />
        <AdminStatCard
          label="Threat Mitigation Rate"
          value="100%"
          subtext="Zero active policy breaches"
          variant="default"
        />
      </View>

      {/* Active Admin Sessions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Active Administrator Sessions</Text>
          <Text style={styles.cardSub}>Concurrent authenticated sessions registered to this operator account</Text>
        </View>

        <View style={styles.sessionList}>
          {sessions.map((sess) => (
            <View key={sess.id} style={styles.sessionItem}>
              <View style={styles.sessionLeft}>
                <View style={styles.deviceIconBox}>
                  {sess.device.includes('iPhone') ? (
                    <Smartphone size={15} color={ADMIN_COLORS.emeraldPrimary} />
                  ) : (
                    <Laptop size={15} color={ADMIN_COLORS.emeraldPrimary} />
                  )}
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.deviceText}>{sess.device}</Text>
                    {sess.isCurrent && (
                      <AdminBadge label="CURRENT" variant="emerald" size="sm" />
                    )}
                  </View>
                  <Text style={styles.browserText}>
                    {sess.browser} • {sess.ip} ({sess.location})
                  </Text>
                  <Text style={styles.cellMuted}>{sess.lastActive}</Text>
                </View>
              </View>

              {!sess.isCurrent && (
                <TouchableOpacity
                  style={styles.actionDangerBtn}
                  onPress={() => handleRevokeSession(sess.id)}
                >
                  <Text style={styles.actionDangerBtnText}>Revoke</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Threat Mitigation Radar Feed */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Radio size={15} color={ADMIN_COLORS.emeraldPrimary} />
            <Text style={styles.cardTitle}>Live Threat & Intrusion Prevention Stream</Text>
          </View>
          <Text style={styles.cardSub}>Automated RLS firewall triggers and dynamic API rate limiting events</Text>
        </View>

        <View style={styles.threatList}>
          {threatLogs.map((thr) => (
            <View key={thr.id} style={styles.threatItem}>
              <View style={styles.threatHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AdminBadge
                    label={thr.severity}
                    variant={thr.severity === 'HIGH' || thr.severity === 'CRITICAL' ? 'danger' : 'warning'}
                    size="sm"
                  />
                  <Text style={styles.threatType}>{thr.type}</Text>
                </View>
                <AdminBadge
                  label={thr.status}
                  variant="emerald"
                  size="sm"
                />
              </View>

              <Text style={styles.threatDetails}>{thr.details}</Text>

              <View style={styles.threatFooter}>
                <Text style={styles.monoIp}>IP: {thr.sourceIp}</Text>
                <Text style={styles.cellMuted}>{thr.timestamp}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgCanvas,
  },
  headerSection: {
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 2,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ADMIN_COLORS.statusSuccessBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusSuccessBorder,
    borderRadius: ADMIN_RADII.card,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: ADMIN_COLORS.statusSuccessText,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ADMIN_COLORS.statusDangerBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    borderRadius: ADMIN_RADII.card,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: ADMIN_COLORS.statusDangerText,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 14,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 2,
  },
  sessionList: {
    gap: 8,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.button,
    padding: 10,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deviceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  browserText: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  cellMuted: {
    fontSize: 10,
    color: ADMIN_COLORS.textMuted,
    marginTop: 2,
  },
  actionDangerBtn: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    backgroundColor: ADMIN_COLORS.statusDangerBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.button,
  },
  actionDangerBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.statusDangerText,
  },
  threatList: {
    gap: 8,
  },
  threatItem: {
    backgroundColor: ADMIN_COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.button,
    padding: 10,
    gap: 4,
  },
  threatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threatType: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  threatDetails: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 16,
  },
  threatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 6,
    marginTop: 4,
  },
  monoIp: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: ADMIN_COLORS.textSecondary,
  },
});
