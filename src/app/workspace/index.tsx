import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  StatusBar,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  MessageSquare,
  Users,
  Shield,
  Plus,
  Search,
  Compass,
  ArrowLeft,
  X,
  UserPlus,
  CheckCircle2,
  Check,
  CheckCheck,
  Phone,
  Sparkles,
  Layers,
  Bell,
  BellOff,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, useColors, useIsDark } from '../../theme';
import { WorkspaceCard } from '../../components/workspace/WorkspaceCard';
import { Avatar } from '../../components/core/Avatar';
import { CreateWorkspaceModal } from '../../components/workspace/CreateWorkspaceModal';
import { CreateCommunityModal } from '../../components/workspace/CreateCommunityModal';
import { AddInterestsModal } from '../../components/modals/AddInterestsModal';
import { WorkspaceDMView } from '../../components/workspace/WorkspaceDMView';
import { WorkspaceCommunityView } from '../../components/workspace/WorkspaceCommunityView';
import { WorkspaceInnerCircleView } from '../../components/workspace/WorkspaceInnerCircleView';
import { WorkspaceSettingsView } from '../../components/workspace/WorkspaceSettingsView';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useWorkspaceSettingsStore } from '../../store/useWorkspaceSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { Workspace } from '../../types/workspace';

export type WorkspaceTabType = 'dm' | 'community' | 'inner_circle' | 'settings';

