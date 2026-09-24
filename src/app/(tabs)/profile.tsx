import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  MapPin,
  Globe,
  ExternalLink,
  Share2,
  Settings,
  Edit3,
  BookOpen,
  Calendar,
  CheckCircle2,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../../components/core/Avatar';
import { Button } from '../../components/core/Button';
import { IconButton } from '../../components/core/IconButton';
import { Typography } from '../../components/core/Typography';
import { TopicChip } from '../../components/core/TopicChip';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PostCard } from '../../components/cards/PostCard';
import { TrendingPaperCard } from '../../components/cards/TrendingPaperCard';
import { useAuthStore } from '../../store/useAuthStore';
import { usePostStore } from '../../store/usePostStore';
import { usePaperStore } from '../../store/usePaperStore';

export default function CurrentUserProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const posts = usePostStore((s) => s.getPostsByUser(user.id));
  const papers = usePaperStore((s) => s.papers);
  const savedPaperIds = usePaperStore((s) => s.savedPaperIds);

  const [activeSubTab, setActiveSubTab] = useState<'Posts' | 'Saved' | 'Cited' | 'Activity'>('Posts');

  const savedPapers = papers.filter((p) => savedPaperIds.has(p.id) || p.isSaved);

  const handleOpenOrcid = () => {
    if (user.orcidId) {
      Linking.openURL(`https://orcid.org/${user.orcidId}`);
    }
  };

  const handleOpenWebsite = () => {
    if (user.websiteUrl) {
      const url = user.websiteUrl.startsWith('http') ? user.websiteUrl : `https://${user.websiteUrl}`;
      Linking.openURL(url);
    }
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `${user.fullName} (@${user.handle}) on BooffIn - Academic Profile & Research Discussions`,
      });
    } catch {}
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return `${count}`;
  };

  const cleanWebsiteDomain = user.websiteUrl
    ? user.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
            }}
            style={styles.bannerImage}
            contentFit="cover"
          />
          <View style={styles.bannerNav}>
            <View />
            <View style={styles.bannerActions}>
              <IconButton
                icon="Share2"
                size="sm"
                variant="filled"
                color={colors.white}
                onPress={handleShareProfile}
                style={styles.bannerIconButton}
              />
              <IconButton
                icon="Settings"
                size="sm"
                variant="filled"
                color={colors.white}
                onPress={() => router.push('/settings')}
                style={styles.bannerIconButton}
              />
            </View>
          </View>
        </View>

        {/* Profile Info Header */}
        <View style={styles.profileHeader}>
          {/* Avatar & Edit Profile Action */}
          <View style={styles.avatarActionRow}>
            <Avatar
              url={user.avatarUrl}
              name={user.fullName}
              size={84}
              verified={user.orcidVerified}
              style={styles.avatarOverBanner}
            />

            <Button
              title="Edit Profile"
              variant="outline"
              size="sm"
              onPress={() => router.push('/profile/edit')}
              style={styles.editButton}
            />
          </View>

          {/* Name & Handle */}
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.fullName}>{user.fullName}</Text>
              {user.orcidVerified && (
                <View style={styles.verifiedTag}>
                  <CheckCircle2 size={15} color={colors.accentGreen} />
                  <Text style={styles.verifiedText}>ORCID Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.handle}>@{user.handle}</Text>
          </View>

          {/* Academic Role & Institution */}
          <View style={styles.roleBox}>
            <Text style={styles.roleTitle}>{user.academicTitle}</Text>
            {user.institution && (
              <Text style={styles.institutionText}>{user.institution}</Text>
            )}
          </View>

          {/* Bio / Description */}
          {user.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : null}

          {/* Research Interests Chips */}
          {user.researchInterests && user.researchInterests.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.interestsLabel}>Research Interests:</Text>
              <View style={styles.interestsRow}>
                {user.researchInterests.map((interest) => (
                  <TopicChip
                    key={interest}
                    label={interest}
                    size="sm"
                    onPress={() =>
                      router.push({
                        pathname: '/topic/[slug]',
                        params: { slug: interest.toLowerCase().replace(/\s+/g, '-') },
                      })
                    }
                  />
                ))}
              </View>
            </View>
          )}

          {/* Metadata: Country, Location, ORCID, Website, Joined */}
          <View style={styles.metaContainer}>
            {(user.location || user.country) && (
              <View style={styles.metaItem}>
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>
                  {[user.location, user.country].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}

            {user.orcidId && (
              <TouchableOpacity
                onPress={handleOpenOrcid}
                style={styles.orcidItem}
                activeOpacity={0.7}
              >
                <Text style={styles.orcidText}>orcid.org/{user.orcidId}</Text>
                <ExternalLink size={12} color={colors.accentBlue} />
              </TouchableOpacity>
            )}

            {cleanWebsiteDomain && (
              <TouchableOpacity
                onPress={handleOpenWebsite}
                style={styles.websiteItem}
                activeOpacity={0.7}
              >
                <Globe size={14} color={colors.textSecondary} />
                <Text style={styles.websiteText}>{cleanWebsiteDomain}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>Joined {user.joinedDate}</Text>
            </View>
          </View>

          {/* Following / Followers Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatCount(user.followersCount)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts & Shares</Text>
            </View>
          </View>
        </View>

        {/* Sub-Tabs: Posts | Saved | Cited | Activity */}
        <View style={styles.tabsRow}>
          {(['Posts', 'Saved', 'Cited', 'Activity'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveSubTab(tab)}
              style={[
                styles.tabButton,
                activeSubTab === tab && styles.tabButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeSubTab === tab && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeSubTab === 'Posts' && (
          <View style={styles.postsList}>
            {posts.length > 0 ? (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            ) : (
              <EmptyState
                icon="MessageSquare"
                title="No posts published yet"
                description="Share research insights, preprints, or methodology questions with the scientific community."
                actionTitle="Create First Post"
                onAction={() => router.push('/(tabs)/create')}
              />
            )}
          </View>
        )}

        {activeSubTab === 'Saved' && (
          <View style={styles.savedList}>
            {savedPapers.length > 0 ? (
              savedPapers.map((p) => (
                <TrendingPaperCard key={p.id} paper={p} style={{ marginBottom: spacing.md }} />
              ))
            ) : (
              <EmptyState
                icon="Bookmark"
                title="No saved papers yet"
                description="Bookmark papers from your feed or explore to read and reference later."
                actionTitle="Explore Papers"
                onAction={() => router.push('/(tabs)/explore')}
              />
            )}
          </View>
        )}

        {activeSubTab === 'Cited' && (
          <View style={styles.citedList}>
            <EmptyState
              icon="FileText"
              title="Authored & Cited Publications"
              description={`Synced via verified ORCID registry (${user.orcidId || 'connect in Edit Profile'}).`}
              actionTitle="Edit ORCID & Profile"
              onAction={() => router.push('/profile/edit')}
            />
          </View>
        )}

        {activeSubTab === 'Activity' && (
          <View style={styles.activityList}>
            <EmptyState
              icon="TrendingUp"
              title="Recent Activity"
              description="Your recent discussions, methodology critiques, and replies will appear here in chronological order."
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl * 2,
  },
  bannerContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerNav: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerIconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  profileHeader: {
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  avatarActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -42,
    marginBottom: spacing.sm,
  },
  avatarOverBanner: {
    borderWidth: 3,
    borderColor: colors.white,
  },
  editButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
  },
  nameSection: {
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  fullName: {
    ...typography.h2,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  verifiedText: {
    ...typography.micro,
    color: colors.accentGreen,
    fontWeight: '700',
    fontSize: 11,
  },
  handle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  roleBox: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs + 2,
  },
  roleTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  institutionText: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 13,
  },
  bio: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
    marginVertical: spacing.xs,
  },
  interestsSection: {
    marginVertical: spacing.xs + 2,
  },
  interestsLabel: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 12,
  },
  orcidItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  orcidText: {
    ...typography.micro,
    color: colors.accentBlue,
    fontWeight: '600',
    fontSize: 12,
  },
  websiteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  websiteText: {
    ...typography.micro,
    color: colors.accentLink,
    fontWeight: '500',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.black,
  },
  tabText: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.black,
    fontWeight: '700',
  },
  postsList: {
    width: '100%',
  },
  savedList: {
    padding: spacing.lg,
  },
  citedList: {
    padding: spacing.lg,
  },
  activityList: {
    padding: spacing.lg,
  },
});
