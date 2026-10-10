import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
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
  CornerDownRight,
  HelpCircle,
  MessageSquare,
  FileText,
  Repeat,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { Avatar } from '../../components/core/Avatar';
import { Button } from '../../components/core/Button';
import { IconButton } from '../../components/core/IconButton';
import { Typography } from '../../components/core/Typography';
import { TopicChip } from '../../components/core/TopicChip';
import { EmptyState } from '../../components/feedback/EmptyState';
import { PostCard } from '../../components/cards/PostCard';
import { TrendingPaperCard } from '../../components/cards/TrendingPaperCard';
import { LikeIcon } from '../../components/core/LikeIcon';
import { ProfileAnalyticsBar } from '../../components/profile/ProfileAnalyticsBar';
import { ProfileAnalyticsModal } from '../../components/profile/ProfileAnalyticsModal';
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
import {
  fetchUserPosts,
  fetchSavedPostsAndPapers,
  fetchUserComments,
  UserCommentActivity,
  formatRelativeTime,
} from '../../api/socialService';
import { Post, Paper, CollaborationRequest } from '../../types';
import { ScholarPublication } from '../../types/scholar';
import { BooffInScholarsTab } from '../../components/profile/BooffInScholarsTab';
import { FollowListModal } from '../../components/modals/FollowListModal';
import { ImageCropperModal, CroppedImageResult } from '../../components/modals/ImageCropperModal';
import { AuthorCommunitiesModal } from '../../components/profile/AuthorCommunitiesModal';

export const DEFAULT_PROFILE_BANNER = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80';

