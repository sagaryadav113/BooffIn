// ============================================================================
// BOOFFIN ADMIN PORTAL — ANALYTICS VIEW (STAGE 2 LIVE DATA)
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminStatCard } from '../components/AdminStatCard';
import { supabase } from '../../api/client';

export const AdminAnalyticsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userCount, setUserCount] = useState<number>(0);
  const [postCount, setPostCount] = useState<number>(0);
  const [reportCount, setReportCount] = useState<number>(0);
  const [collabCount, setCollabCount] = useState<number>(0);

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      try {
        const [users, posts, reports, collabs] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('posts').select('*', { count: 'exact', head: true }),
          supabase.from('reports').select('*', { count: 'exact', head: true }),
          supabase.from('collaboration_requests').select('*', { count: 'exact', head: true }),
        ]);

        setUserCount(users.count ?? 0);
        setPostCount(posts.count ?? 0);
        setReportCount(reports.count ?? 0);
        setCollabCount(collabs.count ?? 0);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.statsRow}>
        <AdminStatCard label="Total Profiles" value={userCount} subtext="Registered Researchers" variant="emerald" />
        <AdminStatCard label="Publications & Posts" value={postCount} subtext="Scientific articles & feeds" variant="default" />
        <AdminStatCard label="Moderation Tickets" value={reportCount} subtext="Total historical reports" variant={reportCount > 0 ? 'warning' : 'emerald'} />
        <AdminStatCard label="Collaborations" value={collabCount} subtext="Academic collaboration requests" variant="default" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Stage 2 Database Metrics (Environment: TEST)</Text>
        <Text style={styles.cardDesc}>
          Metrics are computed live from PostgreSQL tables via exact count queries. Detailed longitudinal analytics and event aggregations are scheduled for Stage 3.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 8,
    padding: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 18,
  },
});
