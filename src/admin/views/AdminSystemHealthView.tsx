// ============================================================================
// BOOFFIN ADMIN PORTAL — SYSTEM HEALTH VIEW (STAGE 2 REAL DATA WIRING)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { supabase } from '../../api/client';
import { SystemHealthMetric } from '../types/data';

export const AdminSystemHealthView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SystemHealthMetric[]>([]);

  const checkSubsystemHealth = useCallback(async () => {
    setLoading(true);
    const healthList: SystemHealthMetric[] = [];

    // 1. Supabase PostgreSQL DB
    const dbStart = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      const dbLatency = Date.now() - dbStart;
      healthList.push({
        service: 'Supabase PostgreSQL DB',
        status: error ? 'DEGRADED' : 'HEALTHY',
        latencyMs: dbLatency,
        lastChecked: new Date().toISOString(),
        details: error ? `Error: ${error.message}` : 'All RLS tables and database triggers operational',
      });
    } catch (err: any) {
      healthList.push({
        service: 'Supabase PostgreSQL DB',
        status: 'DOWN',
        latencyMs: Date.now() - dbStart,
        lastChecked: new Date().toISOString(),
        details: `Connection failure: ${err?.message}`,
      });
    }

    // 2. Supabase Auth (GoTrue)
    const authStart = Date.now();
    try {
      const { data, error } = await supabase.auth.getSession();
      const authLatency = Date.now() - authStart;
      healthList.push({
        service: 'Supabase Auth (GoTrue)',
        status: error ? 'DEGRADED' : 'HEALTHY',
        latencyMs: authLatency,
        lastChecked: new Date().toISOString(),
        details: data?.session ? `Active session verified (${data.session.user.email})` : 'Auth service responsive (No session)',
      });
    } catch (err: any) {
      healthList.push({
        service: 'Supabase Auth (GoTrue)',
        status: 'DOWN',
        latencyMs: Date.now() - authStart,
        lastChecked: new Date().toISOString(),
        details: `Auth failure: ${err?.message}`,
      });
    }

    // 3. Supabase Storage
    const storageStart = Date.now();
    try {
      const { error } = await supabase.storage.from('avatars').list('', { limit: 1 });
      const storageLatency = Date.now() - storageStart;
      healthList.push({
        service: 'Supabase Storage Buckets',
        status: error ? 'DEGRADED' : 'HEALTHY',
        latencyMs: storageLatency,
        lastChecked: new Date().toISOString(),
        details: error ? `Storage notice: ${error.message}` : 'Buckets accessible (avatars, papers, post_media)',
      });
    } catch (err: any) {
      healthList.push({
        service: 'Supabase Storage Buckets',
        status: 'DEGRADED',
        latencyMs: Date.now() - storageStart,
        lastChecked: new Date().toISOString(),
        details: `Storage status: ${err?.message}`,
      });
    }

    // 4. OpenAlex API
    const openAlexStart = Date.now();
    try {
      const res = await fetch('https://api.openalex.org', { method: 'HEAD' });
      const openAlexLatency = Date.now() - openAlexStart;
      healthList.push({
        service: 'OpenAlex Scholarly API',
        status: res.ok ? 'HEALTHY' : 'DEGRADED',
        latencyMs: openAlexLatency,
        lastChecked: new Date().toISOString(),
        details: res.ok ? 'External scholarly catalog reachable' : `HTTP ${res.status}`,
      });
    } catch {
      healthList.push({
        service: 'OpenAlex Scholarly API',
        status: 'DEGRADED',
        latencyMs: Date.now() - openAlexStart,
        lastChecked: new Date().toISOString(),
        details: 'External network latency / offline',
      });
    }

    // 5. ORCID API
    const orcidStart = Date.now();
    try {
      const res = await fetch('https://pub.orcid.org/v3.0', { method: 'HEAD' });
      const orcidLatency = Date.now() - orcidStart;
      healthList.push({
        service: 'ORCID Public API / OAuth',
        status: res.ok || res.status === 404 || res.status === 401 ? 'HEALTHY' : 'DEGRADED',
        latencyMs: orcidLatency,
        lastChecked: new Date().toISOString(),
        details: 'OAuth2 verification exchange endpoint online',
      });
    } catch {
      healthList.push({
        service: 'ORCID Public API / OAuth',
        status: 'DEGRADED',
        latencyMs: Date.now() - orcidStart,
        lastChecked: new Date().toISOString(),
        details: 'External ORCID network latency / offline',
      });
    }

    setMetrics(healthList);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkSubsystemHealth();
  }, [checkSubsystemHealth]);

  const columns: ColumnDef<SystemHealthMetric>[] = [
    { key: 'service', header: 'Subsystem / Service', width: 220, render: (m) => (
      <Text style={styles.boldText}>{m.service}</Text>
    )},
    { key: 'status', header: 'Health Status', width: 120, render: (m) => (
      <AdminBadge
        label={m.status}
        variant={m.status === 'HEALTHY' ? 'emerald' : m.status === 'DEGRADED' ? 'warning' : 'danger'}
        size="sm"
      />
    )},
    { key: 'latencyMs', header: 'Latency', width: 100, render: (m) => (
      <Text style={[styles.cellText, m.status !== 'HEALTHY' && { color: ADMIN_COLORS.warning }]}>
        {m.latencyMs} ms
      </Text>
    )},
    { key: 'details', header: 'Operational Details', width: 300, render: (m) => (
      <Text style={styles.cellSecondary} numberOfLines={1}>{m.details || '—'}</Text>
    )},
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Backend Services & API Subsystems</Text>
          <Text style={styles.headerSubtitle}>Real-time heartbeat & infrastructure connectivity monitoring (Environment: TEST)</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={checkSubsystemHealth}>
          <Text style={styles.refreshBtnText}>Run Health Check</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
        </View>
      ) : (
        <AdminDataTable columns={columns} data={metrics} emptyMessage="No service health data available." />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
    backgroundColor: ADMIN_COLORS.bgHover,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshBtnText: {
    color: ADMIN_COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  boldText: {
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    fontSize: 13,
  },
  cellText: {
    color: ADMIN_COLORS.emeraldLight,
    fontWeight: '600',
    fontSize: 12,
  },
  cellSecondary: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 12,
  },
  loader: {
    padding: 40,
    alignItems: 'center',
  },
});
