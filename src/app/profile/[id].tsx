import React, { useState, useEffect, useCallback } from 'react';
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
import { ConnectModal } from '../../components/modals/ConnectModal';
import { useAuthStore } from '../../store/useAuthStore';
import { usePostStore } from '../../store/usePostStore';
import {
  getConnectionStatus,
  getSharedResearchInterests,
  getResearcherDiscussedTopics,
} from '../../api/connectionService';
import { fetchUserProfile, fetchUserProfileByUsername } from '../../api/authService';
import { ConnectionStatus, UserProfile } from '../../types';
import { AppHeader } from '../../components/layout/AppHeader';
import { FollowListModal } from '../../components/modals/FollowListModal';

export default function OtherResearcherProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);
  const allPosts = usePostStore((s) => s.posts);

  const [researcher, setResearcher] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'Posts' | 'Papers' | 'Activity'>('Posts');
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');

  const isFollowing = useAuthStore((s) => researcher?.id ? s.followingIds.has(researcher.id) : false);
  const isFollowLoading = useAuthStore((s) => researcher?.id ? s.followLoadingIds.has(researcher.id) : false);

  useEffect(() => {
    async function loadProfile() {
      if (!id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const cleanId = id.trim().replace(/^@/, '').toLowerCase();
      if (id === currentUser.id || cleanId === currentUser.handle?.toLowerCase()) {
        setResearcher(currentUser);
        setIsLoading(false);
        return;
      }

      let prof = await fetchUserProfile(id, currentUser?.id);
      if (!prof) {
        prof = await fetchUserProfileByUsername(cleanId, currentUser?.id);
      }
      if (prof && prof.isFollowing) {
        useAuthStore.setState((state) => {
          if (!state.followingIds.has(prof.id)) {
            const next = new Set(state.followingIds);
            next.add(prof.id);
            return { followingIds: next };
          }
          return state;
        });
      }
      setResearcher(prof);
      setIsLoading(false);
    }

    loadProfile();
  }, [id, currentUser?.id, currentUser?.handle]);

  const isOwnProfile = researcher?.id === currentUser?.id;

  const loadConnectionStatus = useCallback(async () => {
    if (!researcher?.id || isOwnProfile || !currentUser?.id) return;
    const status = await getConnectionStatus(currentUser.id, researcher.id);
    setConnectionStatus(status);
  }, [currentUser?.id, researcher?.id, isOwnProfile]);

  useEffect(() => {
    loadConnectionStatus();
  }, [loadConnectionStatus]);

  const posts = React.useMemo(() => {
    if (!researcher?.id) return [];
    return allPosts.filter((p) => p.author.id === researcher.id);
  }, [allPosts, researcher?.id]);

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

  const handleConnectPress = () => {
    if (isOwnProfile || !researcher?.id) return;
    try {
      Haptics.selectionAsync();
    } catch {}
    setConnectModalVisible(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <AppHeader showBack title="Researcher Profile" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ ...typography.caption, color: colors.textSecondary }}>Loading researcher profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!researcher) {
    return (
      <SafeAreaView style={styles.safeArea}>
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

              {/* Connect Button (Separate from Follow) */}
              {!isOwnProfile && (
                <TouchableOpacity
                  style={[
                    styles.connectButton,
                    connectionStatus === 'connected' && styles.connectButtonConnected,
                    connectionStatus === 'pending_sent' && styles.connectButtonPending,
                    connectionStatus === 'pending_received' && styles.connectButtonAction,
                  ]}
                  onPress={handleConnectPress}
                  activeOpacity={0.8}
                >
                  {connectionStatus === 'connected' ? (
                    <>
                      <Users size={13} color="#059669" style={{ marginRight: 4 }} />
                      <Text style={styles.connectButtonTextConnected}>Connected</Text>
                    </>
                  ) : connectionStatus === 'pending_sent' ? (
                    <>
                      <Clock size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
                      <Text style={styles.connectButtonTextPending}>Request Sent</Text>
                    </>
                  ) : connectionStatus === 'pending_received' ? (
                    <>
                      <Sparkles size={13} color={colors.white} style={{ marginRight: 4 }} />
                      <Text style={styles.connectButtonTextAction}>Respond</Text>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} color={colors.textPrimary} style={{ marginRight: 4 }} />
                      <Text style={styles.connectButtonText}>Connect</Text>
                    </>
                  )}
                </TouchableOpacity>
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

      {/* Connect & Collaboration Request Modal */}
      {!isOwnProfile && (
        <ConnectModal
          visible={connectModalVisible}
          onClose={() => {
            setConnectModalVisible(false);
            loadConnectionStatus();
          }}
          recipient={researcher}
          onSuccess={loadConnectionStatus}
        />
      )}

      {/* Followers & Following List Modal */}
      <FollowListModal
        visible={followModalVisible}
        onClose={() => setFollowModalVisible(false)}
        userId={researcher.id}
        type={followModalType}
        userName={researcher.fullName}
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
    minWidth: 84,
    borderRadius: radii.full,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
  },
  connectButtonConnected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  connectButtonPending: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderLight,
  },
  connectButtonAction: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  connectButtonText: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 12,
  },
  connectButtonTextConnected: {
    ...typography.captionBold,
    color: '#059669',
    fontSize: 12,
  },
  connectButtonTextPending: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 12,
  },
  connectButtonTextAction: {
    ...typography.captionBold,
    color: colors.white,
    fontSize: 12,
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

