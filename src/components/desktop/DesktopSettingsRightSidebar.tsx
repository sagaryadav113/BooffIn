import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import {
  MapPin,
  Calendar,
  Activity,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react-native';
import { colors as staticColors, radii, spacing, typography, useColors, useIsDark } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchUserAnalytics } from '../../api/analyticsService';
import { UserAnalyticsSummary } from '../../types/analytics';

export const DesktopSettingsRightSidebar: React.FC = () => {
  const colors = useColors();
  const isDark = useIsDark();
  const currentUser = useAuthStore((s) => s.user);
  const [analytics, setAnalytics] = useState<UserAnalyticsSummary | null>(null);

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserAnalytics(currentUser.id, '28d').then(({ summary }) => {
        if (summary) setAnalytics(summary);
      });
    }
  }, [currentUser?.id]);

  return (
    <aside
      style={{
        width: 320,
        minWidth: 320,
        position: 'sticky',
        top: 68,
        height: 'calc(100vh - 68px)',
        alignSelf: 'flex-start',
        overflowY: 'auto',
      }}
    >
      <View style={styles.container}>
        {/* User Real Profile Preview Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
          {/* Banner */}
          <View style={styles.bannerWrap}>
            {currentUser?.bannerUrl ? (
              <Image
                source={{ uri: currentUser.bannerUrl }}
                style={styles.bannerImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.bannerFallback} />
            )}
          </View>

          {/* Avatar */}
          <View style={[styles.avatarWrap, { borderColor: colors.cardBackground }]}>
            <Avatar
              uri={currentUser?.avatarUrl}
              name={currentUser?.fullName || currentUser?.handle || 'User'}
              size="lg"
            />
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <View style={styles.nameRow}>
              <Text style={[styles.fullName, { color: colors.textPrimary }]} numberOfLines={1}>
                {currentUser?.fullName || currentUser?.handle || 'Academic Researcher'}
              </Text>
              {currentUser?.orcidVerified && (
                <CheckCircle2 size={15} color={isDark ? "#34D399" : "#064E3B"} fill={isDark ? "rgba(16, 185, 129, 0.2)" : "#EAF3EE"} />
              )}
            </View>

            <Text style={[styles.handle, { color: colors.textSecondary }]}>@{currentUser?.handle || 'scholar'}</Text>

            <Text style={[styles.headline, { color: colors.textSecondary }]} numberOfLines={2}>
              {[currentUser?.academicTitle, currentUser?.institution]
                .filter(Boolean)
                .join(' · ') || 'Researcher on BooffIn'}
            </Text>

            {currentUser?.bio ? (
              <Text style={[styles.bioText, { color: colors.textSecondary }]} numberOfLines={3}>
                {currentUser.bio}
              </Text>
            ) : null}

            {/* Location & Joined Date */}
            <View style={styles.metaRow}>
              {currentUser?.location && (
                <View style={styles.metaItem}>
                  <MapPin size={12} color="#64748B" />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>{currentUser.location}</Text>
                </View>
              )}
              {currentUser?.joinedDate && (
                <View style={styles.metaItem}>
                  <Calendar size={12} color="#64748B" />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>Joined {currentUser.joinedDate}</Text>
                </View>
              )}
            </View>

            {/* Impact Bar */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/profile/analytics')}
              style={[styles.impactBar, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#EAF3EE' }]}
            >
              <View style={styles.impactLeft}>
                <Activity size={15} color={isDark ? "#34D399" : "#064E3B"} />
                <View>
                  <Text style={[styles.impactTitle, { color: isDark ? "#34D399" : "#064E3B" }]}>RESEARCH IMPACT</Text>
                  <Text style={[styles.impactCount, { color: isDark ? "#34D399" : "#064E3B" }]}>
                    {(analytics?.totalImpressions ?? analytics?.totalViews ?? 0).toLocaleString()} Impressions (last 28d)
                  </Text>
                </View>
              </View>
              <ArrowRight size={14} color={isDark ? "#34D399" : "#064E3B"} />
            </TouchableOpacity>

            {/* Real Database Profile Counts */}
            <View style={[styles.statsRow, { borderTopColor: colors.borderLight }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {currentUser?.followingCount ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {currentUser?.followersCount ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {currentUser?.postsCount ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts & Shares</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </aside>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerWrap: {
    height: 80,
    width: '100%',
    backgroundColor: '#064E3B',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#064E3B',
  },
  avatarWrap: {
    marginTop: -28,
    marginLeft: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  infoSection: {
    padding: 16,
    paddingTop: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  handle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  headline: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#334155',
    marginTop: 6,
  },
  bioText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
  },
  impactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.lg,
    marginTop: 14,
  },
  impactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: 0.6,
  },
  impactCount: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#064E3B',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
});
