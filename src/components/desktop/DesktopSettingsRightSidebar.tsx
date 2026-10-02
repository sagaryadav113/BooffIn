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
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchUserAnalytics } from '../../api/analyticsService';
import { UserAnalyticsSummary } from '../../types/analytics';

export const DesktopSettingsRightSidebar: React.FC = () => {
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
    <aside style={{ width: 320, minWidth: 320 }}>
      <View style={styles.container}>
        {/* User Real Profile Preview Card */}
        <View style={styles.profileCard}>
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
          <View style={styles.avatarWrap}>
            <Avatar
              uri={currentUser?.avatarUrl}
              name={currentUser?.fullName || currentUser?.handle || 'User'}
              size="lg"
            />
          </View>

          {/* Info */}
          <View style={styles.infoSection}>
            <View style={styles.nameRow}>
              <Text style={styles.fullName} numberOfLines={1}>
                {currentUser?.fullName || currentUser?.handle || 'Academic Researcher'}
              </Text>
              {currentUser?.orcidVerified && (
                <CheckCircle2 size={15} color="#064E3B" fill="#EAF3EE" />
              )}
            </View>

            <Text style={styles.handle}>@{currentUser?.handle || 'scholar'}</Text>

            <Text style={styles.headline} numberOfLines={2}>
              {[currentUser?.academicTitle, currentUser?.institution]
                .filter(Boolean)
                .join(' · ') || 'Researcher on BooffIn'}
            </Text>

            {currentUser?.bio ? (
              <Text style={styles.bioText} numberOfLines={3}>
                {currentUser.bio}
              </Text>
            ) : null}

            {/* Location & Joined Date */}
            <View style={styles.metaRow}>
              {currentUser?.location && (
                <View style={styles.metaItem}>
                  <MapPin size={12} color="#64748B" />
                  <Text style={styles.metaText}>{currentUser.location}</Text>
                </View>
              )}
              {currentUser?.joinedDate && (
                <View style={styles.metaItem}>
                  <Calendar size={12} color="#64748B" />
                  <Text style={styles.metaText}>Joined {currentUser.joinedDate}</Text>
                </View>
              )}
            </View>

            {/* Impact Bar */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.impactBar}
            >
              <View style={styles.impactLeft}>
                <Activity size={15} color="#064E3B" />
                <View>
                  <Text style={styles.impactTitle}>RESEARCH IMPACT</Text>
                  <Text style={styles.impactCount}>
                    {analytics?.totalViews ? `${analytics.totalViews}` : '0'} Views (last 28d)
                  </Text>
                </View>
              </View>
              <ArrowRight size={14} color="#064E3B" />
            </TouchableOpacity>

            {/* Real Database Profile Counts */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {currentUser?.followingCount ?? 0}
                </Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {currentUser?.followersCount ?? 0}
                </Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {currentUser?.postsCount ?? 0}
                </Text>
                <Text style={styles.statLabel}>Posts & Shares</Text>
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