export default function WorkspaceHubScreen() {
  const colors = useColors();
  const isDark = useIsDark();
  const { isDesktop } = useResponsiveLayout();
  const currentUser = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom || 0;

  // Workspace Store Data
  const dms = useWorkspaceStore((s) => s.dms);
  const communities = useWorkspaceStore((s) => s.communities);
  const innerCircles = useWorkspaceStore((s) => s.innerCircles);
  const discoverableCommunities = useWorkspaceStore((s) => s.discoverableCommunities);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const isRefreshing = useWorkspaceStore((s) => s.isRefreshing);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const joinCommunity = useWorkspaceStore((s) => s.joinCommunity);
  const subscribeToGlobalWorkspaceUpdates = useWorkspaceStore((s) => s.subscribeToGlobalWorkspaceUpdates);
  const markAsRead = useWorkspaceStore((s) => s.markAsRead);

  // Active Mobile / Desktop Tab: Strictly 3 Tabs
  const [activeTab, setActiveTab] = useState<WorkspaceTabType>('dm');

  // DM sub-toggle: "all" vs "archived" (Phase 4)
  const [dmFilter, setDmFilter] = useState<'all' | 'archived'>('all');

  // Community sub-toggle: "Your Community" vs "Joined Community"
  const [communitySubFilter, setCommunitySubFilter] = useState<'your' | 'joined'>('your');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [showAddInterestsModal, setShowAddInterestsModal] = useState(false);
  const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(null);

  // Desktop active selected workspace for 3-pane layout
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Desktop Collapsible Columns State
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(false);
  const [isMiddleColCollapsed, setIsMiddleColCollapsed] = useState(false);

  useEffect(() => {
    loadWorkspaces();
    useWorkspaceSettingsStore.getState().loadSettings(currentUser?.id);
    if (currentUser?.id) {
      const unsubscribe = subscribeToGlobalWorkspaceUpdates(currentUser.id);
      return () => {
        unsubscribe();
      };
    }
  }, [currentUser?.id]);

  const handleRefresh = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadWorkspaces(true);
  }, [loadWorkspaces]);

  // Normalized user research interests from profile
  const userInterests = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(currentUser?.researchInterests)) {
      currentUser.researchInterests.forEach((ri) => {
        if (typeof ri === 'string' && ri.trim()) list.push(ri.trim());
      });
    }
    if (currentUser?.primaryField && typeof currentUser.primaryField === 'string' && currentUser.primaryField.trim()) {
      list.push(currentUser.primaryField.trim());
    }
    if (Array.isArray(currentUser?.secondaryFields)) {
      currentUser.secondaryFields.forEach((sf) => {
        if (typeof sf === 'string' && sf.trim()) list.push(sf.trim());
      });
    }
    if (currentUser?.academicTitle && typeof currentUser.academicTitle === 'string' && currentUser.academicTitle.trim()) {
      list.push(currentUser.academicTitle.trim());
    }
    return Array.from(new Set(list));
  }, [currentUser?.researchInterests, currentUser?.primaryField, currentUser?.secondaryFields, currentUser?.academicTitle]);

  // Suggested Communities: Filtered strictly to user's research interests with zero extra backend egress
  const suggestedCommunities = useMemo(() => {
    if (activeTab !== 'community') return [];

    const joinedIds = new Set(communities.map((c) => c.id));
    const unjoined = discoverableCommunities.filter(
      (dc) =>
        !joinedIds.has(dc.id) &&
        dc.owner_id !== currentUser?.id &&
        dc.creator_id !== currentUser?.id &&
        !dc.is_disabled &&
        dc.status !== 'disabled' &&
        !dc.settings?.is_disabled
    );

    const query = searchQuery.trim().toLowerCase();
    const results: Array<{ community: Workspace; matchedTag?: string }> = [];

    for (const comm of unjoined) {
      if (query) {
        const nameMatches = (comm.name || '').toLowerCase().includes(query);
        const descMatches = (comm.description || '').toLowerCase().includes(query);
        if (!nameMatches && !descMatches) continue;
      }

      // Check against user's research interests
      const commTopics: string[] = [];
      if (Array.isArray(comm.topics)) commTopics.push(...comm.topics);
      if (Array.isArray(comm.research_fields)) commTopics.push(...comm.research_fields);
      if (Array.isArray(comm.settings?.topics)) commTopics.push(...comm.settings.topics);
      if (Array.isArray(comm.settings?.research_fields)) commTopics.push(...comm.settings.research_fields);
      if (typeof comm.topic_tag === 'string' && comm.topic_tag.trim()) {
        commTopics.push(comm.topic_tag.trim());
      }

      const nameLower = (comm.name || '').toLowerCase();
      const descLower = (comm.description || '').toLowerCase();

      let isMatch = false;
      let matchedTag: string | undefined = undefined;

      for (const rawInterest of userInterests) {
        const interest = rawInterest.toLowerCase().trim();
        if (!interest) continue;

        // Check direct topic tag matches
        for (const rawCt of commTopics) {
          if (typeof rawCt !== 'string') continue;
          const ct = rawCt.toLowerCase().trim();
          if (ct && (ct.includes(interest) || interest.includes(ct))) {
            isMatch = true;
            matchedTag = rawCt;
            break;
          }
        }
        if (isMatch) break;

        // Check name or description for keyword / stem match
        if (interest.length >= 3) {
          if (nameLower.includes(interest) || descLower.includes(interest)) {
            isMatch = true;
            matchedTag = rawInterest;
            break;
          }
          const rootWords = interest.split(/[\s,/-]+/).filter((w) => w.length >= 4);
          for (const root of rootWords) {
            if (nameLower.includes(root) || descLower.includes(root)) {
              isMatch = true;
              matchedTag = rawInterest;
              break;
            }
          }
          if (isMatch) break;
        }
      }

      if (isMatch) {
        results.push({ community: comm, matchedTag });
      }
    }

    return results;
  }, [activeTab, communities, discoverableCommunities, currentUser?.id, userInterests, searchQuery]);

  // Active items based on active tab
  const activeItems = useMemo(() => {
    let list: Workspace[] = [];
    if (activeTab === 'dm') {
      list = dmFilter === 'archived'
        ? dms.filter((d) => Boolean(d.is_archived))
        : dms.filter((d) => !d.is_archived);
    } else if (activeTab === 'community') {
      if (communitySubFilter === 'your') {
        list = communities.filter((c) => c.owner_id === currentUser?.id || c.creator_id === currentUser?.id);
      } else {
        list = communities.filter((c) => c.owner_id !== currentUser?.id && c.creator_id !== currentUser?.id);
      }
    } else if (activeTab === 'inner_circle') {
      list = innerCircles;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((w) => {
      const name = (w.other_user?.fullName || w.name || '').toLowerCase();
      const desc = (w.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [activeTab, dmFilter, communitySubFilter, dms, communities, innerCircles, discoverableCommunities, currentUser?.id, searchQuery]);

  const selectedWorkspace = useMemo(() => {
    if (selectedWorkspaceId) {
      const matchInActive = activeItems.find((w) => w.id === selectedWorkspaceId);
      if (matchInActive) return matchInActive;
    }
    return activeItems[0] || null;
  }, [selectedWorkspaceId, activeItems]);

  const totalDMsUnread = dms.reduce((acc, d) => acc + (d.unread_count || 0), 0);
  const totalCommsUnread = communities.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const totalInnersUnread = innerCircles.reduce((acc, i) => acc + (i.unread_count || 0), 0);

  const handleSelectWorkspace = useCallback((wsId: string) => {
    markAsRead(wsId);
    if (isDesktop) {
      setSelectedWorkspaceId(wsId);
    } else {
      router.push(`/workspace/${wsId}` as any);
    }
  }, [isDesktop, markAsRead]);

  // Auto-clear unread notification when workspace is viewed in the canvas
  useEffect(() => {
    if (selectedWorkspace?.id && (selectedWorkspace.unread_count || 0) > 0) {
      markAsRead(selectedWorkspace.id);
    }
  }, [selectedWorkspace?.id, selectedWorkspace?.unread_count, markAsRead]);

  // If selected workspace was deleted or removed from active workspaces, reset selection
  useEffect(() => {
    if (selectedWorkspaceId) {
      const exists = [...dms, ...communities, ...innerCircles, ...discoverableCommunities].some(
        (w) => w.id === selectedWorkspaceId
      );
      if (!exists) {
        setSelectedWorkspaceId(null);
      }
    }
  }, [selectedWorkspaceId, dms, communities, innerCircles, discoverableCommunities]);

  const [isDMsMuted, setIsDMsMuted] = useState(false);

  // Header Title & Actions tailored to each tab
  const renderTopAppBar = () => {
    const handleGoBack = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    };

    if (activeTab === 'dm') {
      return (
        <View style={[styles.topAppBar, { backgroundColor: colors.background }]}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleGoBack}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={[styles.appBarTitle, { color: colors.textPrimary }]}>Messages</Text>
          </View>
          <View style={styles.appBarRightActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setIsDMsMuted(!isDMsMuted);
                if (Platform.OS === 'web') {
                  window.alert(!isDMsMuted ? 'Muted notifications for all chat messages.' : 'Unmuted chat notifications.');
                }
              }}
              style={styles.headerIconBtn}
            >
              {isDMsMuted ? (
                <BellOff size={22} color="#DC2626" strokeWidth={2.2} />
              ) : (
                <Bell size={22} color={isDark ? "#34D399" : "#164E3F"} strokeWidth={2.2} />
              )}
            </TouchableOpacity>
            {isDesktop && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsMiddleColCollapsed(true)}
                style={styles.headerIconBtn}
                accessibilityLabel="Collapse Messages"
              >
                <PanelLeftClose size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    if (activeTab === 'community') {
      return (
        <View style={[styles.topAppBar, { backgroundColor: colors.background }]}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleGoBack}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={[styles.appBarTitle, { color: colors.textPrimary }]}>Community</Text>
          </View>
          <View style={styles.appBarRightActions}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowCreateCommunityModal(true)}
              style={styles.headerIconBtn}
            >
              <Plus size={22} color={isDark ? "#34D399" : "#164E3F"} strokeWidth={2.5} />
            </TouchableOpacity>
            {isDesktop && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsMiddleColCollapsed(true)}
                style={styles.headerIconBtn}
                accessibilityLabel="Collapse Communities"
              >
                <PanelLeftClose size={20} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    if (activeTab === 'settings') {
      return (
        <View style={[styles.topAppBar, { backgroundColor: colors.background }]}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleGoBack}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={[styles.appBarTitle, { color: colors.textPrimary }]}>Settings</Text>
          </View>
          {isDesktop && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsMiddleColCollapsed(true)}
              style={styles.headerIconBtn}
              accessibilityLabel="Collapse"
            >
              <PanelLeftClose size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={[styles.topAppBar, { backgroundColor: colors.background }]}>
        <View style={styles.appBarLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleGoBack}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={[styles.appBarTitle, { color: colors.textPrimary }]}>Inner Circle</Text>
        </View>
        <View style={styles.appBarRightActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowCreateModal(true)}
            style={styles.headerIconBtn}
          >
            <Plus size={22} color="#164E3F" strokeWidth={2.5} />
          </TouchableOpacity>
          {isDesktop && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsMiddleColCollapsed(true)}
              style={styles.headerIconBtn}
              accessibilityLabel="Collapse Inner Circles"
            >
              <PanelLeftClose size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Search Bar
  const renderSearchBar = () => (
    <View style={[styles.searchBarContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight, borderWidth: 1 }]}>
        <Search size={17} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search"
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          returnKeyType="search"
        />
        {searchQuery.trim().length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <X size={15} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* DM Sub-Toggle: All vs Archived (Phase 4) */}
      {activeTab === 'dm' && dms.some((d) => d.is_archived) && (
        <View style={[styles.subToggleContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDmFilter('all')}
            style={[styles.subToggleBtn, dmFilter === 'all' && [styles.subToggleBtnActive, { backgroundColor: colors.cardBackground }]]}
          >
            <Text style={[styles.subToggleText, dmFilter === 'all' && styles.subToggleTextActive]}>
              All Messages ({dms.filter((d) => !d.is_archived).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDmFilter('archived')}
            style={[styles.subToggleBtn, dmFilter === 'archived' && [styles.subToggleBtnActive, { backgroundColor: colors.cardBackground }]]}
          >
            <Text style={[styles.subToggleText, dmFilter === 'archived' && styles.subToggleTextActive]}>
              Archived ({dms.filter((d) => Boolean(d.is_archived)).length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Community Sub-Toggle: Your Community vs Joined Community */}
      {activeTab === 'community' && (
        <View style={[styles.subToggleContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setCommunitySubFilter('your');
            }}
            style={[styles.subToggleBtn, communitySubFilter === 'your' && [styles.subToggleBtnActive, { backgroundColor: colors.cardBackground }]]}
          >
            <Text style={[styles.subToggleText, communitySubFilter === 'your' && styles.subToggleTextActive]}>
              Your Community
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {}
              setCommunitySubFilter('joined');
            }}
            style={[styles.subToggleBtn, communitySubFilter === 'joined' && [styles.subToggleBtnActive, { backgroundColor: colors.cardBackground }]]}
          >
            <Text style={[styles.subToggleText, communitySubFilter === 'joined' && styles.subToggleTextActive]}>
              Joined Community
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render Community Channel Cards matching reference design
  const renderCommunityItem = ({ item }: { item: Workspace }) => {
    const isJoined = communities.some((c) => c.id === item.id);
    const isDisabled = Boolean(item.is_disabled || item.status === 'disabled' || item.settings?.is_disabled);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelectWorkspace(item.id)}
        style={[styles.communityRow, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }, isDisabled && styles.communityRowDisabled]}
      >
        <Avatar
          uri={item.avatar_url || undefined}
          name={item.name}
          size="md"
        />

        <View style={styles.communityBody}>
          <View style={styles.communityTitleRow}>
            <Text style={[styles.communityTitle, { color: colors.textPrimary }, isDisabled && styles.communityTitleDisabled]} numberOfLines={1}>
              {item.name}
            </Text>
            {isDisabled && (
              <View style={styles.disabledBadge}>
                <Text style={styles.disabledBadgeText}>Disabled</Text>
              </View>
            )}
          </View>
          <Text style={[styles.communitySnippet, { color: colors.textSecondary }, isDisabled && styles.communitySnippetDisabled]} numberOfLines={2}>
            {item.description || 'Join our research group discussion and paper reviews.'}
          </Text>
          <View style={styles.communityMetaRow}>
            <Text style={[styles.communityMeta, { color: colors.textMuted }, isDisabled && styles.communityMetaDisabled]}>
              {item.members_count || 1} {item.members_count === 1 ? 'member' : 'members'}
            </Text>
            {isJoined && item.unread_count !== undefined && item.unread_count > 0 && (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>
                  {item.unread_count > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>

        {isDisabled ? (
          <View style={styles.disabledPill}>
            <Text style={styles.disabledPillText}>Disabled</Text>
          </View>
        ) : !isJoined ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => joinCommunity(item.id)}
            style={styles.joinPillBtn}
          >
            <Text style={styles.joinPillText}>Join</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.joinedPill, { backgroundColor: isDark ? colors.backgroundSecondary : '#F1F5F9', borderWidth: isDark ? 1 : 0, borderColor: colors.borderLight }]}>
            <Text style={[styles.joinedPillText, { color: isDark ? colors.textSecondary : '#64748B' }]}>Joined</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Join handler for Suggested Communities
  const handleJoinSuggestedCommunity = async (workspaceId: string) => {
    try {
      setJoiningCommunityId(workspaceId);
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      const res = await joinCommunity(workspaceId);
      if (res.success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      } else if (res.error) {
        Alert.alert('Unable to Join', res.error);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to join community');
    } finally {
      setJoiningCommunityId(null);
    }
  };

  // Render Suggested Communities Section matching user's interests
  const renderSuggestedSection = () => {
    if (activeTab !== 'community') return null;

    return (
      <View style={[styles.suggestedSectionContainer, { borderTopColor: colors.borderLight }]}>
        <View style={styles.suggestedHeaderRow}>
          <View style={styles.suggestedHeaderTitleGroup}>
            <View style={[styles.suggestedIconWrap, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5" }]}>
              <Sparkles size={13} color="#059669" />
            </View>
            <Text style={[styles.suggestedSectionTitle, { color: colors.textPrimary }]}>Suggested Communities</Text>
          </View>
          {userInterests.length > 0 && suggestedCommunities.length > 0 && (
            <View style={[styles.interestCountPill, { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5", borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0" }]}>
              <Text style={[styles.interestCountPillText, { color: isDark ? "#34D399" : "#065F46" }]}>
                {suggestedCommunities.length} {suggestedCommunities.length === 1 ? 'match' : 'matches'}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.suggestedSectionSub, { color: colors.textSecondary }]}>
          {userInterests.length > 0
            ? `Based on your research in ${userInterests.slice(0, 2).join(' & ')}`
            : 'Based on your fields of study & research interests'}
        </Text>

        {userInterests.length === 0 ? (
          <View style={[styles.suggestedEmptyCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
            <Text style={[styles.suggestedEmptyCardText, { color: colors.textSecondary }]}>
              Add research interests to your profile to discover communities tailored to your field.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowAddInterestsModal(true)}
              style={styles.addInterestsBtn}
            >
              <Plus size={13} color="#FFFFFF" />
              <Text style={styles.addInterestsBtnText}>Add Interests</Text>
            </TouchableOpacity>
          </View>
        ) : suggestedCommunities.length === 0 ? (
          <View style={[styles.suggestedEmptyCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
            <Text style={[styles.suggestedEmptyCardText, { color: colors.textSecondary }]}>
              No other communities matching {userInterests.slice(0, 2).join(', ')} right now. Check back as new research groups are created!
            </Text>
          </View>
        ) : (
          <View style={styles.suggestedList}>
            {suggestedCommunities.map(({ community, matchedTag }) => {
              const isJoining = joiningCommunityId === community.id;

              return (
                <View key={`suggested-${community.id}`} style={[styles.suggestedCard, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleSelectWorkspace(community.id)}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}
                  >
                    <Avatar
                      uri={community.avatar_url || undefined}
                      name={community.name}
                      size="md"
                    />
                    <View style={styles.suggestedCardBody}>
                      <Text style={[styles.suggestedCardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {community.name}
                      </Text>
                      <Text style={[styles.suggestedCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {community.description || 'Collaborative research group discussion and paper reviews.'}
                      </Text>
                      <View style={styles.suggestedCardMetaRow}>
                        <Text style={styles.suggestedCardMeta}>
                          {community.members_count || 1} {community.members_count === 1 ? 'member' : 'members'}
                        </Text>
                        {matchedTag ? (
                          <View style={styles.suggestedTagPill}>
                            <Text style={styles.suggestedTagText} numberOfLines={1}>
                              🔬 {matchedTag}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={isJoining}
                    onPress={() => handleJoinSuggestedCommunity(community.id)}
                    style={[styles.suggestedJoinBtn, isJoining && styles.suggestedJoinBtnDisabled]}
                  >
                    {isJoining ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.suggestedJoinBtnText}>Join</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  // Render Inner Circle Pod Row
  const renderInnerCircleItem = ({ item }: { item: Workspace }) => {
    const unreadCount = item.unread_count || 0;

    const getInnerCircleSnippet = () => {
      const lm = item.last_message;
      if (lm) {
        if (lm.is_deleted || lm.content === '🚫 This message was deleted') return '🚫 This message was deleted';

        const isAudio = Boolean(
          lm.message_type === 'audio' ||
          lm.message_type === 'voice_note' ||
          lm.audio_metadata ||
          (lm.attachments as any)?.audio_metadata ||
          (typeof lm.content === 'string' && lm.content.startsWith('🎙️')) ||
          (lm.media_urls && lm.media_urls.some((u: string) => {
            const lower = (u || '').toLowerCase();
            return (
              lower.endsWith('.webm') ||
              lower.endsWith('.mp3') ||
              lower.endsWith('.m4a') ||
              lower.endsWith('.wav') ||
              lower.endsWith('.ogg') ||
              lower.includes('/audio/') ||
              lower.includes('/voice-notes/')
            );
          }))
        );
        if (isAudio) return '🎙️ Voice note';

        const isDoc = Boolean(
          lm.message_type === 'document' ||
          lm.document_metadata ||
          (lm.attachments as any)?.document_metadata
        );
        if (isDoc) return `📄 ${lm.document_metadata?.name || (lm.attachments as any)?.document_metadata?.name || 'Document'}`;

        const isImg = Boolean(
          lm.message_type === 'image' ||
          (typeof lm.content === 'string' && lm.content === '📷 Shared photo') ||
          (lm.media_urls && lm.media_urls.length > 0 && !isAudio && !isDoc)
        );
        if (isImg) return '📷 Photo';

        if (lm.message_type === 'paper_doi' || lm.doi_metadata) return `🔬 ${lm.doi_metadata?.title || 'Research paper'}`;
        if (lm.message_type === 'poll') return `📊 Poll: ${lm.content}`;
        if (lm.message_type === 'post') return lm.content ? `📑 ${lm.content}` : '📑 Shared post';
        if (lm.message_type === 'profile') return '👤 Shared researcher profile';
        if (lm.message_type === 'call_log') return lm.content;
        if (lm.content && lm.content !== '🔒 Encrypted message' && !lm.content.startsWith('🔒 [')) {
          return lm.content;
        }
        return 'Message';
      }
      return item.description || 'Private research group';
    };

    const timeFormatted = item.last_message?.created_at
      ? new Date(item.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : item.updated_at
      ? new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleSelectWorkspace(item.id)}
        style={[styles.innerCircleRow, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}
      >
        <Avatar uri={item.avatar_url || undefined} name={item.name} size="md" />

        <View style={styles.innerCircleBody}>
          <View style={styles.innerCircleTitleRow}>
            <Text style={[styles.innerCircleTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            {timeFormatted ? (
              <Text style={styles.innerCircleTime}>
                {timeFormatted}
              </Text>
            ) : null}
          </View>

          <View style={styles.innerCircleSnippetRow}>
            <Text style={[styles.innerCircleSnippet, { color: colors.textSecondary }]} numberOfLines={1}>
              {getInnerCircleSnippet()}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Bottom Navigation Bar (4 Tabs: DM, Community, Inner Circle, Settings)
  const renderBottomNav = () => (
    <View
      style={[
        styles.bottomTabBar,
        {
          backgroundColor: colors.backgroundSecondary,
          borderTopColor: colors.borderLight,
          height: 56 + (bottomInset > 0 ? bottomInset : 0),
          paddingBottom: bottomInset > 0 ? bottomInset : 4,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setActiveTab('dm')}
        style={styles.tabItem}
      >
        <View style={styles.tabIconWrapper}>
          <MessageSquare
            size={22}
            color={activeTab === 'dm' ? '#064E3B' : '#94A3B8'}
          />
          {totalDMsUnread > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {totalDMsUnread > 99 ? '99+' : totalDMsUnread}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, activeTab === 'dm' && styles.tabLabelActive]}>
          DM
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setActiveTab('community')}
        style={styles.tabItem}
      >
        <View style={styles.tabIconWrapper}>
          <Users
            size={22}
            color={activeTab === 'community' ? '#064E3B' : '#94A3B8'}
          />
          {totalCommsUnread > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {totalCommsUnread > 99 ? '99+' : totalCommsUnread}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, activeTab === 'community' && styles.tabLabelActive]}>
          Community
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setActiveTab('inner_circle')}
        style={styles.tabItem}
      >
        <View style={styles.tabIconWrapper}>
          <Shield
            size={22}
            color={activeTab === 'inner_circle' ? '#064E3B' : '#94A3B8'}
          />
          {totalInnersUnread > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {totalInnersUnread > 99 ? '99+' : totalInnersUnread}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, activeTab === 'inner_circle' && styles.tabLabelActive]}>
          Inner Circle
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setActiveTab('settings')}
        style={styles.tabItem}
      >
        <View style={styles.tabIconWrapper}>
          <Settings
            size={22}
            color={activeTab === 'settings' ? '#164E3F' : '#94A3B8'}
          />
        </View>
        <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Desktop 3-Pane Layout vs Mobile Full View */}
      {isDesktop ? (
        <View style={[styles.desktopContainer, { backgroundColor: colors.background }]}>
          {/* Left Rail (Collapsible: 220px vs 60px) */}
          <View style={[styles.desktopLeftRail, isLeftRailCollapsed && styles.desktopLeftRailCollapsed, { backgroundColor: colors.backgroundSecondary, borderRightColor: colors.borderLight }]}>
            <View style={[styles.desktopRailHeader, isLeftRailCollapsed && styles.desktopRailHeaderCollapsed]}>
              {!isLeftRailCollapsed && (
                <Text style={[styles.desktopRailTitle, { color: isDark ? "#34D399" : "#164E3F" }]} numberOfLines={1}>
                  BooffIn Workspace
                </Text>
              )}
              <TouchableOpacity
                onPress={() => setIsLeftRailCollapsed(!isLeftRailCollapsed)}
                style={styles.railToggleBtn}
                accessibilityLabel={isLeftRailCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
                activeOpacity={0.7}
              >
                {isLeftRailCollapsed ? (
                  <PanelLeftOpen size={18} color={isDark ? "#34D399" : "#164E3F"} />
                ) : (
                  <PanelLeftClose size={18} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setActiveTab('dm');
                setSelectedWorkspaceId(null);
              }}
              style={[
                styles.desktopRailTab,
                isLeftRailCollapsed && styles.desktopRailTabCollapsed,
                activeTab === 'dm' && [styles.desktopRailTabActive, { backgroundColor: isDark ? '#1F2636' : '#ECFDF5' }],
              ]}
              accessibilityLabel="Direct Messages"
            >
              <View style={styles.railIconWrap}>
                <MessageSquare size={18} color={activeTab === 'dm' ? (isDark ? '#34D399' : '#064E3B') : colors.textSecondary} />
                {isLeftRailCollapsed && totalDMsUnread > 0 && (
                  <View style={styles.railBadgeCollapsed}>
                    <Text style={styles.railBadgeTextCollapsed}>{totalDMsUnread > 99 ? '99+' : totalDMsUnread}</Text>
                  </View>
                )}
              </View>
              {!isLeftRailCollapsed && (
                <View style={styles.railTabLabelRow}>
                  <Text style={[styles.desktopRailTabText, { color: colors.textSecondary }, activeTab === 'dm' && [styles.desktopRailTabTextActive, { color: isDark ? '#34D399' : '#064E3B' }]]}>
                    Direct Messages
                  </Text>
                  {totalDMsUnread > 0 && (
                    <View style={styles.railBadge}>
                      <Text style={styles.railBadgeText}>{totalDMsUnread > 99 ? '99+' : totalDMsUnread}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveTab('community');
                setSelectedWorkspaceId(null);
              }}
              style={[
                styles.desktopRailTab,
                isLeftRailCollapsed && styles.desktopRailTabCollapsed,
                activeTab === 'community' && [styles.desktopRailTabActive, { backgroundColor: isDark ? '#1F2636' : '#ECFDF5' }],
              ]}
              accessibilityLabel="Communities"
            >
              <View style={styles.railIconWrap}>
                <Users size={18} color={activeTab === 'community' ? (isDark ? '#34D399' : '#064E3B') : colors.textSecondary} />
                {isLeftRailCollapsed && totalCommsUnread > 0 && (
                  <View style={styles.railBadgeCollapsed}>
                    <Text style={styles.railBadgeTextCollapsed}>{totalCommsUnread > 99 ? '99+' : totalCommsUnread}</Text>
                  </View>
                )}
              </View>
              {!isLeftRailCollapsed && (
                <View style={styles.railTabLabelRow}>
                  <Text style={[styles.desktopRailTabText, { color: colors.textSecondary }, activeTab === 'community' && [styles.desktopRailTabTextActive, { color: isDark ? '#34D399' : '#064E3B' }]]}>
                    Communities
                  </Text>
                  {totalCommsUnread > 0 && (
                    <View style={styles.railBadge}>
                      <Text style={styles.railBadgeText}>{totalCommsUnread > 99 ? '99+' : totalCommsUnread}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveTab('inner_circle');
                setSelectedWorkspaceId(null);
              }}
              style={[
                styles.desktopRailTab,
                isLeftRailCollapsed && styles.desktopRailTabCollapsed,
                activeTab === 'inner_circle' && [styles.desktopRailTabActive, { backgroundColor: isDark ? '#1F2636' : '#ECFDF5' }],
              ]}
              accessibilityLabel="Inner Circles"
            >
              <View style={styles.railIconWrap}>
                <Shield size={18} color={activeTab === 'inner_circle' ? (isDark ? '#34D399' : '#064E3B') : colors.textSecondary} />
                {isLeftRailCollapsed && totalInnersUnread > 0 && (
                  <View style={styles.railBadgeCollapsed}>
                    <Text style={styles.railBadgeTextCollapsed}>{totalInnersUnread > 99 ? '99+' : totalInnersUnread}</Text>
                  </View>
                )}
              </View>
              {!isLeftRailCollapsed && (
                <View style={styles.railTabLabelRow}>
                  <Text style={[styles.desktopRailTabText, { color: colors.textSecondary }, activeTab === 'inner_circle' && [styles.desktopRailTabTextActive, { color: isDark ? '#34D399' : '#064E3B' }]]}>
                    Inner Circles
                  </Text>
                  {totalInnersUnread > 0 && (
                    <View style={styles.railBadge}>
                      <Text style={styles.railBadgeText}>{totalInnersUnread > 99 ? '99+' : totalInnersUnread}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveTab('settings');
                setSelectedWorkspaceId(null);
              }}
              style={[
                styles.desktopRailTab,
                isLeftRailCollapsed && styles.desktopRailTabCollapsed,
                activeTab === 'settings' && [styles.desktopRailTabActive, { backgroundColor: isDark ? '#1F2636' : '#ECFDF5' }],
              ]}
              accessibilityLabel="Settings"
            >
              <View style={styles.railIconWrap}>
                <Settings size={18} color={activeTab === 'settings' ? (isDark ? '#34D399' : '#164E3F') : colors.textSecondary} />
              </View>
              {!isLeftRailCollapsed && (
                <Text style={[styles.desktopRailTabText, { color: colors.textSecondary }, activeTab === 'settings' && [styles.desktopRailTabTextActive, { color: isDark ? '#34D399' : '#064E3B' }]]}>
                  Settings
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowCreateModal(true)}
              style={[
                styles.desktopNewBtn,
                isLeftRailCollapsed && styles.desktopNewBtnCollapsed,
                { backgroundColor: isDark ? '#059669' : '#164E3F' },
              ]}
              accessibilityLabel="New Workspace"
            >
              <Plus size={16} color="#FFFFFF" />
              {!isLeftRailCollapsed && (
                <Text style={styles.desktopNewBtnText}>New Workspace</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Middle List Column (Collapsible: 340px vs Hidden) */}
          {!isMiddleColCollapsed && (
            <View style={[styles.desktopMiddleCol, { backgroundColor: colors.background, borderRightColor: colors.borderLight }]}>
              {renderTopAppBar()}
              {renderSearchBar()}

              <FlatList
                data={activeItems}
                keyExtractor={(item) => item.id}
                renderItem={
                  activeTab === 'community'
                    ? renderCommunityItem
                    : activeTab === 'inner_circle'
                    ? renderInnerCircleItem
                    : ({ item }) => (
                        <WorkspaceCard
                          workspace={item}
                          onPress={() => handleSelectWorkspace(item.id)}
                        />
                      )
                }
                ListFooterComponent={activeTab === 'community' ? renderSuggestedSection : undefined}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            </View>
          )}

          {/* Main Workstation Canvas (Flexible, with restore bar when collapsed) */}
          <View style={[styles.desktopMainCanvas, { backgroundColor: colors.background }]}>
            {(isLeftRailCollapsed || isMiddleColCollapsed) && (
              <View style={[styles.desktopCanvasRestoreBar, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.borderLight }]}>
                {isLeftRailCollapsed && (
                  <TouchableOpacity
                    onPress={() => setIsLeftRailCollapsed(false)}
                    style={[styles.restorePill, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}
                    activeOpacity={0.8}
                  >
                    <PanelLeftOpen size={14} color="#064E3B" />
                    <Text style={[styles.restorePillText, { color: isDark ? "#34D399" : "#064E3B" }]}>Expand Navigation</Text>
                  </TouchableOpacity>
                )}
                {isMiddleColCollapsed && (
                  <TouchableOpacity
                    onPress={() => setIsMiddleColCollapsed(false)}
                    style={[styles.restorePill, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}
                    activeOpacity={0.8}
                  >
                    <Menu size={14} color="#064E3B" />
                    <Text style={[styles.restorePillText, { color: isDark ? "#34D399" : "#064E3B" }]}>
                      Show {activeTab === 'dm' ? 'Messages' : activeTab === 'community' ? 'Communities' : activeTab === 'inner_circle' ? 'Pods' : 'List'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeTab === 'settings' ? (
              <WorkspaceSettingsView />
            ) : selectedWorkspace ? (
              selectedWorkspace.type === 'dm' ? (
                <WorkspaceDMView workspace={selectedWorkspace} key={selectedWorkspace.id} />
              ) : selectedWorkspace.type === 'community' ? (
                <WorkspaceCommunityView workspace={selectedWorkspace} key={selectedWorkspace.id} />
              ) : (
                <WorkspaceInnerCircleView workspace={selectedWorkspace} key={selectedWorkspace.id} />
              )
            ) : (
              <View style={styles.emptyDesktopCanvas}>
                <MessageSquare size={48} color={colors.borderDark || "#334155"} />
                <Text style={[styles.emptyDesktopTitle, { color: colors.textPrimary }]}>Select a Conversation</Text>
                <Text style={[styles.emptyDesktopSub, { color: colors.textSecondary }]}>
                  Choose a direct message, community channel, or inner circle pod to start collaborating.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <View style={[styles.mobileContainer, { backgroundColor: colors.background }]}>
          {renderTopAppBar()}
          {activeTab === 'settings' ? (
            <WorkspaceSettingsView />
          ) : (
            <>
              {renderSearchBar()}

              {isLoading && activeItems.length === 0 ? (
                <View style={styles.centerLoader}>
                  <ActivityIndicator size="small" color="#164E3F" />
                  <Text style={styles.loaderText}>Loading conversations...</Text>
                </View>
              ) : (
                <FlatList
                  data={activeItems}
                  keyExtractor={(item) => item.id}
                  renderItem={
                    activeTab === 'community'
                      ? renderCommunityItem
                      : activeTab === 'inner_circle'
                      ? renderInnerCircleItem
                      : ({ item }) => (
                          <WorkspaceCard
                            workspace={item}
                            onPress={() => handleSelectWorkspace(item.id)}
                          />
                        )
                  }
                  refreshControl={
                    <RefreshControl
                      refreshing={isRefreshing}
                      onRefresh={handleRefresh}
                      tintColor="#164E3F"
                    />
                  }
                  ListFooterComponent={activeTab === 'community' ? renderSuggestedSection : undefined}
                  contentContainerStyle={[styles.listContent, { paddingBottom: 76 + bottomInset }]}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <MessageSquare size={44} color="#CBD5E1" />
                      <Text style={styles.emptyTitle}>
                        {activeTab === 'dm'
                          ? 'No direct messages yet'
                          : activeTab === 'community'
                          ? communitySubFilter === 'your'
                            ? 'No created communities yet'
                            : 'No joined communities yet'
                          : 'No inner circle pods yet'}
                      </Text>
                      <Text style={styles.emptySubtitle}>
                        {activeTab === 'dm'
                          ? 'Connect with verified researchers to start a 1-on-1 collaborative discussion.'
                          : activeTab === 'community'
                          ? communitySubFilter === 'your'
                            ? 'Create your own research community to host group discussions, share papers, and collaborate.'
                            : 'Explore and join open research communities to share papers and participate in discussions.'
                          : 'Create a private 25-member research pod with E2EE encryption and shared vault.'}
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          if (activeTab === 'community') {
                            setShowCreateCommunityModal(true);
                          } else {
                            setShowCreateModal(true);
                          }
                        }}
                        style={styles.emptyActionBtn}
                      >
                        <Plus size={15} color="#FFFFFF" />
                        <Text style={styles.emptyActionBtnText}>
                          {activeTab === 'dm'
                            ? 'New Message'
                            : activeTab === 'community'
                            ? 'Create Community'
                            : 'Create Inner Circle'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  }
                />
              )}
            </>
          )}

          {/* Fixed 4-Tab Bottom Bar */}
          {renderBottomNav()}
        </View>
      )}

      {/* Inner Circle / DM Group Creator Modal */}
      <CreateWorkspaceModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Dedicated Full-Screen Community Creator Modal */}
      <CreateCommunityModal
        visible={showCreateCommunityModal}
        onClose={() => setShowCreateCommunityModal(false)}
      />

      {/* Add Interests Modal from Suggested Communities Prompt */}
      <AddInterestsModal
        visible={showAddInterestsModal}
        onClose={() => setShowAddInterestsModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  appBarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerIconBtn: {
    padding: 6,
  },
  messageAddIconBadge: {
    position: 'relative',
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlus: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  clearBtn: {
    padding: 4,
  },
  subToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F4F7',
    borderRadius: 20,
    padding: 3,
    marginTop: 10,
  },
  subToggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 17,
  },
  subToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  subToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  subToggleTextActive: {
    color: '#164E3F',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 70,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  communityRowDisabled: {
    backgroundColor: '#F8FAFC',
    borderBottomColor: '#E2E8F0',
    opacity: 0.72,
  },
  communityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  communityTitleDisabled: {
    color: '#64748B',
  },
  communitySnippetDisabled: {
    color: '#94A3B8',
  },
  communityMetaDisabled: {
    color: '#94A3B8',
  },
  disabledBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  disabledBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  disabledPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  disabledPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  communityBody: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  communityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  communitySnippet: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 4,
  },
  communityMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  joinPillBtn: {
    backgroundColor: '#164E3F',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  joinPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  joinedPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  joinedPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  // Suggested Communities Section Styles
  suggestedSectionContainer: {
    marginTop: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  suggestedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  suggestedHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  suggestedIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  suggestedSectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  interestCountPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  interestCountPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  suggestedEmptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestedEmptyCardText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  addInterestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#164E3F',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 10,
  },
  addInterestsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  suggestedList: {
    gap: 10,
    marginBottom: 16,
  },
  suggestedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestedCardBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  suggestedCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  suggestedCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 6,
  },
  suggestedCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  suggestedCardMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  suggestedTagPill: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  suggestedTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#166534',
  },
  suggestedJoinBtn: {
    backgroundColor: '#164E3F',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedJoinBtnDisabled: {
    opacity: 0.7,
  },
  suggestedJoinBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  innerCircleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  innerCircleBody: {
    flex: 1,
    marginLeft: 14,
  },
  innerCircleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  innerCircleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  innerCircleTime: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '400',
  },
  innerCircleSnippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  innerCircleSnippet: {
    fontSize: 13,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
  },
  communityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  unreadPill: {
    backgroundColor: '#064E3B',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  tabIconWrapper: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#064E3B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#164E3F',
    fontWeight: '700',
  },
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#164E3F',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 18,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  desktopLeftRail: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
    transitionProperty: 'width, padding',
    transitionDuration: '200ms',
  } as any,
  desktopLeftRailCollapsed: {
    width: 60,
    padding: 8,
    alignItems: 'center',
  },
  desktopRailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  desktopRailHeaderCollapsed: {
    justifyContent: 'center',
    marginBottom: 14,
  },
  desktopRailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#164E3F',
    flex: 1,
  },
  railToggleBtn: {
    padding: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopRailTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  desktopRailTabCollapsed: {
    paddingHorizontal: 0,
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  railIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBadgeDot: {
    position: 'absolute',
    top: -3,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  desktopRailTabActive: {
    backgroundColor: '#ECFDF5',
  },
  desktopRailTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  desktopRailTabTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  railTabLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  railBadge: {
    backgroundColor: '#064E3B',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  railBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  railBadgeCollapsed: {
    position: 'absolute',
    top: -5,
    right: -7,
    backgroundColor: '#064E3B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  railBadgeTextCollapsed: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  desktopNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#164E3F',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  desktopNewBtnCollapsed: {
    paddingHorizontal: 0,
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  desktopNewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  desktopMiddleCol: {
    width: 330,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  desktopMainCanvas: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
  },
  desktopCanvasRestoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  restorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  restorePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#064E3B',
  },
  appBarRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCollapseBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDesktopCanvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyDesktopTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
  },
  emptyDesktopSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 360,
  },
});