export default function CurrentUserProfileScreen() {
  const storeUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshCurrentUserProfile = useAuthStore((s) => s.refreshCurrentUserProfile);
  const allPosts = usePostStore((s) => s.posts);
  const papers = usePaperStore((s) => s.papers);
  const savedPaperIds = usePaperStore((s) => s.savedPaperIds);
  const params = useLocalSearchParams<{ openAnalytics?: string; tab?: string; subFilter?: string }>();

  const [activeSubTab, setActiveSubTab] = useState<'Posts' | 'Saved' | 'Scholars' | 'Cited' | 'Activity'>(() => {
    if (params.tab) {
      const lower = params.tab.toLowerCase();
      if (lower === 'articles' || lower === 'article' || lower === 'hyped' || lower === 'shared' || lower === 'posts' || lower === 'post') {
        return 'Posts';
      }
      if (lower === 'saved') return 'Saved';
      if (lower === 'scholars' || lower === 'scholar') return 'Scholars';
      if (lower === 'cited') return 'Cited';
      if (lower === 'activity') return 'Activity';
    }
    return 'Posts';
  });
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
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [communitiesModalVisible, setCommunitiesModalVisible] = useState(false);

  // Automatically sync sub-tab or open research analytics modal if navigated via URL params (e.g. ?tab=Saved or ?tab=Articles)
  useEffect(() => {
    if (params.tab) {
      const lower = params.tab.toLowerCase();
      if (lower === 'articles' || lower === 'article') {
        setActiveSubTab('Posts');
        setPostsSubFilter('Articles');
      } else if (lower === 'hyped') {
        setActiveSubTab('Posts');
        setPostsSubFilter('Hyped');
      } else if (lower === 'shared') {
        setActiveSubTab('Posts');
        setPostsSubFilter('Shared');
      } else if (lower === 'saved') {
        setActiveSubTab('Saved');
      } else if (lower === 'scholars' || lower === 'scholar') {
        setActiveSubTab('Scholars');
      } else if (lower === 'posts' || lower === 'post') {
        setActiveSubTab('Posts');
      } else if (lower === 'cited') {
        setActiveSubTab('Cited');
      } else if (lower === 'activity') {
        setActiveSubTab('Activity');
      } else if (lower === 'analytics') {
        setAnalyticsModalOpen(true);
      }
    }

    if (params.subFilter) {
      const sfLower = params.subFilter.toLowerCase();
      if (sfLower === 'articles' || sfLower === 'article') {
        setActiveSubTab('Posts');
        setPostsSubFilter('Articles');
      } else if (sfLower === 'hyped') {
        setActiveSubTab('Posts');
        setPostsSubFilter('Hyped');
      } else if (sfLower === 'shared') {
        setActiveSubTab('Posts');
        setPostsSubFilter('Shared');
      } else if (sfLower === 'all') {
        setPostsSubFilter('All');
      }
    }

    if (
      params.openAnalytics === 'true' ||
      params.tab === 'Analytics' ||
      params.tab === 'analytics'
    ) {
      setAnalyticsModalOpen(true);
    }
  }, [params.openAnalytics, params.tab, params.subFilter]);

  // Support immediate in-page tab switching from desktop sidebars (Web only)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const handleCustomTab = (e: any) => {
        if (e.detail) {
          const lower = String(e.detail).toLowerCase();
          if (lower === 'activity') {
            setActiveSubTab('Activity');
          } else if (lower === 'articles' || lower === 'article') {
            setActiveSubTab('Posts');
            setPostsSubFilter('Articles');
          } else if (lower === 'hyped') {
            setActiveSubTab('Posts');
            setPostsSubFilter('Hyped');
          } else if (lower === 'shared') {
            setActiveSubTab('Posts');
            setPostsSubFilter('Shared');
          } else if (lower === 'saved') {
            setActiveSubTab('Saved');
          } else if (lower === 'scholars') {
            setActiveSubTab('Scholars');
          } else if (lower === 'posts') {
            setActiveSubTab('Posts');
          } else if (lower === 'cited') {
            setActiveSubTab('Cited');
          }
        }
      };
      window.addEventListener('booffin:set-profile-tab', handleCustomTab);
      return () => {
        if (typeof window.removeEventListener === 'function') {
          window.removeEventListener('booffin:set-profile-tab', handleCustomTab);
        }
      };
    }
  }, []);

  const [cropperState, setCropperState] = useState<{
    visible: boolean;
    imageUri: string | null;
    cropType: 'avatar' | 'banner';
  }>({
    visible: false,
    imageUri: null,
    cropType: 'avatar',
  });

  const user = storeUser;

  const handlePickAndUploadAvatar = async () => {
    setAvatarModalOpen(false);
    if (!user?.id) return;

    const res = await pickAvatarImage();
    if (res.cancelled || !res.asset) return;

    setCropperState({
      visible: true,
      imageUri: res.asset.uri,
      cropType: 'avatar',
    });
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

    setCropperState({
      visible: true,
      imageUri: res.asset.uri,
      cropType: 'banner',
    });
  };

  const handleCropperSave = async (cropped: CroppedImageResult) => {
    setCropperState((prev) => ({ ...prev, visible: false }));
    if (!user?.id) return;

    if (cropperState.cropType === 'avatar') {
      setIsUploadingAvatar(true);
      const uploadRes = await uploadProfileAvatar(user.id, cropped as any);
      setIsUploadingAvatar(false);

      if (!uploadRes.success) {
        Alert.alert('Upload Failed', uploadRes.error || 'Could not upload profile photo.');
      }
    } else {
      setIsUploadingBanner(true);
      const uploadRes = await uploadProfileBanner(user.id, cropped as any);
      setIsUploadingBanner(false);

      if (!uploadRes.success) {
        Alert.alert('Upload Failed', uploadRes.error || 'Could not upload banner.');
      }
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
  const [postsSubFilter, setPostsSubFilter] = useState<'All' | 'Hyped' | 'Articles' | 'Shared'>(() => {
    const tabLower = (params.tab || '').toLowerCase();
    const sfLower = (params.subFilter || '').toLowerCase();
    if (tabLower === 'articles' || tabLower === 'article' || sfLower === 'articles' || sfLower === 'article') {
      return 'Articles';
    }
    if (tabLower === 'hyped' || sfLower === 'hyped') {
      return 'Hyped';
    }
    if (tabLower === 'shared' || sfLower === 'shared') {
      return 'Shared';
    }
    return 'All';
  });
  const [userComments, setUserComments] = useState<UserCommentActivity[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [activitySubFilter, setActivitySubFilter] = useState<'All' | 'Discussions' | 'Questions' | 'Replies'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postsRenderLimit, setPostsRenderLimit] = useState(12);
  const [activityRenderLimit, setActivityRenderLimit] = useState(15);

  const loadedTabsRef = React.useRef<{ saved: boolean; activity: boolean }>({
    saved: false,
    activity: false,
  });

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

  const loadUserComments = React.useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingComments(true);
    const res = await fetchUserComments(user.id);
    if (res.comments) {
      setUserComments(res.comments);
    }
    setIsLoadingComments(false);
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
      // Synchronize into usePaperStore so every save icon across the app knows they are saved
      const storeState = usePaperStore.getState();
      const nextIds = new Set(storeState.savedPaperIds);
      res.papers.forEach((p) => {
        nextIds.add(p.id);
        if (p.doi) nextIds.add(p.doi);
      });
      usePaperStore.setState({
        savedPaperIds: nextIds,
        papers: [
          ...res.papers.filter((rp) => !storeState.papers.some((p) => p.id === rp.id)),
          ...storeState.papers,
        ],
      });
    }
    setIsLoadingSaved(false);
  }, [user?.id]);

  // Initial mount: load only active/primary post feed & collaboration requests to keep UI thread nimble
  React.useEffect(() => {
    loadRequests();
    loadUserPosts();
  }, [loadRequests, loadUserPosts]);

  // Lazy-load Saved items only when user navigates to Saved tab
  React.useEffect(() => {
    if (activeSubTab === 'Saved' && !loadedTabsRef.current.saved) {
      loadedTabsRef.current.saved = true;
      loadSavedItems();
    }
  }, [activeSubTab, loadSavedItems]);

  // Lazy-load Activity comments only when user navigates to Activity tab
  React.useEffect(() => {
    if (activeSubTab === 'Activity' && !loadedTabsRef.current.activity) {
      loadedTabsRef.current.activity = true;
      loadUserComments();
    }
  }, [activeSubTab, loadUserComments]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const promises: Promise<any>[] = [
      refreshCurrentUserProfile(),
      loadUserPosts(),
      loadRequests(),
    ];
    if (activeSubTab === 'Saved' || loadedTabsRef.current.saved) {
      promises.push(loadSavedItems());
    }
    if (activeSubTab === 'Activity' || loadedTabsRef.current.activity) {
      promises.push(loadUserComments());
    }
    await Promise.all(promises);
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

  // Combine database saved papers with store saved papers, respecting unsaved state
  const displaySavedPapers = useMemo(() => {
    const combinedMap = new Map<string, Paper>();
    savedPapersDb.forEach((p) => {
      const isUnsaved =
        savedPaperIds.size > 0 &&
        !savedPaperIds.has(p.id) &&
        (!p.doi || !savedPaperIds.has(p.doi));
      if (!isUnsaved) {
        combinedMap.set(p.id, p);
      }
    });
    papers.forEach((p) => {
      if (savedPaperIds.has(p.id) || (p.doi && savedPaperIds.has(p.doi)) || p.isSaved) {
        combinedMap.set(p.id, p);
      }
    });
    return Array.from(combinedMap.values());
  }, [savedPapersDb, papers, savedPaperIds]);

  // Unified chronological user activity feed (discussions, questions, and replies)
  const unifiedActivities = useMemo(() => {
    type ActivityItem =
      | {
          id: string;
          kind: 'discussion' | 'question' | 'article';
          createdAt: string;
          timestamp: number;
          post: Post;
        }
      | {
          id: string;
          kind: 'reply';
          createdAt: string;
          timestamp: number;
          comment: UserCommentActivity;
        };

    const items: ActivityItem[] = [];

    // Add user's discussions, questions, and articles
    userPosts.forEach((post) => {
      let kind: 'discussion' | 'question' | 'article' = 'discussion';
      if (post.postType === 'question') kind = 'question';
      else if (post.postType === 'article') kind = 'article';
      else kind = 'discussion';

      let ts = 0;
      if (post.rawCreatedAt) {
        ts = new Date(post.rawCreatedAt).getTime();
      }
      if (!ts || isNaN(ts)) {
        ts = Date.now();
      }

      items.push({
        id: `post_${post.id}`,
        kind,
        createdAt: post.createdAt,
        timestamp: ts,
        post,
      });
    });

    // Add user's replies & comments
    userComments.forEach((c) => {
      const ts = new Date(c.createdAt).getTime();
      items.push({
        id: `comment_${c.id}`,
        kind: 'reply',
        createdAt: formatRelativeTime(c.createdAt),
        timestamp: isNaN(ts) ? 0 : ts,
        comment: c,
      });
    });

    // Sort descending by timestamp (chronological order)
    items.sort((a, b) => b.timestamp - a.timestamp);

    return items;
  }, [userPosts, userComments]);

  const filteredActivities = useMemo(() => {
    if (activitySubFilter === 'Discussions') {
      return unifiedActivities.filter((it) => it.kind === 'discussion' || it.kind === 'article');
    }
    if (activitySubFilter === 'Questions') {
      return unifiedActivities.filter((it) => it.kind === 'question');
    }
    if (activitySubFilter === 'Replies') {
      return unifiedActivities.filter((it) => it.kind === 'reply');
    }
    return unifiedActivities;
  }, [unifiedActivities, activitySubFilter]);

  const activityCounts = useMemo(() => {
    const discussions = unifiedActivities.filter((it) => it.kind === 'discussion' || it.kind === 'article').length;
    const questions = unifiedActivities.filter((it) => it.kind === 'question').length;
    const replies = unifiedActivities.filter((it) => it.kind === 'reply').length;
    return {
      All: unifiedActivities.length,
      Discussions: discussions,
      Questions: questions,
      Replies: replies,
    };
  }, [unifiedActivities]);

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

  const handleSharePaperToFeed = (pub: ScholarPublication) => {
    const paperAttachment: Paper = {
      id: pub.id,
      title: pub.title,
      authors:
        pub.authors && pub.authors.length > 0
          ? pub.authors.map((name) => ({ name }))
          : [{ name: user?.fullName || 'Author' }],
      journal: pub.journalName || 'Verified Scholar Publication',
      publicationYear: pub.publicationYear || new Date().getFullYear(),
      doi: pub.doi,
      canonicalUrl: pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : 'https://booffin.com'),
      openAccessUrl: pub.openAccessPdfUrl || pub.url,
      abstract: pub.abstract || '',
      isOpenAccess: Boolean(pub.isOpenAccess || pub.openAccessPdfUrl),
      topics: pub.topics || [],
      citationCount: pub.citationCount || 0,
      discussionCount: 0,
      likesCount: 0,
      savesCount: 0,
    };

    router.push({
      pathname: '/(tabs)/create',
      params: {
        paperData: JSON.stringify(paperAttachment),
        initialContent: `Sharing my paper: "${pub.title}". Welcoming peer feedback, questions, and discussions from fellow researchers!`,
      },
    });
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
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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

          {/* RESEARCH IMPACT & ANALYTICS BAR (Compact Single Row, Private to Owner) */}
          <ProfileAnalyticsBar
            totalViews={Math.max(
              posts.length * 115 +
                posts.reduce((acc: number, p) => acc + (p.likesCount || 0), 0) * 5 +
                posts.reduce((acc: number, p) => acc + (p.commentsCount || 0), 0) * 8,
              posts.length > 0 ? 120 : 0
            )}
            onPress={() => setAnalyticsModalOpen(true)}
          />

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

          {/* Join User Community Button */}
          <TouchableOpacity
            style={styles.joinCommunityBox}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setCommunitiesModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Users size={13} color="#FFFFFF" />
            <Text style={styles.joinCommunityText}>
              Join {user.fullName ? `${user.fullName.split(' ')[0]}'s` : 'My'} Community
            </Text>
          </TouchableOpacity>

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

        {/* Sub-Tabs: Posts | Saved | Scholars | Cited | Activity */}
        <View style={styles.tabsRow}>
          {(['Posts', 'Saved', 'Scholars', 'Cited', 'Activity'] as const).map((tab) => {
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
                    {tab === 'Scholars' ? 'Scholars' : tab}
                  </Text>
                  {tab === 'Scholars' && user.orcidVerified && (
                    <View style={styles.scholarTabBadge}>
                      <CheckCircle2 size={11} color="#16A34A" />
                    </View>
                  )}
                  {tab === 'Saved' && (displaySavedPosts.length + displaySavedPapers.length) > 0 && (
                    <View style={[styles.tabBadge, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.borderLight }]}>
                      <Text style={[styles.tabBadgeText, { color: colors.textSecondary }]}>
                        {displaySavedPosts.length + displaySavedPapers.length}
                      </Text>
                    </View>
                  )}
                  {tab === 'Activity' && unifiedActivities.length > 0 && (
                    <View style={[styles.tabBadge, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.borderLight }]}>
                      <Text style={[styles.tabBadgeText, { color: colors.textSecondary }]}>
                        {unifiedActivities.length}
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
            {/* Filter Chips: All | Hyped | Articles | Shared */}
            <View style={styles.savedFilterRow}>
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
                      styles.savedFilterChip,
                      postsSubFilter === filter && styles.savedFilterChipActive,
                    ]}
                    onPress={() => setPostsSubFilter(filter)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.savedFilterChipText,
                        postsSubFilter === filter && styles.savedFilterChipTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                    <View
                      style={[
                        styles.savedFilterCountBadge,
                        postsSubFilter === filter && styles.savedFilterCountBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.savedFilterCountText,
                          postsSubFilter === filter && styles.savedFilterCountTextActive,
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
                  Loading discussions & shares...
                </Text>
              </View>
            ) : displayFilteredPosts.length > 0 ? (
              <>
                {displayFilteredPosts.slice(0, postsRenderLimit).map((p) => <PostCard key={p.id} post={p} />)}
                {displayFilteredPosts.length > postsRenderLimit && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => setPostsRenderLimit((prev) => prev + 12)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.loadMoreButtonText}>
                      Show more posts ({displayFilteredPosts.length - postsRenderLimit} remaining)
                    </Text>
                  </TouchableOpacity>
                )}
              </>
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
                    : 'No posts published yet'
                }
                description={
                  postsSubFilter === 'Articles'
                    ? 'Long-form research articles and reviews you publish will appear here.'
                    : postsSubFilter === 'Shared'
                    ? 'Research papers, DOI preprints, and posts you share will appear here.'
                    : postsSubFilter === 'Hyped'
                    ? 'Posts with the highest impact and engagement will be ranked here.'
                    : 'Share research insights, preprints, or methodology questions with the scientific community.'
                }
                actionTitle={postsSubFilter === 'All' ? 'Create First Post' : undefined}
                onAction={postsSubFilter === 'All' ? () => router.push('/(tabs)/create') : undefined}
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

        {activeSubTab === 'Scholars' && (
          <BooffInScholarsTab
            userId={user.id}
            isCurrentUser={true}
            userFullName={user.fullName}
            orcidId={user.orcidId}
            orcidVerified={user.orcidVerified}
            onSharePaperToFeed={handleSharePaperToFeed}
          />
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
            {/* Filter Chips: All | Discussions | Questions | Replies */}
            <View style={styles.savedFilterRow}>
              {(['All', 'Discussions', 'Questions', 'Replies'] as const).map((filter) => {
                const count = activityCounts[filter];
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.savedFilterChip,
                      activitySubFilter === filter && styles.savedFilterChipActive,
                    ]}
                    onPress={() => {
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {}
                      setActivitySubFilter(filter);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.savedFilterChipText,
                        activitySubFilter === filter && styles.savedFilterChipTextActive,
                      ]}
                    >
                      {filter}
                    </Text>
                    <View
                      style={[
                        styles.savedFilterCountBadge,
                        activitySubFilter === filter && styles.savedFilterCountBadgeActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.savedFilterCountText,
                          activitySubFilter === filter && styles.savedFilterCountTextActive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isLoadingPosts || isLoadingComments ? (
              <View style={{ paddingVertical: spacing.xl * 2, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="small" color={colors.accentBlue} />
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm }}>
                  Loading recent activity...
                </Text>
              </View>
            ) : filteredActivities.length === 0 ? (
              <EmptyState
                icon="TrendingUp"
                title={
                  activitySubFilter === 'All'
                    ? 'Recent Activity'
                    : `No ${activitySubFilter.toLowerCase()} yet`
                }
                description={
                  activitySubFilter === 'All'
                    ? 'Your recent discussions, questions, and replies will appear here in chronological order.'
                    : `Your ${activitySubFilter.toLowerCase()} will appear here once published.`
                }
                actionTitle={activitySubFilter === 'Replies' ? 'Explore Feed' : 'Start a Discussion'}
                onAction={() =>
                  activitySubFilter === 'Replies'
                    ? router.push('/(tabs)')
                    : router.push('/(tabs)/create')
                }
              />
            ) : (
              <View style={styles.activityItemsList}>
                {filteredActivities.slice(0, activityRenderLimit).map((item) => {
                  if (item.kind === 'reply') {
                    const c = item.comment;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.activityCard}
                        onPress={() => {
                          try {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          } catch {}
                          router.push({
                            pathname: '/post/[id]',
                            params: { id: c.postId },
                          });
                        }}
                        activeOpacity={0.88}
                      >
                        {/* Header Badge & Time */}
                        <View style={styles.activityCardHeader}>
                          <View
                            style={[
                              styles.activityBadge,
                              {
                                backgroundColor: 'rgba(5, 150, 105, 0.08)',
                                borderColor: 'rgba(5, 150, 105, 0.2)',
                              },
                            ]}
                          >
                            <CornerDownRight size={13} color="#059669" strokeWidth={2.2} />
                            <Text style={[styles.activityBadgeText, { color: '#059669' }]}>
                              Replied to Discussion
                            </Text>
                          </View>
                          <View style={styles.activityTimeRow}>
                            <Clock size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
                            <Text style={styles.activityTimeText}>{item.createdAt}</Text>
                          </View>
                        </View>

                        {/* In response to target post */}
                        {c.postTitle && (
                          <View style={styles.activityContextRow}>
                            <Text style={styles.activityContextLabel} numberOfLines={1}>
                              In discussion:{' '}
                              <Text style={styles.activityContextTitle}>{c.postTitle}</Text>
                            </Text>
                          </View>
                        )}

                        {/* Reply content quote bubble */}
                        <View style={styles.activityReplyBubble}>
                          <Text style={styles.activityReplyContent} numberOfLines={4}>
                            "{c.content}"
                          </Text>
                        </View>

                        {/* Footer */}
                        <View style={styles.activityFooterRow}>
                          <View style={styles.activityStatsGroup}>
                            <View style={styles.activityStatItem}>
                              <LikeIcon size={14} color={colors.textMuted} />
                              <Text style={styles.activityStatNumber}>{c.likesCount || 0}</Text>
                            </View>
                          </View>
                          <Text style={styles.activityViewThreadText}>
                            View discussion thread →
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }

                  // It's a post (discussion, question, article)
                  const p = item.post;
                  const isQuestion = item.kind === 'question';
                  const isArticle = item.kind === 'article';

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.activityCard}
                      onPress={() => {
                        try {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        } catch {}
                        router.push({
                          pathname: '/post/[id]',
                          params: { id: p.id },
                        });
                      }}
                      activeOpacity={0.88}
                    >
                      {/* Header Badge & Time */}
                      <View style={styles.activityCardHeader}>
                        <View
                          style={[
                            styles.activityBadge,
                            isQuestion
                              ? {
                                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                                  borderColor: 'rgba(37, 99, 235, 0.2)',
                                }
                              : isArticle
                              ? {
                                  backgroundColor: 'rgba(124, 58, 237, 0.08)',
                                  borderColor: 'rgba(124, 58, 237, 0.2)',
                                }
                              : {
                                  backgroundColor: 'rgba(6, 78, 59, 0.08)',
                                  borderColor: 'rgba(6, 78, 59, 0.2)',
                                },
                          ]}
                        >
                          {isQuestion ? (
                            <HelpCircle size={13} color="#2563EB" strokeWidth={2.2} />
                          ) : isArticle ? (
                            <FileText size={13} color="#7C3AED" strokeWidth={2.2} />
                          ) : (
                            <MessageSquare size={13} color="#064E3B" strokeWidth={2.2} />
                          )}
                          <Text
                            style={[
                              styles.activityBadgeText,
                              {
                                color: isQuestion
                                  ? '#2563EB'
                                  : isArticle
                                  ? '#7C3AED'
                                  : '#064E3B',
                              },
                            ]}
                          >
                            {isQuestion
                              ? 'Asked a Question'
                              : isArticle
                              ? 'Published Article'
                              : 'Started a Discussion'}
                          </Text>
                        </View>
                        <View style={styles.activityTimeRow}>
                          <Clock size={11} color={colors.textMuted} style={{ marginRight: 4 }} />
                          <Text style={styles.activityTimeText}>{p.createdAt}</Text>
                        </View>
                      </View>

                      {/* Title if present */}
                      {p.article?.title ? (
                        <Text style={styles.activityPostTitle} numberOfLines={2}>
                          {p.article.title}
                        </Text>
                      ) : null}

                      {/* Content snippet */}
                      <Text style={styles.activityPostContent} numberOfLines={3}>
                        {p.content}
                      </Text>

                      {/* Paper snippet if attached */}
                      {p.paper && (
                        <View style={styles.activityPaperSnippet}>
                          <FileText size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                          <Text style={styles.activityPaperTitle} numberOfLines={1}>
                            {p.paper.title}
                          </Text>
                        </View>
                      )}

                      {/* Footer */}
                      <View style={styles.activityFooterRow}>
                        <View style={styles.activityStatsGroup}>
                          <View style={styles.activityStatItem}>
                            <LikeIcon size={14} color={colors.textMuted} />
                            <Text style={styles.activityStatNumber}>{p.likesCount || 0}</Text>
                          </View>
                          <View style={styles.activityStatItem}>
                            <MessageSquare size={14} color={colors.textMuted} />
                            <Text style={styles.activityStatNumber}>{p.commentsCount || 0}</Text>
                          </View>
                          <View style={styles.activityStatItem}>
                            <Repeat size={14} color={colors.textMuted} />
                            <Text style={styles.activityStatNumber}>{p.repostsCount || 0}</Text>
                          </View>
                        </View>
                        <Text style={styles.activityViewThreadText}>Open discussion →</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {filteredActivities.length > activityRenderLimit && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={() => setActivityRenderLimit((prev) => prev + 15)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.loadMoreButtonText}>
                      Show more activity ({filteredActivities.length - activityRenderLimit} remaining)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Avatar Action Modal */}
      {avatarModalOpen && (
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
      )}

      {/* Banner Action Modal */}
      {bannerModalOpen && (
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
      )}

      {/* Followers & Following List Modal */}
      {followModalVisible && (
        <FollowListModal
          visible={followModalVisible}
          onClose={() => setFollowModalVisible(false)}
          userId={user.id}
          type={followModalType}
          userName={user.fullName}
        />
      )}

      {/* Interactive Image Cropper Modal */}
      {cropperState.visible && (
        <ImageCropperModal
          visible={cropperState.visible}
          imageUri={cropperState.imageUri}
          cropType={cropperState.cropType}
          onSave={handleCropperSave}
          onCancel={() => setCropperState((prev) => ({ ...prev, visible: false }))}
        />
      )}

      {/* Comprehensive Profile Analytics Modal */}
      {analyticsModalOpen && (
        <ProfileAnalyticsModal
          visible={analyticsModalOpen}
          userId={user.id}
          userFullName={user.fullName}
          onClose={() => setAnalyticsModalOpen(false)}
        />
      )}

      {/* Author Communities Modal */}
      {user && (
        <AuthorCommunitiesModal
          visible={communitiesModalVisible}
          onClose={() => setCommunitiesModalVisible(false)}
          authorId={user.id}
          authorName={user.fullName || 'Researcher'}
          authorAvatarUrl={user.avatarUrl}
          isOwnProfile={true}
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
  joinCommunityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#064E3B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginTop: -4,
    marginBottom: spacing.md,
  },
  joinCommunityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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
  scholarTabBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 4,
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
  activityItemsList: {
    width: '100%',
  },
  activityCard: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  activityBadgeText: {
    ...typography.micro,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  activityTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTimeText: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 12,
  },
  activityPostTitle: {
    ...typography.captionBold,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  activityPostContent: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  activityPaperSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  activityPaperTitle: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  activityContextRow: {
    marginBottom: spacing.xs,
  },
  activityContextLabel: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 12,
  },
  activityContextTitle: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activityReplyBubble: {
    backgroundColor: colors.backgroundSecondary,
    borderLeftWidth: 3,
    borderLeftColor: colors.brandGreen,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  activityReplyContent: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 13.5,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  activityFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  activityStatsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityStatNumber: {
    ...typography.micro,
    color: colors.textMuted,
    fontSize: 12,
  },
  activityViewThreadText: {
    ...typography.captionBold,
    color: colors.accentBlue,
    fontSize: 12,
    fontWeight: '600',
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
  loadMoreButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  loadMoreButtonText: {
    ...typography.captionBold,
    color: colors.accentBlue,
    fontSize: 13,
  },
});

