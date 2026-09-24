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
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import {
  MapPin,
  Globe,
  ExternalLink,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Share2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../../components/core/Avatar';
import { Button } from '../../components/core/Button';
import { IconButton } from '../../components/core/IconButton';
import { TopicChip } from '../../components/core/TopicChip';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PostCard } from '../../components/cards/PostCard';
import { TrendingPaperCard } from '../../components/cards/TrendingPaperCard';
import { useAuthStore } from '../../store/useAuthStore';
import { usePostStore } from '../../store/usePostStore';

export default function OtherResearcherProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const users = useAuthStore((s) => s.users);
  const currentUser = useAuthStore((s) => s.user);
  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);
  const getPostsByUser = usePostStore((s) => s.getPostsByUser);

  const [activeSubTab, setActiveSubTab] = useState<'Posts' | 'Papers' | 'Activity'>('Posts');

  const researcher = users.find((u) => u.id === id || u.handle === id) || (id === currentUser.id ? currentUser : users[1]);
  const isOwnProfile = researcher.id === currentUser.id;
  const posts = getPostsByUser(researcher.id);
  const paperPosts = posts.filter((p) => !!p.paper);

  const handleFollowToggle = () => {
    if (isOwnProfile) {
      router.push('/profile/edit');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    toggleFollowUser(researcher.id);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out researcher ${researcher.fullName} (@${researcher.handle}) on BooffIn: Research finds it's people.`,
      });
    } catch {}
  };

  const handleOpenOrcid = () => {
    if (researcher.orcidId) {
      Linking.openURL(`https://orcid.org/${researcher.orcidId}`);
    }
  };

  const handleOpenWebsite = () => {
    if (researcher.websiteUrl) {
      const url = researcher.websiteUrl.startsWith('http')
        ? researcher.websiteUrl
        : `https://${researcher.websiteUrl}`;
      Linking.openURL(url);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return `${count}`;
  };

  const cleanWebsiteDomain = researcher.websiteUrl
    ? researcher.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
            }}
            style={styles.bannerImage}
            contentFit="cover"
          />
          <View style={styles.bannerNav}>
            <IconButton
              icon="ArrowLeft"
              size="sm"
              variant="filled"
              color={colors.white}
              onPress={() => router.back()}
              style={styles.bannerIconButton}
            />

            <IconButton
              icon="Share2"
              size="sm"
              variant="filled"
              color={colors.white}
              onPress={handleShare}
              style={styles.bannerIconButton}
            />
          </View>
        </View>

        {/* Profile Info Header */}
        <View style={styles.profileHeader}>
          {/* Avatar & Follow Action */}
          <View style={styles.avatarActionRow}>
            <Avatar
              url={researcher.avatarUrl}
              name={researcher.fullName}
              size={84}
              verified={researcher.orcidVerified}
              style={styles.avatarOverBanner}
            />

            <Button
              title={isOwnProfile ? 'Edit Profile' : researcher.isFollowing ? 'Following' : 'Follow'}
              variant={isOwnProfile || researcher.isFollowing ? 'outline' : 'primary'}
              size="sm"
              onPress={handleFollowToggle}
              style={styles.followButton}
            />
          </View>

          {/* Name & Handle */}
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={styles.fullName}>{researcher.fullName}</Text>
              {researcher.orcidVerified && (
                <View style={styles.verifiedTag}>
                  <CheckCircle2 size={15} color={colors.accentGreen} />
                  <Text style={styles.verifiedText}>ORCID Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.handle}>@{researcher.handle}</Text>
          </View>

          {/* Academic Role & Institution */}
          <View style={styles.roleBox}>
            <Text style={styles.roleTitle}>{researcher.academicTitle}</Text>
            {researcher.institution && (
              <Text style={styles.institutionText}>{researcher.institution}</Text>
            )}
          </View>

          {/* Bio / Description */}
          {researcher.bio ? (
            <Text style={styles.bio}>{researcher.bio}</Text>
          ) : null}

          {/* Research Interests */}
          {researcher.researchInterests && researcher.researchInterests.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.interestsLabel}>Research Interests:</Text>
              <View style={styles.interestsRow}>
                {researcher.researchInterests.map((interest) => (
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
            {(researcher.location || researcher.country) && (
              <View style={styles.metaItem}>
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>
                  {[researcher.location, researcher.country].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}

            {researcher.orcidId && (
              <TouchableOpacity
                onPress={handleOpenOrcid}
                style={styles.orcidItem}
                activeOpacity={0.7}
              >
                <Text style={styles.orcidText}>orcid.org/{researcher.orcidId}</Text>
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
              <Text style={styles.metaText}>Joined {researcher.joinedDate}</Text>
            </View>
          </View>

          {/* Following / Followers Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{researcher.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatCount(researcher.followersCount)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>
        </View>

        {/* Sub-Tabs: Posts | Papers | Activity */}
        <View style={styles.tabsRow}>
          {(['Posts', 'Papers', 'Activity'] as const).map((tab) => (
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
                {tab === 'Posts' ? 'All Posts & Shares' : tab === 'Papers' ? 'Referenced Papers' : 'Activity'}
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
                title="No posts yet"
                description="This researcher hasn't shared any public research thoughts or questions yet."
              />
            )}
          </View>
        )}

        {activeSubTab === 'Papers' && (
          <View style={styles.papersList}>
            {paperPosts.length > 0 ? (
              paperPosts.map((p) => (
                <TrendingPaperCard key={p.id} paper={p.paper!} style={{ marginBottom: spacing.md }} />
              ))
            ) : (
              <EmptyState
                icon="FileText"
                title="No papers referenced"
                description="This researcher has not shared external peer-reviewed paper links yet."
              />
            )}
          </View>
        )}

        {activeSubTab === 'Activity' && (
          <View style={styles.activityList}>
            <EmptyState
              icon="TrendingUp"
              title="Recent Activity"
              description="Peer discussions, commentary, and scientific questions will appear here."
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
  followButton: {
    minWidth: 104,
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
  papersList: {
    padding: spacing.lg,
  },
  activityList: {
    padding: spacing.lg,
  },
});
