import React, { useState, useMemo } from 'react';
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
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
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
  LogIn,
  Users,
  Sparkles,
  Clock,
  Check,
  X as XIcon,
  Camera,
  Trash2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react-native';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { Avatar } from '../../components/core/Avatar';
import { Button } from '../../components/core/Button';
import { IconButton } from '../../components/core/IconButton';
import { Typography } from '../../components/core/Typography';
import { TopicChip } from '../../components/core/TopicChip';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PostCard } from '../../components/cards/PostCard';
import { TrendingPaperCard } from '../../components/cards/TrendingPaperCard';
import { AppHeader } from '../../components/layout/AppHeader';
import { useAuthStore } from '../../store/useAuthStore';
import { usePostStore } from '../../store/usePostStore';
import { usePaperStore } from '../../store/usePaperStore';
import {
  getCollaborationRequests,
  respondToCollaborationRequest,
  withdrawCollaborationRequest,
  getResearcherDiscussedTopics,
} from '../../api/connectionService';
import {
  pickAvatarImage,
  pickBannerImage,
  uploadProfileAvatar,
  uploadProfileBanner,
  removeProfileAvatar,
  removeProfileBanner,
} from '../../api/storageService';
import { fetchUserPosts, fetchSavedPostsAndPapers } from '../../api/socialService';
import { Post, Paper, CollaborationRequest } from '../../types';
import { FollowListModal } from '../../components/modals/FollowListModal';

export const DEFAULT_PROFILE_BANNER = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80';

