import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Sparkles,
  Clock,
  Users,
  UserPlus,
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
import { ProfileAnalyticsBar } from '../../components/profile/ProfileAnalyticsBar';
import { ProfileAnalyticsModal } from '../../components/profile/ProfileAnalyticsModal';
import { useAuthStore } from '../../store/useAuthStore';
import { usePostStore } from '../../store/usePostStore';
import {
  getSharedResearchInterests,
  getResearcherDiscussedTopics,
} from '../../api/connectionService';
import { fetchUserProfile, fetchUserProfileByUsername } from '../../api/authService';
import { fetchUserPosts } from '../../api/socialService';
import { UserProfile, Post } from '../../types';
import { AppHeader } from '../../components/layout/AppHeader';
import { FollowListModal } from '../../components/modals/FollowListModal';
import { BooffInScholarsTab } from '../../components/profile/BooffInScholarsTab';
import { OpenAlexAuthorProfileView } from '../../components/profile/OpenAlexAuthorProfileView';

export default function OtherResearcherProfileScreen() {
  const { id, openAlexId, orcidId } = useLocalSearchParams<{
    id: string;
    openAlexId?: string;
    orcidId?: string;
  }>();
  const currentUser = useAuthStore((s) => s.user);
  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);
  const allPosts = usePostStore((s) => s.posts);

  const [researcher, setResearcher] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [researcherPosts, setResearcherPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'Posts' | 'Scholars' | 'Activity'>('Posts');
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

  const isFollowing = useAuthStore((s) => researcher?.id ? s.followingIds.has(researcher.id) : false);
  const isFollowLoading = useAuthStore((s) => researcher?.id ? s.followLoadingIds.has(researcher.id) : false);

  const loadResearcherPosts = useCallback(async (userId: string) => {
    if (!userId) return;
    setIsLoadingPosts(true);
    const res = await fetchUserPosts(userId, currentUser?.id);
    if (res.posts) {
      setResearcherPosts(res.posts);
    }
    setIsLoadingPosts(false);
  }, [currentUser?.id]);

  useEffect(() => {
    async function loadProfile() {
      const isExplicitOpenAlex =
        Boolean(openAlexId) ||
        Boolean(orcidId) ||
        Boolean(
          id &&
            (id.startsWith('openalex_author_') ||
              id.startsWith('orcid_') ||
              /^A\d+$/i.test(id) ||
              /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(id))
        );

      if (!id || isExplicitOpenAlex) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const cleanId = id.trim().replace(/^@/, '').toLowerCase();
      if (id === currentUser.id || cleanId === currentUser.handle?.toLowerCase()) {
        setResearcher(currentUser);
        loadResearcherPosts(currentUser.id);
        setIsLoading(false);
        return;
      }

      let prof = await fetchUserProfile(id, currentUser?.id);
      if (!prof) {
        prof = await fetchUserProfileByUsername(cleanId, currentUser?.id);
      }
      if (prof) {
        const currentlyFollowing = useAuthStore.getState().followingIds.has(prof.id);
        if (currentlyFollowing) {
          prof = {
            ...prof,
            isFollowing: true,
            followersCount: prof.isFollowing ? prof.followersCount : (prof.followersCount || 0) + 1,
          };
        } else if (prof.isFollowing) {
          useAuthStore.setState((state) => {
            if (!state.followingIds.has(prof!.id)) {
              const next = new Set(state.followingIds);
              next.add(prof!.id);
              return { followingIds: next };
            }
            return state;
          });
        }
      }
      setResearcher(prof);
      if (prof?.id) {
        loadResearcherPosts(prof.id);
      }
      setIsLoading(false);
    }

    loadProfile();
  }, [id, currentUser?.id, currentUser?.handle, loadResearcherPosts]);

  const isOwnProfile = researcher?.id === currentUser?.id;

  const handleRefresh = async () => {
    if (!researcher?.id) return;
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const cleanId = (id || '').replace(/^@/, '');
    const refreshProfile = async () => {
      let prof = await fetchUserProfile(cleanId, currentUser?.id);
      if (!prof) {
        prof = await fetchUserProfileByUsername(cleanId, currentUser?.id);
      }
      if (prof) setResearcher(prof);
    };
    await Promise.all([
      refreshProfile(),
      loadResearcherPosts(researcher.id),
    ]);
    setIsRefreshing(false);
  };

  const posts = React.useMemo(() => {
    if (!researcher?.id) return [];
    if (researcherPosts.length > 0) {
      const storeMap = new Map(allPosts.map((p) => [p.id, p]));
      return researcherPosts.map((rp) => {
        const live = storeMap.get(rp.id);
        if (!live) return rp;
        return {
          ...rp,
          likesCount: live.likesCount,
          repostsCount: live.repostsCount,
          isLiked: live.isLiked,
          isReposted: live.isReposted,
          isSaved: live.isSaved,
        };
      });
    }
    return allPosts.filter((p) => p.author.id === researcher.id || (p.isReposted && p.author.id !== researcher.id));
  }, [researcherPosts, allPosts, researcher?.id]);

  const paperPosts = React.useMemo(() => {
    return posts.filter((p) => !!p.paper);
  }, [posts]);

  // Shared / mutual research interests
  const mutualInterests = React.useMemo(() => {
    if (!researcher) return [];
    return getSharedResearchInterests(currentUser, researcher);
  }, [currentUser, researcher]);

  // Topics the researcher discusses in posts and paper references
  const discussedTopics = React.useMemo(() => {
    if (!researcher?.id) return [];
    return getResearcherDiscussedTopics(researcher.id, allPosts);
  }, [researcher?.id, allPosts]);

  const handleFollowToggle = async () => {
    if (!researcher?.id || isFollowLoading) return;
    if (isOwnProfile) {
      router.push('/profile/edit');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await toggleFollowUser(researcher.id);
  };

  const handleOpenFollowers = () => {
    setFollowModalType('followers');
    setFollowModalVisible(true);
  };

  const handleOpenFollowing = () => {
    setFollowModalType('following');
    setFollowModalVisible(true);
  };

  const isExplicitOpenAlex =
    Boolean(openAlexId) ||
    Boolean(orcidId) ||
    Boolean(
      id &&
        (id.startsWith('openalex_author_') ||
          id.startsWith('orcid_') ||
          /^A\d+$/i.test(id) ||
          /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(id))
    );

  if (isExplicitOpenAlex) {
    const cleanOaId =
      openAlexId ||
      orcidId ||
      (id
        ? id
            .replace(/^openalex_author_/i, '')
            .replace(/^orcid_/i, '')
        : '');

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <OpenAlexAuthorProfileView
          authorId={cleanOaId}
          initialOrcid={orcidId}
          onBack={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <AppHeader showBack title="Researcher Profile" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...typography.caption, color: colors.textSecondary }}>Loading researcher profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!researcher) {
    const fallbackAuthorId =
      openAlexId ||
      orcidId ||
      (id
        ? id
            .replace(/^openalex_author_/i, '')
            .replace(/^orcid_/i, '')
        : '');

    if (
      fallbackAuthorId &&
      (isExplicitOpenAlex ||
        id?.startsWith('openalex_') ||
        id?.startsWith('orcid_') ||
        id?.length > 8)
    ) {
      return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
          <OpenAlexAuthorProfileView
            authorId={fallbackAuthorId}
            initialOrcid={orcidId}
            onBack={() => router.back()}
          />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <AppHeader showBack title="Researcher Profile" />
        <EmptyState
          icon="Users"
          title="Researcher not found"
          description="The researcher profile you are looking for does not exist in the database."
          actionTitle="Back to Explore"
          onAction={() => router.push('/(tabs)/explore')}
        />
      </SafeAreaView>
    );
  }

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

  const formatCount = (count: number = 0) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return `${count}`;
  };

  const cleanWebsiteDomain = researcher.websiteUrl
    ? researcher.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accentBlue}
          />
        }
      >
        {/* Banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={{
              uri: researcher.bannerUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
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
          {/* Avatar & Action Row: Distinct Follow & Connect Actions */}
          <View style={styles.avatarActionRow}>
            <Avatar
              url={researcher.avatarUrl}
              name={researcher.fullName}
              size={84}
              verified={researcher.orcidVerified}
              style={styles.avatarOverBanner}
            />

            <View style={styles.actionButtonsGroup}>
              {/* Follow Button */}
              <Button
                title={isOwnProfile ? 'Edit Profile' : isFollowing ? 'Following' : 'Follow'}
                variant={isOwnProfile || isFollowing ? 'outline' : 'primary'}
                size="sm"
                loading={isFollowLoading}
                disabled={isFollowLoading}
                onPress={handleFollowToggle}
                style={styles.followButton}
              />
            </View>
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

          {/* RESEARCH IMPACT & ANALYTICS BAR (Private to Account Owner Only) */}
          {isOwnProfile && (
            <ProfileAnalyticsBar
              totalViews={Math.max(
                posts.length * 95 +
                  posts.reduce((acc: number, p: Post) => acc + (p.likesCount || 0), 0) * 4 +
                  posts.reduce((acc: number, p: Post) => acc + (p.commentsCount || 0), 0) * 6,
                posts.length > 0 ? 90 : 0
              )}
              onPress={() => setAnalyticsModalOpen(true)}
            />
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
            <TouchableOpacity
              onPress={handleOpenFollowing}
              style={styles.statItem}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{researcher.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenFollowers}
              style={styles.statItem}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>
                {formatCount(
                  isOwnProfile
                    ? currentUser.followersCount
                    : (researcher.followersCount + (isFollowing && !researcher.isFollowing ? 1 : !isFollowing && researcher.isFollowing ? -1 : 0))
                )}
              </Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts & Shares</Text>
            </View>
          </View>
        </View>

        {/* Sub-Tabs: Posts | Scholars | Activity */}
        <View style={styles.tabsRow}>
          {(['Posts', 'Scholars', 'Activity'] as const).map((tab) => (
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
                {tab === 'Posts' ? 'All Posts & Shares' : tab === 'Scholars' ? 'BooffIn Scholars' : 'Activity'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeSubTab === 'Posts' && (
          <View style={styles.postsList}>
            {isLoadingPosts && posts.length === 0 ? (
              <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={colors.accentBlue} />
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm }}>
                  Loading posts & shares...
                </Text>
              </View>
            ) : posts.length > 0 ? (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            ) : (
              <EmptyState
                icon="Discussion"
                title="No posts yet"
                description="This researcher hasn't shared any public research thoughts or questions yet."
              />
            )}
          </View>
        )}

        {activeSubTab === 'Scholars' && (
          <BooffInScholarsTab
            userId={researcher.id}
            isCurrentUser={isOwnProfile}
            userFullName={researcher.fullName}
            orcidId={researcher.orcidId}
            orcidVerified={researcher.orcidVerified}
          />
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

      {/* Followers & Following List Modal */}
      <FollowListModal
        visible={followModalVisible}
        onClose={() => setFollowModalVisible(false)}
        userId={researcher.id}
        type={followModalType}
        userName={researcher.fullName}
      />

      {/* Comprehensive Profile Analytics Modal (Private to Account Owner Only) */}
      {isOwnProfile && (
        <ProfileAnalyticsModal
          visible={analyticsModalOpen}
          userId={researcher.id}
          userFullName={researcher.fullName}
          onClose={() => setAnalyticsModalOpen(false)}
        />
      )}
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
  actionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  followButton: {
    minWidth: 90,
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
  mutualInterestsCard: {
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radii.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  mutualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  mutualTitle: {
    ...typography.captionBold,
    color: '#1E40AF',
    fontSize: 13,
  },
  mutualDesc: {
    ...typography.micro,
    color: '#3B82F6',
    marginBottom: spacing.xs + 2,
  },
  mutualInterestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  mutualInterestBadgeText: {
    ...typography.captionBold,
    color: '#1E40AF',
    fontSize: 11,
  },
  discussedSection: {
    marginVertical: spacing.xs + 2,
  },
  discussedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.xs + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },
  discussedChipLabel: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontSize: 12,
  },
  discussedCountBadge: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  discussedCountText: {
    ...typography.micro,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
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

