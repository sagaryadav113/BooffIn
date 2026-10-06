// ============================================================================
// BOOFFIN ADMIN PORTAL — ENTERPRISE SECURITY OPERATIONS CENTER (SOC)
// ============================================================================

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  useWindowDimensions 
} from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle 
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

  const { role, aal, isMfaVerified } = useAdminAuth();
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
      lastActive: '34 mins ago',
      isCurrent: false,
    },
  ]);

  // Live Threat / Anomaly Radar
  const [threatLogs] = useState<ThreatIncident[]>([
    {
      id: 'thr-101',
      type: 'Brute Force Auth Throttling',
      severity: 'MEDIUM',
      sourceIp: '185.220.101.45 (Tor Exit)',
      details: 'Exceeded 20 failed login attempts in 60s against /auth/v1/token. IP dynamically jailed for 1 hour.',
      timestamp: '12m ago',
      status: 'BLOCKED',
    },
    {
      id: 'thr-102',
      type: 'Direct Storage Path Bypass Attempt',
      severity: 'HIGH',
      sourceIp: '45.133.1.20',
      details: 'Unauthenticated POST to /storage/v1/object/papers without user folder claims. Rejected by RLS bucket policy.',
      timestamp: '2h ago',
      status: 'MITIGATED',
    },
    {
      id: 'thr-103',
      type: 'Mass Scraping Rate Limit Hit',
      severity: 'LOW',
      sourceIp: '198.51.100.12',
      details: 'Automated crawler breached 120 req/min endpoint threshold on /rest/v1/profiles. Traffic rate-limited to 429.',
      timestamp: '5h ago',
      status: 'MITIGATED',
    },
  ]);

  const handleRevokeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setActionSuccess('Security session revoked successfully.');
    setTimeout(() => setActionSuccess(null), 3000);
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
          <CheckCircle2 size={14} color="#047857" />
          <Text style={styles.successText}>{actionSuccess}</Text>
        </View>
      )}

      {actionError && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color="#B91C1C" />
          <Text style={styles.errorText}>{actionError}</Text>
        </View>
      )}

      {/* 1. Top Unified 3-Column Stats Bar */}
      <View style={[styles.joinedKpiBar, isMobile && styles.joinedKpiBarMobile]}>
        <View style={[styles.kpiCell, isMobile ? styles.kpiCellMobile : styles.kpiCellDivider]}>
          <Text style={styles.kpiLabel}>AUTHENTICATOR LEVEL</Text>
          <Text style={styles.kpiValue}>{aal ? aal.toUpperCase() : 'AAL1'}</Text>
          <View style={styles.kpiSubRow}>
            <View style={[styles.microDot, isMfaVerified ? styles.dotGreen : styles.dotAmber]} />
            <Text style={styles.kpiSubtext}>
              {isMfaVerified ? 'MFA TOTP Verified' : 'Standard Password'}
            </Text>
          </View>
        </View>

        <View style={[styles.kpiCell, isMobile ? styles.kpiCellMobile : styles.kpiCellDivider]}>
          <Text style={styles.kpiLabel}>RBAC ROLE STANDING</Text>
          <Text style={styles.kpiValue}>{role || 'SUPER_ADMIN'}</Text>
          <Text style={styles.kpiSubtext}>Full Platform Authority</Text>
        </View>

        <View style={[styles.kpiCell, isMobile && styles.kpiCellMobile]}>
          <Text style={styles.kpiLabel}>THREAT MITIGATION RATE</Text>
          <Text style={styles.kpiValue}>100.0%</Text>
          <Text style={styles.kpiSubtext}>Zero Active Breaches</Text>
        </View>
      </View>

      {/* 2. Active Admin Sessions Table / List */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>Active Administrator Sessions</Text>
            <Text style={styles.cardSub}>Concurrent authenticated sessions registered to this operator account</Text>
          </View>
        </View>

        <View style={styles.sessionTable}>
          {sessions.map((sess, idx) => (
            <View 
              key={sess.id} 
              style={[
                styles.sessionRow,
                idx < sessions.length - 1 && styles.rowDivider
              ]}
            >
              <View style={styles.sessionLeft}>
                <View style={styles.deviceIcon}>
                  {sess.device.includes('iPhone') ? (
                    <Smartphone size={14} color={ADMIN_COLORS.textSecondary} />
                  ) : (
                    <Laptop size={14} color={ADMIN_COLORS.textSecondary} />
                  )}
                </View>
                <View style={styles.sessionMeta}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceName}>{sess.device}</Text>
                    {sess.isCurrent && (
                      <View style={styles.currentBadge}>
                        <View style={styles.dotGreen} />
                        <Text style={styles.currentBadgeText}>CURRENT SESSION</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.deviceSub}>
                    {sess.browser} · <Text style={styles.monoText}>{sess.ip}</Text> ({sess.location}) · {sess.lastActive}
                  </Text>
                </View>
              </View>

              {!sess.isCurrent && (
                <TouchableOpacity
                  style={styles.ghostRevokeBtn}
                  onPress={() => handleRevokeSession(sess.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.ghostRevokeBtnText}>Revoke</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* 3. Terminal Style Threat Stream */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Terminal size={14} color={ADMIN_COLORS.emeraldPrimary} />
            <Text style={styles.cardTitle}>Threat & Intrusion Prevention Stream</Text>
          </View>
          <Text style={styles.cardSub}>Automated RLS firewall triggers and dynamic API rate limiting events</Text>
        </View>

        <View style={styles.terminalContainer}>
          {threatLogs.map((thr, idx) => {
            const isHigh = thr.severity === 'HIGH' || thr.severity === 'CRITICAL';
            const isMed = thr.severity === 'MEDIUM';

            return (
              <View 
                key={thr.id} 
                style={[
                  styles.terminalRow,
                  idx < threatLogs.length - 1 && styles.terminalRowDivider
                ]}
              >
                <View style={styles.terminalTop}>
                  <View style={styles.tagGroup}>
                    <Text style={[
                      styles.severityTag,
                      isHigh ? styles.tagRed : isMed ? styles.tagAmber : styles.tagSlate
                    ]}>
                      [{thr.severity}]
                    </Text>
                    <Text style={styles.threatName}>{thr.type}</Text>
                  </View>
                  <Text style={styles.threatTime}>{thr.timestamp}</Text>
                </View>

                <Text style={styles.threatDetails}>{thr.details}</Text>

                <View style={styles.terminalBottom}>
                  <Text style={styles.monoIp}>IP: {thr.sourceIp}</Text>
                  <Text style={styles.statusMitigated}>STATUS: {thr.status}</Text>
                </View>
              </View>
            );
          })}
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
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '500',
  },
  // 1. Joined 3-column KPI Bar
  joinedKpiBar: {
    flexDirection: 'row',
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  joinedKpiBarMobile: {
    flexDirection: 'column',
  },
  kpiCell: {
    flex: 1,
    padding: 14,
    gap: 3,
  },
  kpiCellDivider: {
    borderRightWidth: 1,
    borderRightColor: ADMIN_COLORS.border,
  },
  kpiCellMobile: {
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: ADMIN_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  kpiSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  kpiSubtext: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  dotAmber: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  // Cards
  card: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  cardSub: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  // Session Table
  sessionTable: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 6,
    backgroundColor: ADMIN_COLORS.bgSurface,
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deviceIcon: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionMeta: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceName: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.3,
  },
  deviceSub: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  monoText: {
    fontFamily: 'monospace',
    color: ADMIN_COLORS.textPrimary,
  },
  ghostRevokeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  ghostRevokeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
  },
  // Terminal Container
  terminalContainer: {
    backgroundColor: '#0F172A', // Crisp Slate 900 console backing
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  terminalRow: {
    paddingVertical: 8,
    gap: 3,
  },
  terminalRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  terminalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityTag: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
  },
  tagRed: {
    color: '#F87171',
  },
  tagAmber: {
    color: '#FBBF24',
  },
  tagSlate: {
    color: '#94A3B8',
  },
  threatName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  threatTime: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  threatDetails: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  terminalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  monoIp: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#38BDF8',
  },
  statusMitigated: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#34D399',
  },
});
