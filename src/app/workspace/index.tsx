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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { WorkspaceCard } from '../../components/workspace/WorkspaceCard';
import { GroupCollageAvatar } from '../../components/workspace/GroupCollageAvatar';
import { CreateWorkspaceModal } from '../../components/workspace/CreateWorkspaceModal';
import { CreateCommunityModal } from '../../components/workspace/CreateCommunityModal';
import { WorkspaceDMView } from '../../components/workspace/WorkspaceDMView';
import { WorkspaceCommunityView } from '../../components/workspace/WorkspaceCommunityView';
import { WorkspaceInnerCircleView } from '../../components/workspace/WorkspaceInnerCircleView';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { Workspace } from '../../types/workspace';
import { Avatar } from '../../components/core/Avatar';

export type WorkspaceTabType = 'dm' | 'community' | 'inner_circle';

export default function WorkspaceHubScreen() {
  const { isDesktop } = useResponsiveLayout();
  const currentUser = useAuthStore((s) => s.user);

  // Workspace Store Data
  const dms = useWorkspaceStore((s) => s.dms);
  const communities = useWorkspaceStore((s) => s.communities);
  const innerCircles = useWorkspaceStore((s) => s.innerCircles);
  const discoverableCommunities = useWorkspaceStore((s) => s.discoverableCommunities);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const isRefreshing = useWorkspaceStore((s) => s.isRefreshing);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const joinCommunity = useWorkspaceStore((s) => s.joinCommunity);

  // Active Mobile / Desktop Tab: Strictly 3 Tabs
  const [activeTab, setActiveTab] = useState<WorkspaceTabType>('dm');

  // Inner Circle sub-toggle: "Groups" vs "People"
  const [innerCircleSubTab, setInnerCircleSubTab] = useState<'groups' | 'people'>('groups');

  // Search Query
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);

  // Desktop active selected workspace for 3-pane layout
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspaces();
  }, [currentUser?.id]);

  const handleRefresh = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadWorkspaces(true);
  }, [loadWorkspaces]);

  // Active items based on active tab
  const activeItems = useMemo(() => {
    let list: Workspace[] = [];
    if (activeTab === 'dm') {
      list = dms;
    } else if (activeTab === 'community') {
      list = [...communities, ...discoverableCommunities.filter((dc) => !communities.some((c) => c.id === dc.id))];
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
  }, [activeTab, dms, communities, innerCircles, discoverableCommunities, searchQuery]);

  const selectedWorkspace = useMemo(() => {
    if (!selectedWorkspaceId) return activeItems[0] || null;
    return [...dms, ...communities, ...innerCircles, ...discoverableCommunities].find(
      (w) => w.id === selectedWorkspaceId
    ) || activeItems[0] || null;
  }, [selectedWorkspaceId, dms, communities, innerCircles, discoverableCommunities, activeItems]);

  const totalDMsUnread = dms.reduce((acc, d) => acc + (d.unread_count || 0), 0);
  const totalCommsUnread = communities.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const totalInnersUnread = innerCircles.reduce((acc, i) => acc + (i.unread_count || 0), 0);

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
        <View style={styles.topAppBar}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleGoBack}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={styles.appBarTitle}>Messages</Text>
          </View>
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
              <Bell size={22} color="#164E3F" strokeWidth={2.2} />
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'community') {
      return (
        <View style={styles.topAppBar}>
          <View style={styles.appBarLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleGoBack}
              style={styles.backBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
            </TouchableOpacity>
            <Text style={styles.appBarTitle}>Community</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowCreateCommunityModal(true)}
            style={styles.headerIconBtn}
          >
            <Plus size={22} color="#164E3F" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.topAppBar}>
        <View style={styles.appBarLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleGoBack}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle}>Inner Circle</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowCreateModal(true)}
          style={styles.headerIconBtn}
        >
          <Plus size={22} color="#164E3F" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    );
  };

  // Search Bar
  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchBar}>
        <Search size={17} color="#94A3B8" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search"
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {searchQuery.trim().length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <X size={15} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Inner Circle Sub-Toggle: Groups vs People */}
      {activeTab === 'inner_circle' && (
        <View style={styles.subToggleContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setInnerCircleSubTab('groups')}
            style={[styles.subToggleBtn, innerCircleSubTab === 'groups' && styles.subToggleBtnActive]}
          >
            <Text style={[styles.subToggleText, innerCircleSubTab === 'groups' && styles.subToggleTextActive]}>
              Groups
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setInnerCircleSubTab('people')}
            style={[styles.subToggleBtn, innerCircleSubTab === 'people' && styles.subToggleBtnActive]}
          >
            <Text style={[styles.subToggleText, innerCircleSubTab === 'people' && styles.subToggleTextActive]}>
              People
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render Community Channel Cards matching reference design
  const renderCommunityItem = ({ item }: { item: Workspace }) => {
    const isJoined = communities.some((c) => c.id === item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (isDesktop) {
            setSelectedWorkspaceId(item.id);
          } else {
            router.push(`/workspace/${item.id}` as any);
          }
        }}
        style={styles.communityRow}
      >
        <Avatar
          uri={item.avatar_url || undefined}
          name={item.name}
          size="md"
        />

        <View style={styles.communityBody}>
          <Text style={styles.communityTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.communitySnippet} numberOfLines={2}>
            {item.description || 'Join our research group discussion and paper reviews.'}
          </Text>
          <Text style={styles.communityMeta}>
            {item.members_count || '10k'} members • 324 online
          </Text>
        </View>

        {!isJoined ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => joinCommunity(item.id)}
            style={styles.joinPillBtn}
          >
            <Text style={styles.joinPillText}>Join</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.joinedPill}>
            <Text style={styles.joinedPillText}>Joined</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render Inner Circle Pod Row
  const renderInnerCircleItem = ({ item }: { item: Workspace }) => {
    const unreadCount = item.unread_count || 0;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (isDesktop) {
            setSelectedWorkspaceId(item.id);
          } else {
            router.push(`/workspace/${item.id}` as any);
          }
        }}
        style={styles.innerCircleRow}
      >
        <GroupCollageAvatar size={48} name={item.name} />

        <View style={styles.innerCircleBody}>
          <View style={styles.innerCircleTitleRow}>
            <Text style={styles.innerCircleTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.innerCircleTime}>
              {item.updated_at ? new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:34 PM'}
            </Text>
          </View>

          <View style={styles.innerCircleSnippetRow}>
            <Text style={styles.innerCircleSnippet} numberOfLines={1}>
              {item.last_message?.content || item.description || 'Alex: What are we doing for the project review?'}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Bottom Navigation Bar (Strictly 3 Tabs)
  const renderBottomNav = () => (
    <View style={styles.bottomTabBar}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setActiveTab('dm')}
        style={styles.tabItem}
      >
        <View style={styles.tabIconWrapper}>
          <MessageSquare
            size={22}
            color={activeTab === 'dm' ? '#164E3F' : '#94A3B8'}
          />
          {totalDMsUnread > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{totalDMsUnread}</Text>
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
            color={activeTab === 'community' ? '#164E3F' : '#94A3B8'}
          />
          {totalCommsUnread > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{totalCommsUnread}</Text>
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
            color={activeTab === 'inner_circle' ? '#164E3F' : '#94A3B8'}
          />
          {totalInnersUnread > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{totalInnersUnread}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, activeTab === 'inner_circle' && styles.tabLabelActive]}>
          Inner Circle
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Desktop 3-Pane Layout vs Mobile Full View */}
      {isDesktop ? (
        <View style={styles.desktopContainer}>
          {/* Left Rail (260px) */}
          <View style={styles.desktopLeftRail}>
            <View style={styles.desktopRailHeader}>
              <Text style={styles.desktopRailTitle}>BooffIn Workspace</Text>
            </View>

            <TouchableOpacity
              onPress={() => setActiveTab('dm')}
              style={[styles.desktopRailTab, activeTab === 'dm' && styles.desktopRailTabActive]}
            >
              <MessageSquare size={18} color={activeTab === 'dm' ? '#164E3F' : '#64748B'} />
              <Text style={[styles.desktopRailTabText, activeTab === 'dm' && styles.desktopRailTabTextActive]}>
                Direct Messages ({dms.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('community')}
              style={[styles.desktopRailTab, activeTab === 'community' && styles.desktopRailTabActive]}
            >
              <Users size={18} color={activeTab === 'community' ? '#164E3F' : '#64748B'} />
              <Text style={[styles.desktopRailTabText, activeTab === 'community' && styles.desktopRailTabTextActive]}>
                Communities ({communities.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('inner_circle')}
              style={[styles.desktopRailTab, activeTab === 'inner_circle' && styles.desktopRailTabActive]}
            >
              <Shield size={18} color={activeTab === 'inner_circle' ? '#164E3F' : '#64748B'} />
              <Text style={[styles.desktopRailTabText, activeTab === 'inner_circle' && styles.desktopRailTabTextActive]}>
                Inner Circles ({innerCircles.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowCreateModal(true)}
              style={styles.desktopNewBtn}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.desktopNewBtnText}>New Workspace</Text>
            </TouchableOpacity>
          </View>

          {/* Middle List Column (360px) */}
          <View style={styles.desktopMiddleCol}>
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
                        onPress={() => setSelectedWorkspaceId(item.id)}
                      />
                    )
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>

          {/* Main Workstation Canvas */}
          <View style={styles.desktopMainCanvas}>
            {selectedWorkspace ? (
              selectedWorkspace.type === 'dm' ? (
                <WorkspaceDMView workspace={selectedWorkspace} />
              ) : selectedWorkspace.type === 'community' ? (
                <WorkspaceCommunityView workspace={selectedWorkspace} />
              ) : (
                <WorkspaceInnerCircleView workspace={selectedWorkspace} />
              )
            ) : (
              <View style={styles.emptyDesktopCanvas}>
                <MessageSquare size={48} color="#CBD5E1" />
                <Text style={styles.emptyDesktopTitle}>Select a Conversation</Text>
                <Text style={styles.emptyDesktopSub}>
                  Choose a direct message, community channel, or inner circle pod to start collaborating.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* Mobile Layout */
        <View style={styles.mobileContainer}>
          {renderTopAppBar()}
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
                  : ({ item }) => <WorkspaceCard workspace={item} />
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#164E3F"
                />
              }
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MessageSquare size={44} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'dm'
                      ? 'No direct messages yet'
                      : activeTab === 'community'
                      ? 'No communities found'
                      : 'No inner circle pods yet'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {activeTab === 'dm'
                      ? 'Connect with verified researchers to start a 1-on-1 collaborative discussion.'
                      : activeTab === 'community'
                      ? 'Explore and join open research communities to share papers and live discussions.'
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

          {/* Fixed 3-Tab Bottom Bar */}
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
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  innerCircleTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  innerCircleSnippetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  innerCircleSnippet: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  unreadPill: {
    backgroundColor: '#164E3F',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadPillText: {
    fontSize: 10,
    fontWeight: '700',
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
    backgroundColor: '#164E3F',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '700',
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
    width: 240,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  desktopRailHeader: {
    marginBottom: 20,
  },
  desktopRailTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#164E3F',
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
  desktopRailTabActive: {
    backgroundColor: '#ECFDF5',
  },
  desktopRailTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  desktopRailTabTextActive: {
    color: '#164E3F',
    fontWeight: '700',
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
  desktopNewBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  desktopMiddleCol: {
    width: 360,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  desktopMainCanvas: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
