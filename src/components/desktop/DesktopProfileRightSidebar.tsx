import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import {
  Activity,
  ArrowRight,
  Edit2,
  Globe,
  ExternalLink,
  BookOpen,
  Repeat2,
  Bookmark,
  UserPlus,
  MessageSquare,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { UserProfile } from '../../types';

interface DesktopProfileRightSidebarProps {
  user: UserProfile | null;
  onOpenAnalytics?: () => void;
  onEditProfile?: () => void;
}

export const DesktopProfileRightSidebar: React.FC<DesktopProfileRightSidebarProps> = ({
  user,
  onOpenAnalytics,
  onEditProfile,
}) => {
  const fields = [user?.primaryField, ...(user?.secondaryFields || [])].filter(Boolean);
  const interests = user?.researchInterests || [];

  return (
    <aside style={{ width: 320, minWidth: 320 }}>
      <View style={styles.container}>
        {/* 1. Research Impact Card */}
        <View style={styles.card}>
          <View style={styles.impactHeader}>
            <View style={styles.impactTitleRow}>
              <View style={styles.impactIconBadge}>
                <Activity size={16} color="#064E3B" strokeWidth={2.4} />
              </View>
              <Text style={styles.cardTitle}>Research Impact</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onOpenAnalytics}
              style={styles.viewAnalyticsBtn}
            >
              <Text style={styles.viewAnalyticsText}>View Analytics</Text>
              <ArrowRight size={12} color="#064E3B" />
            </TouchableOpacity>
          </View>

          <View style={styles.impactBody}>
            <Text style={styles.impactStatNumber}>1.2K</Text>
            <Text style={styles.impactStatLabel}>Views (last 28d)</Text>
          </View>

          <View style={styles.sparklineContainer}>
            {[35, 42, 38, 55, 60, 48, 70, 65, 80, 75, 90, 85, 95, 100].map((val, idx) => (
              <View
                key={idx}
                style={[
                  styles.sparklineBar,
                  {
                    height: (val / 100) * 28,
                    backgroundColor: idx >= 10 ? '#064E3B' : '#CBD5E1',
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* 2. About Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>About</Text>
            {onEditProfile && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onEditProfile}
                style={styles.editAction}
              >
                <Edit2 size={12} color="#64748B" />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.aboutList}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Research Fields</Text>
              <Text style={styles.aboutValue}>
                {fields.length > 0 ? fields.join(' · ') : 'Not specified'}
              </Text>
            </View>

            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Institution</Text>
              <Text style={styles.aboutValue}>
                {user?.institution || 'Academic Institution'}
              </Text>
            </View>

            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Website</Text>
              <Text style={styles.aboutValue}>
                {user?.websiteUrl ? user.websiteUrl : 'Add website'}
              </Text>
            </View>

            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>ORCID</Text>
              <Text style={styles.aboutValue}>
                {user?.orcidId ? user.orcidId : 'Add your ORCID'}
              </Text>
            </View>

            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Google Scholar</Text>
              <Text style={styles.aboutValue}>
                {user?.googleScholarUrl ? 'Connected' : 'Add profile'}
              </Text>
            </View>

            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>ResearchGate</Text>
              <Text style={styles.aboutValue}>
                {user?.researchgateUrl ? 'Connected' : 'Add profile'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Research Interests */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Research Interests</Text>
            {onEditProfile && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onEditProfile}
                style={styles.editAction}
              >
                <Edit2 size={12} color="#64748B" />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.chipsWrap}>
            {interests.length > 0 ? (
              interests.map((interest, idx) => (
                <View key={idx} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{interest}</Text>
                </View>
              ))
            ) : (
              ['Neural circuits', 'Brain aging', 'Single-cell genomics', 'Computational neuroscience'].map((item, idx) => (
                <View key={idx} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{item}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* 4. Recent Activity */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/profile?tab=Activity')}
              style={styles.seeAllRow}
            >
              <Text style={styles.seeAllText}>View all</Text>
              <ArrowRight size={12} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <Repeat2 size={15} color="#059669" />
              <View style={styles.activityMeta}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  Reposted a discussion
                </Text>
                <Text style={styles.activityTime}>1d ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <Bookmark size={15} color="#2563EB" />
              <View style={styles.activityMeta}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  Saved a paper
                </Text>
                <Text style={styles.activityTime}>3d ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <UserPlus size={15} color="#D97706" />
              <View style={styles.activityMeta}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  Followed a researcher
                </Text>
                <Text style={styles.activityTime}>5d ago</Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <MessageSquare size={15} color="#9333EA" />
              <View style={styles.activityMeta}>
                <Text style={styles.activityTitle} numberOfLines={1}>
                  Commented on a paper
                </Text>
                <Text style={styles.activityTime}>1w ago</Text>
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
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  impactTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  impactIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#EAF3EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAnalyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF3EE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  viewAnalyticsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#064E3B',
  },
  impactBody: {
    marginBottom: 12,
  },
  impactStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  impactStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 32,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  editAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  aboutList: {
    gap: 10,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  aboutLabel: {
    fontSize: 12.5,
    color: '#64748B',
    width: 100,
  },
  aboutValue: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  interestChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  activityList: {
    gap: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityMeta: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#1E293B',
  },
  activityTime: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
});