export default function CurrentUserProfileScreen() {
  const storeUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const allPosts = usePostStore((s) => s.posts);
  const papers = usePaperStore((s) => s.papers);
  const savedPaperIds = usePaperStore((s) => s.savedPaperIds);

  const [activeSubTab, setActiveSubTab] = useState<'Posts' | 'Saved' | 'Connects' | 'Cited' | 'Activity'>('Posts');
  const [collaborationRequests, setCollaborationRequests] = useState<{
    incoming: CollaborationRequest[];
    outgoing: CollaborationRequest[];
  }>({ incoming: [], outgoing: [] });

  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');

  const user = storeUser;

  const handlePickAndUploadAvatar = async () => {
    setAvatarModalOpen(false);
    if (!user?.id) return;

    const res = await pickAvatarImage();
    if (res.cancelled || !res.asset) return;

    setIsUploadingAvatar(true);
    const uploadRes = await uploadProfileAvatar(user.id, res.asset);
    setIsUploadingAvatar(false);

    if (!uploadRes.success) {
      Alert.alert('Upload Failed', uploadRes.error || 'Could not upload profile photo.');
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarModalOpen(false);
    if (!user?.id) return;

    setIsUploadingAvatar(true);
    const res = await removeProfileAvatar(user.id);
    setIsUploadingAvatar(false);

    if (!res.success) {
      Alert.alert('Remove Failed', res.error || 'Could not remove profile photo.');
    }
  };

  const handlePickAndUploadBanner = async () => {
    setBannerModalOpen(false);
    if (!user?.id) return;

    const res = await pickBannerImage();
    if (res.cancelled || !res.asset) return;

    setIsUploadingBanner(true);
    const uploadRes = await uploadProfileBanner(user.id, res.asset);
    setIsUploadingBanner(false);

    if (!uploadRes.success) {
      Alert.alert('Upload Failed', uploadRes.error || 'Could not upload banner.');
    }
  };

  const handleRemoveBanner = async () => {
    setBannerModalOpen(false);
    if (!user?.id) return;

    setIsUploadingBanner(true);
    const res = await removeProfileBanner(user.id);
    setIsUploadingBanner(false);

    if (!res.success) {
      Alert.alert('Remove Failed', res.error || 'Could not remove banner.');
    }
  };

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [savedPapersDb, setSavedPapersDb] = useState<Paper[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [savedSubFilter, setSavedSubFilter] = useState<'All' | 'Posts' | 'Papers'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRequests = React.useCallback(async () => {
    if (!user?.id) return;
    const reqs = await getCollaborationRequests(user.id);
    setCollaborationRequests(reqs);
  }, [user?.id]);

  const loadUserPosts = React.useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingPosts(true);
    const res = await fetchUserPosts(user.id, user.id);
    if (res.posts) {
      setUserPosts(res.posts);
    }
    setIsLoadingPosts(false);
  }, [user?.id]);

  const loadSavedItems = React.useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingSaved(true);
    const res = await fetchSavedPostsAndPapers(user.id);
    if (res.posts) {
      setSavedPosts(res.posts);
    }
    if (res.papers) {
      setSavedPapersDb(res.papers);
    }
    setIsLoadingSaved(false);
  }, [user?.id]);

  React.useEffect(() => {
    loadRequests();
    loadUserPosts();
    loadSavedItems();
  }, [loadRequests, loadUserPosts, loadSavedItems]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadUserPosts(), loadRequests(), loadSavedItems()]);
    setIsRefreshing(false);
  };

  const discussedTopics = React.useMemo(() => {
    if (!user?.id) return [];
    return getResearcherDiscussedTopics(user.id, allPosts);
  }, [user?.id, allPosts]);

  const handleRespond = async (requestId: string, status: 'accepted' | 'declined') => {
    await respondToCollaborationRequest(requestId, status);
    loadRequests();
  };

  const handleWithdraw = async (requestId: string) => {
    await withdrawCollaborationRequest(requestId);
    loadRequests();
  };

  // Combine database userPosts (authored + reshared) with any optimistic live updates in allPosts
  const posts = useMemo(() => {
    if (!user?.id) return [];
    if (userPosts.length > 0) {
      const storeMap = new Map(allPosts.map((p) => [p.id, p]));
      return userPosts.map((up) => {
        const live = storeMap.get(up.id);
        if (!live) return up;
        return {
          ...up,
          likesCount: live.likesCount,
          repostsCount: live.repostsCount,
          isLiked: live.isLiked,
          isReposted: live.isReposted,
          isSaved: live.isSaved,
        };
      });
    }
    return allPosts.filter((p) => p.author.id === user.id || (p.isReposted && p.author.id !== user.id));
  }, [userPosts, allPosts, user?.id]);

  // Combine database saved posts with any in-store saved posts
  const displaySavedPosts = useMemo(() => {
    if (!user?.id) return [];
    const storeMap = new Map(allPosts.map((p) => [p.id, p]));
    const combinedMap = new Map<string, Post>();

    savedPosts.forEach((sp) => {
      const live = storeMap.get(sp.id);
      if (live) {
        if (live.isSaved !== false) {
          combinedMap.set(sp.id, {
            ...sp,
            likesCount: live.likesCount,
            repostsCount: live.repostsCount,
            savesCount: live.savesCount,
            isLiked: live.isLiked,
            isReposted: live.isReposted,
            isSaved: true,
          });
        }
      } else {
        combinedMap.set(sp.id, sp);
      }
    });

    allPosts.forEach((p) => {
      if (p.isSaved && !combinedMap.has(p.id)) {
        combinedMap.set(p.id, p);
      }
    });

    return Array.from(combinedMap.values());
  }, [savedPosts, allPosts, user?.id]);

  // Combine database saved papers with store saved papers
  const displaySavedPapers = useMemo(() => {
    const combinedMap = new Map<string, Paper>();
    savedPapersDb.forEach((p) => combinedMap.set(p.id, p));
    papers.forEach((p) => {
      if (savedPaperIds.has(p.id) || p.isSaved) {
        combinedMap.set(p.id, p);
      }
    });
    return Array.from(combinedMap.values());
  }, [savedPapersDb, papers, savedPaperIds]);

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

  const formatCount = (count: number = 0) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return `${count}`;
  };

  const cleanWebsiteDomain = user?.websiteUrl
    ? user.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null;

  if (!isAuthenticated || !user?.id) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <AppHeader title="Research Profile" />
        <EmptyState
          icon="Users"
          title="Join the Scientific Community"
          description="Sign in or register to manage your scientific discussions, track literature, and connect with fellow researchers."
          actionTitle="Sign In / Register"
          onAction={() => router.push('/(auth)/welcome')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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
        {/* Banner Image */}
        <View style={styles.bannerContainer}>
          <Image
            source={{
              uri: user.bannerUrl || DEFAULT_PROFILE_BANNER,
            }}
            style={styles.bannerImage}
            contentFit="cover"
          />

          {isUploadingBanner && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.uploadingText}>Updating Banner...</Text>
            </View>
          )}

          <View style={styles.bannerNav}>
            <TouchableOpacity
              onPress={() => setBannerModalOpen(true)}
              style={styles.bannerEditBadge}
              activeOpacity={0.8}
            >
              <Camera size={14} color={colors.white} />
              <Text style={styles.bannerEditText}>Edit Banner</Text>
            </TouchableOpacity>

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
            <View style={styles.avatarContainerWrapper}>
              <Avatar
                url={user.avatarUrl}
                name={user.fullName}
                size={84}
                verified={user.orcidVerified}
                style={styles.avatarOverBanner}
              />

              {isUploadingAvatar && (
                <View style={styles.avatarUploadingOverlay}>
                  <ActivityIndicator size="small" color={colors.white} />
                </View>
              )}

              <TouchableOpacity
                onPress={() => setAvatarModalOpen(true)}
                style={styles.avatarCameraBadge}
                activeOpacity={0.8}
              >
                <Camera size={13} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionButtonsRow}>
              {!isAuthenticated ? (
                <Button
                  title="Sign In / Register"
                  variant="primary"
                  size="sm"
                  onPress={() => router.push('/(auth)/welcome')}
                  style={styles.editButton}
                />
              ) : (
                <Button
                  title="Edit Profile"
                  variant="outline"
                  size="sm"
                  onPress={() => router.push('/profile/edit')}
                  style={styles.editButton}
                />
              )}
            </View>
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
            {user.institution ? (
              <Text style={styles.institutionText}>{user.institution}</Text>
            ) : null}
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

          {/* TOPICS DISCUSSED & SHARED */}
          {discussedTopics.length > 0 && (
            <View style={styles.discussedSection}>
              <Text style={styles.interestsLabel}>Topics Discussed & Shared:</Text>
              <View style={styles.interestsRow}>
                {discussedTopics.map(({ topic, count }) => (
                  <TouchableOpacity
                    key={topic}
                    style={styles.discussedChip}
                    onPress={() =>
                      router.push({
                        pathname: '/topic/[slug]',
                        params: { slug: topic.toLowerCase().replace(/\s+/g, '-') },
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.discussedChipLabel}>{topic}</Text>
                    <View style={styles.discussedCountBadge}>
                      <Text style={styles.discussedCountText}>{count}</Text>
                    </View>
                  </TouchableOpacity>
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

            {user.orcidId ? (
              <TouchableOpacity
                onPress={handleOpenOrcid}
                style={styles.orcidItem}
                activeOpacity={0.7}
              >
                <Text style={styles.orcidText}>orcid.org/{user.orcidId}</Text>
                <ExternalLink size={12} color={colors.accentBlue} />
              </TouchableOpacity>
            ) : null}

            {cleanWebsiteDomain ? (
              <TouchableOpacity
                onPress={handleOpenWebsite}
                style={styles.websiteItem}
                activeOpacity={0.7}
              >
                <Globe size={14} color={colors.textSecondary} />
                <Text style={styles.websiteText}>{cleanWebsiteDomain}</Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>Joined {user.joinedDate || 'Recently'}</Text>
            </View>
          </View>

          {/* Following / Followers Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              onPress={() => {
                setFollowModalType('following');
                setFollowModalVisible(true);
              }}
              style={styles.statItem}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setFollowModalType('followers');
                setFollowModalVisible(true);
              }}
              style={styles.statItem}
              activeOpacity={0.7}
            >
              <Text style={styles.statNumber}>{formatCount(user.followersCount)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts & Shares</Text>
            </View>
          </View>
        </View>

        {/* Sub-Tabs: Posts | Saved | Connects | Cited | Activity */}
        <View style={styles.tabsRow}>
          {(['Posts', 'Saved', 'Connects', 'Cited', 'Activity'] as const).map((tab) => {
            const pendingIncomingCount = collaborationRequests.incoming.filter((r) => r.status === 'pending').length;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveSubTab(tab)}
                style={[
                  styles.tabButton,
                  activeSubTab === tab && styles.tabButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.tabContentRow}>
                  <Text
                    style={[
                      styles.tabText,
                      activeSubTab === tab && styles.tabTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                  {tab === 'Connects' && pendingIncomingCount > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{pendingIncomingCount}</Text>
                    </View>
                  )}
                  {tab === 'Saved' && (displaySavedPosts.length + displaySavedPapers.length) > 0 && (
                    <View style={[styles.tabBadge, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.borderLight }]}>
                      <Text style={[styles.tabBadgeText, { color: colors.textSecondary }]}>
                        {displaySavedPosts.length + displaySavedPapers.length}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        {activeSubTab === 'Posts' && (
          <View style={styles.postsList}>
            {isLoadingPosts && posts.length === 0 ? (
              <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={colors.accentBlue} />
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm }}>
                  Loading discussions & shares...
                </Text>
              </View>
            ) : posts.length > 0 ? (
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
          <View style={styles.savedSection}>
            {/* Filter Chips: All | Posts | Papers */}
            <View style={styles.savedFilterRow}>
              {(['All', 'Posts', 'Papers'] as const).map((filter) => {
                const count =
                  filter === 'All'
                    ? displaySavedPosts.length + displaySavedPapers.length
                    : filter === 'Posts'
                    ? displaySavedPosts.length
                    : displaySavedPapers.length;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.savedFilterChip,
                      savedSubFilter === filter && styles.savedFilterChipActive,
                    ]}
                    onPress={() => setSavedSubFilter(filter)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.savedFilterChipText,
                        savedSubFilter === filter && styles.savedFilterChipTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                    <View
                      style={[
                        styles.savedFilterCountBadge,
                        savedSubFilter === filter && styles.savedFilterCountBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.savedFilterCountText,
                          savedSubFilter === filter && styles.savedFilterCountTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isLoadingSaved && displaySavedPosts.length === 0 && displaySavedPapers.length === 0 ? (
              <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={colors.accentBlue} />
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm }}>
                  Loading saved bookmarks...
                </Text>
              </View>
            ) : displaySavedPosts.length === 0 && displaySavedPapers.length === 0 ? (
              <EmptyState
                icon="Bookmark"
                title="No saved items yet"
                description="Bookmark research discussions or peer-reviewed papers to read and reference later."
                actionTitle="Explore Feed & Papers"
                onAction={() => router.push('/(tabs)')}
              />
            ) : (
              <View style={styles.savedItemsList}>
                {/* When Filter is 'All' or 'Posts' and there are saved posts */}
                {(savedSubFilter === 'All' || savedSubFilter === 'Posts') && displaySavedPosts.length > 0 && (
                  <View style={styles.savedPostsContainer}>
                    {savedSubFilter === 'All' && displaySavedPapers.length > 0 && (
                      <Text style={styles.savedSubSectionHeading}>
                        Saved Discussions ({displaySavedPosts.length})
                      </Text>
                    )}
                    {displaySavedPosts.map((p) => (
                      <PostCard key={p.id} post={p} />
                    ))}
                  </View>
                )}

                {/* When Filter is 'All' or 'Papers' and there are saved papers */}
                {(savedSubFilter === 'All' || savedSubFilter === 'Papers') && displaySavedPapers.length > 0 && (
                  <View style={styles.savedPapersContainer}>
                    {savedSubFilter === 'All' && displaySavedPosts.length > 0 && (
                      <Text style={[styles.savedSubSectionHeading, { marginTop: spacing.lg }]}>
                        Saved Papers ({displaySavedPapers.length})
                      </Text>
                    )}
                    <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
                      {displaySavedPapers.map((p) => (
                        <TrendingPaperCard key={p.id} paper={p} style={{ marginBottom: spacing.md }} />
                      ))}
                    </View>
                  </View>
                )}

                {/* Filter specific empty states */}
                {savedSubFilter === 'Posts' && displaySavedPosts.length === 0 && (
                  <EmptyState
                    icon="Bookmark"
                    title="No saved posts"
                    description="Tap the bookmark icon on any post in your feed to save it here."
                  />
                )}
                {savedSubFilter === 'Papers' && displaySavedPapers.length === 0 && (
                  <EmptyState
                    icon="FileText"
                    title="No saved papers"
                    description="Bookmark peer-reviewed papers from explore or post attachments."
                  />
                )}
              </View>
            )}
          </View>
        )}

        {activeSubTab === 'Connects' && (
          <View style={styles.connectsList}>
            {/* Incoming Collaboration Requests */}
            <Text style={styles.connectSectionHeading}>
              Incoming Collaboration Requests ({collaborationRequests.incoming.length})
            </Text>

            {collaborationRequests.incoming.length > 0 ? (
              collaborationRequests.incoming.map((req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Avatar
                      url={req.sender?.avatarUrl}
                      name={req.sender?.fullName || 'Researcher'}
                      size={40}
                      verified={req.sender?.orcidVerified}
                    />
                    <View style={styles.requestMeta}>
                      <Text style={styles.requestSenderName}>
                        {req.sender?.fullName || 'Researcher'}
                      </Text>
                      <Text style={styles.requestSenderRole} numberOfLines={1}>
                        {req.sender?.academicTitle} · {req.sender?.institution}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        req.status === 'accepted' && styles.statusTagAccepted,
                        req.status === 'declined' && styles.statusTagDeclined,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          req.status === 'accepted' && styles.statusTagTextAccepted,
                          req.status === 'declined' && styles.statusTagTextDeclined,
                        ]}
                      >
                        {req.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.requestTopicPill}>
                    <Sparkles size={12} color="#2563EB" style={{ marginRight: 4 }} />
                    <Text style={styles.requestTopicText}>Topic: {req.topic}</Text>
                  </View>

                  <Text style={styles.requestMessage}>{req.message}</Text>

                  {req.status === 'pending' && (
                    <View style={styles.requestActionsRow}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleRespond(req.id, 'accepted')}
                        activeOpacity={0.8}
                      >
                        <Check size={14} color={colors.white} style={{ marginRight: 4 }} />
                        <Text style={styles.acceptButtonText}>Accept Collaboration</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.declineButton}
                        onPress={() => handleRespond(req.id, 'declined')}
                        activeOpacity={0.8}
                      >
                        <XIcon size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <Text style={styles.declineButtonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyRequests}>
                <Typography variant="caption" color={colors.textMuted} align="center">
                  No incoming collaboration proposals right now.
                </Typography>
              </View>
            )}

            {/* Sent Collaboration Requests */}
            <Text style={[styles.connectSectionHeading, { marginTop: spacing.xl }]}>
              Sent Collaboration Proposals ({collaborationRequests.outgoing.length})
            </Text>

            {collaborationRequests.outgoing.length > 0 ? (
              collaborationRequests.outgoing.map((req) => (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Avatar
                      url={req.recipient?.avatarUrl}
                      name={req.recipient?.fullName || 'Researcher'}
                      size={40}
                      verified={req.recipient?.orcidVerified}
                    />
                    <View style={styles.requestMeta}>
                      <Text style={styles.requestSenderName}>
                        To: {req.recipient?.fullName || 'Researcher'}
                      </Text>
                      <Text style={styles.requestSenderRole} numberOfLines={1}>
                        {req.recipient?.academicTitle} · {req.recipient?.institution}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        req.status === 'accepted' && styles.statusTagAccepted,
                        req.status === 'declined' && styles.statusTagDeclined,
                        req.status === 'withdrawn' && styles.statusTagDeclined,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          req.status === 'accepted' && styles.statusTagTextAccepted,
                          req.status === 'declined' && styles.statusTagTextDeclined,
                          req.status === 'withdrawn' && styles.statusTagTextDeclined,
                        ]}
                      >
                        {req.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.requestTopicPill}>
                    <Sparkles size={12} color="#2563EB" style={{ marginRight: 4 }} />
                    <Text style={styles.requestTopicText}>Topic: {req.topic}</Text>
                  </View>

                  <Text style={styles.requestMessage}>{req.message}</Text>

                  {req.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.withdrawLink}
                      onPress={() => handleWithdraw(req.id)}
                    >
                      <Text style={styles.withdrawLinkText}>Withdraw Proposal</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyRequests}>
                <Typography variant="caption" color={colors.textMuted} align="center">
                  You haven't sent any research collaboration requests yet. Visit a researcher's profile and tap "Connect"!
                </Typography>
              </View>
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

      {/* Avatar Action Modal */}
      <Modal
        visible={avatarModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAvatarModalOpen(false)}
        >
          <View style={styles.actionModalSheet}>
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>Profile Photo</Text>
              <TouchableOpacity onPress={() => setAvatarModalOpen(false)}>
                <XIcon size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.actionModalSubtitle}>
              Upload a clear academic headshot or avatar. (JPG, PNG, WebP, max 5MB)
            </Text>

            <TouchableOpacity
              style={styles.actionModalOption}
              onPress={handlePickAndUploadAvatar}
              activeOpacity={0.7}
            >
              <View style={styles.actionModalOptionIcon}>
                <Upload size={18} color={colors.textPrimary} />
              </View>
              <View style={styles.actionModalOptionText}>
                <Text style={styles.actionOptionTitle}>
                  {user.avatarUrl ? 'Upload New Photo' : 'Upload Profile Photo'}
                </Text>
                <Text style={styles.actionOptionDesc}>Choose from photo gallery / library</Text>
              </View>
            </TouchableOpacity>

            {user.avatarUrl ? (
              <TouchableOpacity
                style={[styles.actionModalOption, styles.actionModalOptionDanger]}
                onPress={handleRemoveAvatar}
                activeOpacity={0.7}
              >
                <View style={[styles.actionModalOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={18} color={colors.accentRed} />
                </View>
                <View style={styles.actionModalOptionText}>
                  <Text style={[styles.actionOptionTitle, { color: colors.accentRed }]}>
                    Remove Profile Photo
                  </Text>
                  <Text style={styles.actionOptionDesc}>Reset to default initials</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.actionModalCancelBtn}
              onPress={() => setAvatarModalOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Banner Action Modal */}
      <Modal
        visible={bannerModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBannerModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setBannerModalOpen(false)}
        >
          <View style={styles.actionModalSheet}>
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>Profile Banner Image</Text>
              <TouchableOpacity onPress={() => setBannerModalOpen(false)}>
                <XIcon size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.actionModalSubtitle}>
              Customize your profile header cover image. (Panoramic 3:1 aspect ratio, max 5MB)
            </Text>

            <TouchableOpacity
              style={styles.actionModalOption}
              onPress={handlePickAndUploadBanner}
              activeOpacity={0.7}
            >
              <View style={styles.actionModalOptionIcon}>
                <ImageIcon size={18} color={colors.textPrimary} />
              </View>
              <View style={styles.actionModalOptionText}>
                <Text style={styles.actionOptionTitle}>
                  {user.bannerUrl ? 'Upload New Banner' : 'Upload Banner Image'}
                </Text>
                <Text style={styles.actionOptionDesc}>Choose panoramic cover image from library</Text>
              </View>
            </TouchableOpacity>

            {user.bannerUrl ? (
              <TouchableOpacity
                style={[styles.actionModalOption, styles.actionModalOptionDanger]}
                onPress={handleRemoveBanner}
                activeOpacity={0.7}
              >
                <View style={[styles.actionModalOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={18} color={colors.accentRed} />
                </View>
                <View style={styles.actionModalOptionText}>
                  <Text style={[styles.actionOptionTitle, { color: colors.accentRed }]}>
                    Remove Custom Banner
                  </Text>
                  <Text style={styles.actionOptionDesc}>Reset to default scientific background</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.actionModalCancelBtn}
              onPress={() => setBannerModalOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Followers & Following List Modal */}
      <FollowListModal
        visible={followModalVisible}
        onClose={() => setFollowModalVisible(false)}
        userId={user.id}
        type={followModalType}
        userName={user.fullName}
      />
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
    backgroundColor: colors.backgroundSecondary,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 10,
  },
  uploadingText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 13,
  },
  bannerEditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bannerEditText: {
    ...typography.micro,
    color: colors.white,
    fontWeight: '700',
    fontSize: 11,
  },
  bannerNav: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
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
  avatarContainerWrapper: {
    position: 'relative',
  },
  avatarOverBanner: {
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.black,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    zIndex: 15,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
    ...typography.sectionTitle,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
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
    ...typography.metadata,
    color: colors.accentGreen,
    fontWeight: '700',
    fontSize: 11.5,
  },
  handle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  roleBox: {
    marginTop: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  roleTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  institutionText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 13.5,
  },
  bio: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
    marginVertical: spacing.xs + 2,
  },
  interestsSection: {
    marginVertical: spacing.xs + 2,
  },
  discussedSection: {
    marginVertical: spacing.xs + 2,
  },
  interestsLabel: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: spacing.xs + 2,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  discussedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingLeft: spacing.sm + 2,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: radii.full,
    gap: 6,
  },
  discussedChipLabel: {
    ...typography.captionMedium,
    color: colors.textPrimary,
    fontWeight: '500',
    fontSize: 12.5,
  },
  discussedCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  discussedCountText: {
    ...typography.micro,
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 10.5,
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
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
  },
  orcidItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  orcidText: {
    ...typography.captionMedium,
    color: colors.accentBlue,
    fontWeight: '600',
    fontSize: 12.5,
  },
  websiteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  websiteText: {
    ...typography.captionMedium,
    color: colors.accentLink,
    fontWeight: '500',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statNumber: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
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
    minHeight: layout.touchTargetMin,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.black,
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: radii.full,
  },
  tabBadgeText: {
    ...typography.micro,
    color: colors.white,
    fontWeight: '700',
    fontSize: 10,
  },
  tabText: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.black,
    fontWeight: '700',
  },
  postsList: {
    width: '100%',
  },
  savedSection: {
    width: '100%',
  },
  savedFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  savedFilterChip: {
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
  savedFilterChipActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  savedFilterChipText: {
    ...typography.captionBold,
    fontSize: 12.5,
    color: colors.textSecondary,
  },
  savedFilterChipTextActive: {
    color: colors.white,
  },
  savedFilterCountBadge: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  savedFilterCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'transparent',
  },
  savedFilterCountText: {
    ...typography.micro,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  savedFilterCountTextActive: {
    color: colors.white,
  },
  savedItemsList: {
    width: '100%',
  },
  savedPostsContainer: {
    width: '100%',
  },
  savedPapersContainer: {
    width: '100%',
  },
  savedSubSectionHeading: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
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
  connectsList: {
    padding: spacing.lg,
  },
  connectSectionHeading: {
    ...typography.captionBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  requestCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requestMeta: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  requestSenderName: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  requestSenderRole: {
    ...typography.micro,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  statusTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  statusTagAccepted: {
    backgroundColor: '#DCFCE7',
  },
  statusTagDeclined: {
    backgroundColor: '#F3F4F6',
  },
  statusTagText: {
    ...typography.micro,
    color: '#D97706',
    fontWeight: '700',
    fontSize: 10,
  },
  statusTagTextAccepted: {
    color: '#16A34A',
  },
  statusTagTextDeclined: {
    color: '#6B7280',
  },
  requestTopicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  requestTopicText: {
    ...typography.micro,
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 12,
  },
  requestMessage: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  requestActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
  },
  acceptButtonText: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
  },
  declineButtonText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12,
  },
  withdrawLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  withdrawLinkText: {
    ...typography.micro,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  emptyRequests: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionModalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionModalTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionModalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
  actionModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  actionModalOptionDanger: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FED7D7',
  },
  actionModalOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionModalOptionText: {
    flex: 1,
  },
  actionOptionTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  actionOptionDesc: {
    ...typography.micro,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionModalCancelBtn: {
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.backgroundSecondary,
  },
  actionModalCancelText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
});

