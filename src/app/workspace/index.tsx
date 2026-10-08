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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Layers,
  MessageSquare,
  Users,
  Shield,
  Plus,
  Search,
  Lock,
  Compass,
  ArrowLeft,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography } from '../../theme';
import { AppHeader } from '../../components/layout/AppHeader';
import { WorkspaceCard } from '../../components/workspace/WorkspaceCard';
import { CreateWorkspaceModal } from '../../components/workspace/CreateWorkspaceModal';
import { useWorkspaceStore, WorkspaceHubTab } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { Workspace } from '../../types/workspace';

export default function WorkspaceHubScreen() {
  const { isDesktop } = useResponsiveLayout();
  const currentUser = useAuthStore((s) => s.user);

  const dms = useWorkspaceStore((s) => s.dms);
  const communities = useWorkspaceStore((s) => s.communities);
  const innerCircles = useWorkspaceStore((s) => s.innerCircles);
  const discoverableCommunities = useWorkspaceStore((s) => s.discoverableCommunities);
  const activeTab = useWorkspaceStore((s) => s.activeHubTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveHubTab);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const isRefreshing = useWorkspaceStore((s) => s.isRefreshing);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const joinCommunity = useWorkspaceStore((s) => s.joinCommunity);

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, [currentUser?.id]);

  const handleRefresh = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await loadWorkspaces(true);
  }, [loadWorkspaces]);

  // Combined list based on active tab
  const displayedWorkspaces = useMemo(() => {
    let list: Workspace[] = [];
    if (activeTab === 'all') {
      list = [...dms, ...innerCircles, ...communities];
    } else if (activeTab === 'dms') {
      list = dms;
    } else if (activeTab === 'communities') {
      list = communities;
    } else if (activeTab === 'inner_circles') {
      list = innerCircles;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((w) => {
      const name = (w.other_user?.fullName || w.name || '').toLowerCase();
      const desc = (w.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [activeTab, dms, communities, innerCircles, searchQuery]);

  const totalDMsUnread = dms.reduce((acc, d) => acc + (d.unread_count || 0), 0);
  const totalCommsUnread = communities.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const totalInnersUnread = innerCircles.reduce((acc, i) => acc + (i.unread_count || 0), 0);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Search Input Bar with Clear Button */}
      <View style={styles.searchBar}>
        <Search size={16} color="#94A3B8" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search researchers, communities, or pods..."
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {searchQuery.trim().length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clearSearchBtn}
          >
            <X size={14} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Architecture Tabs with Counts */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('all')}
          style={[styles.tabChip, activeTab === 'all' && styles.tabChipActive]}
        >
          <Layers size={13} color={activeTab === 'all' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabChipText, activeTab === 'all' && styles.tabChipTextActive]}>
            All ({dms.length + innerCircles.length + communities.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('dms')}
          style={[styles.tabChip, activeTab === 'dms' && styles.tabChipActive]}
        >
          <MessageSquare size={13} color={activeTab === 'dms' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabChipText, activeTab === 'dms' && styles.tabChipTextActive]}>
            DMs ({dms.length})
          </Text>
          {totalDMsUnread > 0 && (
            <View style={styles.chipBadge}>
              <Text style={styles.chipBadgeText}>{totalDMsUnread}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('inner_circles')}
          style={[styles.tabChip, activeTab === 'inner_circles' && styles.tabChipActive]}
        >
          <Shield size={13} color={activeTab === 'inner_circles' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabChipText, activeTab === 'inner_circles' && styles.tabChipTextActive]}>
            Inner Circles ({innerCircles.length})
          </Text>
          {totalInnersUnread > 0 && (
            <View style={styles.chipBadge}>
              <Text style={styles.chipBadgeText}>{totalInnersUnread}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('communities')}
          style={[styles.tabChip, activeTab === 'communities' && styles.tabChipActive]}
        >
          <Users size={13} color={activeTab === 'communities' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabChipText, activeTab === 'communities' && styles.tabChipTextActive]}>
            Communities ({communities.length})
          </Text>
          {totalCommsUnread > 0 && (
            <View style={styles.chipBadge}>
              <Text style={styles.chipBadgeText}>{totalCommsUnread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (activeTab !== 'communities' && activeTab !== 'all') return null;
    if (discoverableCommunities.length === 0) return null;

    return (
      <View style={styles.discoverSection}>
        <View style={styles.discoverHeader}>
          <Compass size={16} color="#064E3B" />
          <Text style={styles.discoverTitle}>Discover Public Communities</Text>
        </View>

        {discoverableCommunities.map((ws) => (
          <View key={ws.id} style={styles.discoverCard}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.discoverName}>{ws.name}</Text>
              {ws.description && (
                <Text style={styles.discoverDesc} numberOfLines={2}>
                  {ws.description}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <View style={[styles.discoverBadge, ws.subscription_price_inr > 0 ? styles.discoverBadgePaid : styles.discoverBadgeFree]}>
                  <Text style={[styles.discoverBadgeText, ws.subscription_price_inr > 0 ? styles.discoverBadgeTextPaid : styles.discoverBadgeTextFree]}>
                    {ws.subscription_price_inr > 0 ? `₹${ws.subscription_price_inr}/mo` : 'Free Open Access'}
                  </Text>
                </View>
                <Text style={styles.discoverMembersCount}>
                  {ws.members_count || 1} {ws.members_count === 1 ? 'member' : 'members'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => joinCommunity(ws.id)}
              style={styles.joinBtn}
            >
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* App Header with Back navigation & Create Workspace button */}
      <AppHeader
        title="BooffIn Workspace"
        showBack
        rightElement={
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowCreateModal(true)}
            style={styles.createHeaderBtn}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.createHeaderBtnText}>New Workspace</Text>
          </TouchableOpacity>
        }
      />

      {isLoading && displayedWorkspaces.length === 0 ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="small" color="#064E3B" />
          <Text style={styles.loaderText}>Loading your workspaces...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedWorkspaces}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <WorkspaceCard workspace={item} />}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#064E3B"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Layers size={44} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No active conversations yet</Text>
              <Text style={styles.emptySub}>
                Start a 1-to-1 researcher message with mutual follows, create an Inner Circle research pod, or launch a public community.
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowCreateModal(true)}
                style={styles.createEmptyBtn}
              >
                <Plus size={15} color="#FFFFFF" />
                <Text style={styles.createEmptyBtnText}>Create Workspace</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal to Create Community or Inner Circle */}
      <CreateWorkspaceModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  createHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  headerContent: {
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  tabChipActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  chipBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
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
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 320,
  },
  createEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  createEmptyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  clearSearchBtn: {
    padding: 4,
  },
  discoverSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  discoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  discoverTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  discoverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  discoverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  discoverDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  discoverBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discoverBadgePaid: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  discoverBadgeFree: {
    backgroundColor: '#F1F5F9',
  },
  discoverBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  discoverBadgeTextPaid: {
    color: '#064E3B',
  },
  discoverBadgeTextFree: {
    color: '#475569',
  },
  discoverMembersCount: {
    fontSize: 11,
    color: '#94A3B8',
  },
  joinBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  joinBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
