import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Alert,
  Platform,
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
  Lock,
  UserX,
} from 'lucide-react-native';
import { blockUser, unblockUser } from '../../api/moderationService';
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

function isOpenAlexOrOrcidIdentifier(
  id?: string,
  openAlexId?: string,
  orcidId?: string
): boolean {
  if (Boolean(openAlexId) || Boolean(orcidId)) return true;
  if (!id) return false;
  return (
    id.startsWith('openalex_author_') ||
    id.startsWith('openalex_') ||
    id.startsWith('orcid_') ||
    /^A\d+$/i.test(id) ||
    /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(id)
  );
}

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
  const [postsSubFilter, setPostsSubFilter] = useState<'All' | 'Hyped' | 'Articles' | 'Shared'>('All');
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
      const isExplicitOpenAlex = isOpenAlexOrOrcidIdentifier(id, openAlexId, orcidId);

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

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
      let prof: UserProfile | null = null;
      if (isUuid) {
        prof = await fetchUserProfile(id.trim(), currentUser?.id);
      } else {
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
      if (prof?.id && !prof.isPrivateRestricted) {
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
      return prof;
    };
    const refreshedProf = await refreshProfile();
    if (refreshedProf?.id && !refreshedProf.isPrivateRestricted) {
      await loadResearcherPosts(refreshedProf.id);
    }
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
  }, [researcherPosts, allPosts, researcher]);

  // Helper to check if a post is a shared research paper or repost
  const isSharedPost = (p: Post) =>
    p.postType === 'research_share' ||
    Boolean(p.paper) ||
    Boolean(p.repostedBy) ||
    Boolean(p.isReposted);

  // Compute posts filtered by sub-section ("All", "Hyped", "Articles", "Shared")
  const displayFilteredPosts = useMemo(() => {
    if (!posts || posts.length === 0) return [];
    if (postsSubFilter === 'Hyped') {
      // Only authored posts ranked by engagement (excluding shared papers/reposts)
      const authored = posts.filter((p) => !isSharedPost(p));
      return authored.sort((a, b) => {
        const scoreA =
          (a.likesCount || 0) * 3 +
          (a.commentsCount || 0) * 5 +
          (a.repostsCount || 0) * 4 +
          (a.savesCount || 0) * 2;
        const scoreB =
          (b.likesCount || 0) * 3 +
          (b.commentsCount || 0) * 5 +
          (b.repostsCount || 0) * 4 +
          (b.savesCount || 0) * 2;
        return scoreB - scoreA;
      });
    }
    if (postsSubFilter === 'Articles') {
      // Only long-form articles written by author (excluding shared/reposted)
      return posts.filter(
        (p) =>
          (p.postType === 'article' || Boolean(p.article)) &&
          !p.repostedBy &&
          !p.isReposted
      );
    }
    if (postsSubFilter === 'Shared') {
      return posts.filter((p) => isSharedPost(p));
    }
    return posts;
  }, [posts, postsSubFilter]);

  const postCounts = useMemo(() => {
    return {
      all: posts.length,
      hyped: posts.filter((p) => !isSharedPost(p)).length,
      articles: posts.filter(
        (p) =>
          (p.postType === 'article' || Boolean(p.article)) &&
          !p.repostedBy &&
          !p.isReposted
      ).length,
      shared: posts.filter((p) => isSharedPost(p)).length,
    };
  }, [posts]);

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

  const isExplicitOpenAlex = isOpenAlexOrOrcidIdentifier(id, openAlexId, orcidId);

  if (isExplicitOpenAlex) {
    const cleanOaId =
      openAlexId ||
      orcidId ||
      (id
        ? id
            .replace(/^openalex_author_/i, '')
            .replace(/^openalex_/i, '')
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
    if (isExplicitOpenAlex) {
      const fallbackAuthorId =
        openAlexId ||
        orcidId ||
        (id
          ? id
              .replace(/^openalex_author_/i, '')
              .replace(/^openalex_/i, '')
              .replace(/^orcid_/i, '')
          : '');

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

  const handleBlockToggle = () => {
    if (!researcher?.id) return;
    if (researcher.isBlocked) {
      const executeUnblock = async () => {
        const res = await unblockUser(researcher.id);
        if (res.success) {
          setResearcher((prev) => (prev ? { ...prev, isBlocked: false, isPrivateRestricted: false } : prev));
          loadResearcherPosts(researcher.id);
          if (Platform.OS === 'web') {
            window.alert(`${researcher.fullName} has been unblocked.`);
          } else {
            Alert.alert('Unblocked', `${researcher.fullName} has been unblocked.`);
          }
        } else {
          if (Platform.OS === 'web') {
            window.alert(res.error || 'Failed to unblock.');
          } else {
            Alert.alert('Error', res.error || 'Failed to unblock.');
          }
        }
      };

      const unblockMsg = `Unblock ${researcher.fullName}? You will be able to follow each other and view research discussions.`;
      if (Platform.OS === 'web') {
        if (window.confirm(unblockMsg)) {
          executeUnblock();
        }
      } else {
        Alert.alert(
          'Unblock Researcher',
          unblockMsg,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Unblock', onPress: executeUnblock },
          ]
        );
      }
    } else {
      const executeBlock = async () => {
        const res = await blockUser(researcher.id);
        if (res.success) {
          setResearcher((prev) =>
            prev ? { ...prev, isBlocked: true, isFollowing: false, isPrivateRestricted: true } : prev
          );
          setResearcherPosts([]);
          usePostStore.setState((state) => ({
            posts: state.posts.filter((p) => p.author.id !== researcher.id),
          }));
          if (Platform.OS === 'web') {
            window.alert(`${researcher.fullName} has been blocked.`);
          } else {
            Alert.alert('Blocked', `${researcher.fullName} has been blocked.`);
          }
        } else {
          if (Platform.OS === 'web') {
            window.alert(res.error || 'Failed to block.');
          } else {
            Alert.alert('Error', res.error || 'Failed to block.');
          }
        }
      };

      const blockMsg = `Block ${researcher.fullName}? They will not be able to follow you, view your posts, or interact with you.`;
      if (Platform.OS === 'web') {
        if (window.confirm(blockMsg)) {
          executeBlock();
        }
      } else {
        Alert.alert(
          'Block Researcher',
          blockMsg,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Block', style: 'destructive', onPress: executeBlock },
          ]
        );
      }
    }
  };

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

            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {!isOwnProfile && (
                <IconButton
                  icon={researcher.isBlocked ? 'UserCheck' : 'UserX'}
                  size="sm"
                  variant="filled"
                  color={researcher.isBlocked ? colors.accentGreen : colors.white}
                  onPress={handleBlockToggle}
                  style={styles.bannerIconButton}
                />
              )}
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
              {!researcher.isBlocked && (
                <Button
                  title={isOwnProfile ? 'Edit Profile' : isFollowing ? 'Following' : 'Follow'}
                  variant={isOwnProfile || isFollowing ? 'outline' : 'primary'}
                  size="sm"
                  loading={isFollowLoading}
                  disabled={isFollowLoading}
                  onPress={handleFollowToggle}
                  style={styles.followButton}
                />
              )}
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

        {/* Sub-Tabs or Blocked / Private Restricted Notice */}
        {researcher.isBlocked ? (
          <View style={styles.privateProfileContainer}>
            <View style={[styles.privateIconCircle, { backgroundColor: colors.accentRed + '15' }]}>
              <UserX size={26} color={colors.accentRed} />
            </View>
            <Text style={styles.privateTitle}>Blocked Researcher</Text>
            <Text style={styles.privateSubtitle}>
              {"You have blocked this researcher. Their research notes and interactions are restricted."}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.followButton,
                {
                  marginTop: spacing.md,
                  paddingHorizontal: spacing.lg,
                  alignSelf: 'center',
                  backgroundColor: colors.surfaceHover,
                },
              ]}
              onPress={handleBlockToggle}
            >
              <Text style={{ ...typography.captionBold, color: colors.textPrimary }}>Unblock Researcher</Text>
            </TouchableOpacity>
          </View>
        ) : researcher.isPrivateRestricted ? (
          <View style={styles.privateProfileContainer}>
            <View style={styles.privateIconCircle}>
              <Lock size={26} color={colors.textSecondary} />
            </View>
            <Text style={styles.privateTitle}>This Profile is Private</Text>
            <Text style={styles.privateSubtitle}>
              {"Only approved connections can view this researcher's full profile, publications, and scientific discussions."}
            </Text>
          </View>
        ) : (
          <>
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
                {/* Filter Chips: All | Hyped | Articles | Shared */}
                <View style={styles.filterRow}>
                  {(['All', 'Hyped', 'Articles', 'Shared'] as const).map((filter) => {
                    const count =
                      filter === 'All'
                        ? postCounts.all
                        : filter === 'Hyped'
                        ? postCounts.hyped
                        : filter === 'Articles'
                        ? postCounts.articles
                        : postCounts.shared;
                    return (
                      <TouchableOpacity
                        key={filter}
                        style={[
                          styles.filterChip,
                          postsSubFilter === filter && styles.filterChipActive,
                        ]}
                        onPress={() => setPostsSubFilter(filter)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            postsSubFilter === filter && styles.filterChipTextActive,
                          ]}
                        >
                          {filter}
                        </Text>
                        <View
                          style={[
                            styles.filterCountBadge,
                            postsSubFilter === filter && styles.filterCountBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.filterCountText,
                              postsSubFilter === filter && styles.filterCountTextActive,
                            ]}
                          >
                            {count}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {isLoadingPosts && posts.length === 0 ? (
                  <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color={colors.accentBlue} />
                    <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm }}>
                      Loading posts & shares...
                    </Text>
                  </View>
                ) : displayFilteredPosts.length > 0 ? (
                  displayFilteredPosts.map((p: Post) => <PostCard key={p.id} post={p} />)
                ) : (
                  <EmptyState
                    icon="Discussion"
                    title={
                      postsSubFilter === 'Articles'
                        ? 'No articles published yet'
                        : postsSubFilter === 'Shared'
                        ? 'No shared research posts yet'
                        : postsSubFilter === 'Hyped'
                        ? 'No hyped posts yet'
                        : 'No posts yet'
                    }
                    description={
                      postsSubFilter === 'Articles'
                        ? 'This researcher has not published any long-form research articles yet.'
                        : postsSubFilter === 'Shared'
                        ? 'This researcher has not shared any research papers or DOI preprints yet.'
                        : postsSubFilter === 'Hyped'
                        ? 'Posts ranked by engagement, discussion, and impact will appear here.'
                        : "This researcher hasn't shared any public research thoughts or questions yet."
                    }
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
          </>
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  filterChipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  filterCountBadge: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  filterCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterCountText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterCountTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  papersList: {
    padding: spacing.lg,
  },
  activityList: {
    padding: spacing.lg,
  },
  privateProfileContainer: {
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.md,
  },
  privateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  privateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  privateSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});

