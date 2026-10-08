import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  Layers,
  ChevronUp,
  ChevronDown,
  Search,
  Users,
  MessageSquare,
  Lock,
  Plus,
  ExternalLink,
  Shield,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { CreateWorkspaceModal } from '../workspace/CreateWorkspaceModal';
import { Workspace } from '../../types/workspace';

type DockTab = 'all' | 'dms' | 'communities' | 'inner_circles';

export const DesktopMessagesDock: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<DockTab>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentUser = useAuthStore((s) => s.user);

  const dms = useWorkspaceStore((s) => s.dms);
  const communities = useWorkspaceStore((s) => s.communities);
  const innerCircles = useWorkspaceStore((s) => s.innerCircles);
  const unreadTotal = useWorkspaceStore((s) => s.unreadTotal);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);

  useEffect(() => {
    if (currentUser?.id) {
      loadWorkspaces();
    }
  }, [currentUser?.id]);

  const displayedList = useMemo(() => {
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

  const handleOpenWorkspace = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}` as any);
  };

  const handleOpenFullHub = () => {
    router.push('/workspace' as any);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        right: 28,
        width: 360,
        zIndex: 9999,
      }}
    >
      <View style={styles.dockContainer}>
        {/* Header Bar */}
        <TouchableOpacity
          id="booffin-desktop-messages-toggle"
          activeOpacity={0.9}
          onPress={() => setIsOpen(!isOpen)}
          style={styles.headerBar}
        >
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrapper}>
              <Layers size={14} color="#064E3B" />
            </View>
            <Text style={styles.headerTitle}>Community & DMs</Text>
            {unreadTotal > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={(e) => {
                e.stopPropagation?.();
                handleOpenFullHub();
              }}
              style={styles.expandHeaderBtn}
              accessibilityLabel="Open Full Workspace"
            >
              <ExternalLink size={14} color="#64748B" />
            </TouchableOpacity>
            {isOpen ? (
              <ChevronDown size={18} color="#475569" />
            ) : (
              <ChevronUp size={18} color="#475569" />
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Body */}
        {isOpen && (
          <View style={styles.expandedBody}>
            {/* Quick Navigation Tabs & New Button */}
            <View style={styles.tabNavRow}>
              <View style={styles.tabPillsGroup}>
                <TouchableOpacity
                  onPress={() => setActiveTab('all')}
                  style={[styles.tabPill, activeTab === 'all' && styles.tabPillActive]}
                >
                  <Text style={[styles.tabPillText, activeTab === 'all' && styles.tabPillTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('dms')}
                  style={[styles.tabPill, activeTab === 'dms' && styles.tabPillActive]}
                >
                  <Text style={[styles.tabPillText, activeTab === 'dms' && styles.tabPillTextActive]}>
                    DMs ({dms.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('inner_circles')}
                  style={[styles.tabPill, activeTab === 'inner_circles' && styles.tabPillActive]}
                >
                  <Text style={[styles.tabPillText, activeTab === 'inner_circles' && styles.tabPillTextActive]}>
                    Pods ({innerCircles.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('communities')}
                  style={[styles.tabPill, activeTab === 'communities' && styles.tabPillActive]}
                >
                  <Text style={[styles.tabPillText, activeTab === 'communities' && styles.tabPillTextActive]}>
                    Communities
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                style={styles.quickCreateBtn}
                accessibilityLabel="Create Workspace"
              >
                <Plus size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchRow}>
              <Search size={14} color="#94A3B8" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search messages, pods, or topics..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
            </View>

            {/* Workspaces List */}
            {isLoading && displayedList.length === 0 ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color="#064E3B" />
                <Text style={styles.loadingText}>Syncing workspaces...</Text>
              </View>
            ) : displayedList.length > 0 ? (
              <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
                {displayedList.map((ws) => {
                  const isDM = ws.type === 'dm';
                  const isInnerCircle = ws.type === 'inner_circle';
                  const name = isDM ? ws.other_user?.fullName || ws.name : ws.name;
                  const avatar = isDM ? ws.other_user?.avatarUrl : ws.avatar_url;
                  const unread = ws.unread_count || 0;

                  return (
                    <TouchableOpacity
                      key={ws.id}
                      activeOpacity={0.7}
                      onPress={() => handleOpenWorkspace(ws.id)}
                      style={[
                        styles.conversationItem,
                        unread > 0 && styles.conversationItemUnread,
                      ]}
                    >
                      {/* Avatar */}
                      <View style={{ position: 'relative' }}>
                        {isDM ? (
                          <Avatar uri={avatar || undefined} name={name} size="sm" />
                        ) : isInnerCircle ? (
                          <View style={styles.innerCircleIcon}>
                            <Lock size={14} color="#064E3B" />
                          </View>
                        ) : (
                          <View style={styles.communityIcon}>
                            <Users size={14} color="#1D4ED8" />
                          </View>
                        )}
                      </View>

                      {/* Info Meta */}
                      <View style={styles.convMeta}>
                        <View style={styles.convNameRow}>
                          <Text style={styles.convName} numberOfLines={1}>
                            {name}
                          </Text>
                          {unread > 0 && (
                            <View style={styles.itemUnreadDot}>
                              <Text style={styles.itemUnreadText}>{unread}</Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.convSubtitle} numberOfLines={1}>
                          {isDM
                            ? ws.other_user?.academicTitle || ws.other_user?.institution || 'Mutual Follow Direct Message'
                            : isInnerCircle
                            ? `${ws.members_count || 1}/25 Pod Members · E2EE`
                            : ws.description || 'Research Community Discussions'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Layers size={28} color="#CBD5E1" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No active workspaces</Text>
                <Text style={styles.emptySub}>
                  Follow researchers mutually for 1-on-1 DMs, or create a community or private pod.
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCreateModal(true)}
                  style={styles.emptyActionBtn}
                >
                  <Plus size={13} color="#FFFFFF" />
                  <Text style={styles.emptyActionBtnText}>Create Workspace</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footerNote}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Shield size={12} color="#064E3B" />
                <Text style={styles.footerNoteText}>
                  Encrypted BooffIn Academic Workspace
                </Text>
              </View>
              <TouchableOpacity onPress={handleOpenFullHub}>
                <Text style={styles.viewAllLink}>Open Hub →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Creation Modal */}
      <CreateWorkspaceModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

const styles = StyleSheet.create({
  dockContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
    overflow: 'hidden',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconWrapper: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  unreadBadge: {
    backgroundColor: '#064E3B',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandHeaderBtn: {
    padding: 4,
  },
  expandedBody: {
    height: 390,
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
  },
  tabNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  tabPillsGroup: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
    overflow: 'hidden',
  },
  tabPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  tabPillActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  quickCreateBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
    padding: 0,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 10,
  },
  conversationItemUnread: {
    backgroundColor: '#F0FDF4',
  },
  innerCircleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convMeta: {
    flex: 1,
  },
  convNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  convName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  convSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  itemUnreadDot: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 6,
  },
  itemUnreadText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 12,
  },
  emptyActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerNoteText: {
    fontSize: 11,
    color: '#064E3B',
    fontWeight: '600',
  },
  viewAllLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#064E3B',
  },
});
