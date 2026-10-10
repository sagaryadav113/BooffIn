import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import {
  X,
  Search,
  Check,
  UserPlus,
  Users,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Workspace, WorkspaceMember } from '../../types/workspace';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { workspaceService } from '../../api/workspaceService';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export interface WorkspaceAddMembersModalProps {
  visible: boolean;
  onClose: () => void;
  workspace: Workspace;
  existingMembers?: WorkspaceMember[];
  onMemberAdded?: () => void;
}

interface ResearcherConnection {
  id: string;
  fullName: string;
  handle: string;
  avatarUrl?: string | null;
  academicTitle?: string | null;
  institution?: string | null;
  isMutual: boolean;
  isFollowing: boolean;
  isFollower: boolean;
  isAlreadyMember?: boolean;
}

type FilterTab = 'all' | 'mutual' | 'following' | 'followers';

export const WorkspaceAddMembersModal: React.FC<WorkspaceAddMembersModalProps> = ({
  visible,
  onClose,
  workspace,
  existingMembers = [],
  onMemberAdded,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const loadWorkspaceDetails = useWorkspaceStore((s) => s.loadWorkspaceDetails);
  const loadMembers = useWorkspaceStore((s) => s.loadMembers);

  const [connections, setConnections] = useState<ResearcherConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load followers and following on modal open
  useEffect(() => {
    if (!visible || !currentUser?.id) return;

    let isMounted = true;
    setIsLoading(true);
    setSelectedIds(new Set());
    setStatusMessage(null);
    setSearchQuery('');

    (async () => {
      try {
        const res = await workspaceService.getFollowersAndFollowing(currentUser.id);
        if (!isMounted) return;

        const existingMemberIds = new Set(
          (existingMembers || []).map((m) => m.user_id)
        );

        const mapped: ResearcherConnection[] = (res.researchers || []).map((r) => ({
          ...r,
          isAlreadyMember: existingMemberIds.has(r.id),
        }));

        setConnections(mapped);
      } catch (err: any) {
        if (isMounted) {
          setStatusMessage(err?.message || 'Failed to load followers');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, currentUser?.id, existingMembers]);

  // Toggle selection for a researcher
  const toggleSelect = (id: string, isAlreadyMember?: boolean) => {
    if (isAlreadyMember) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered connections list based on search and active tab
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return connections.filter((c) => {
      // Tab filter
      if (activeFilter === 'mutual' && !c.isMutual) return false;
      if (activeFilter === 'following' && !c.isFollowing) return false;
      if (activeFilter === 'followers' && !c.isFollower) return false;

      // Text search
      if (q) {
        const nameMatch = c.fullName.toLowerCase().includes(q);
        const handleMatch = c.handle.toLowerCase().includes(q);
        const titleMatch = (c.academicTitle || '').toLowerCase().includes(q);
        const instMatch = (c.institution || '').toLowerCase().includes(q);
        if (!nameMatch && !handleMatch && !titleMatch && !instMatch) return false;
      }
      return true;
    });
  }, [connections, searchQuery, activeFilter]);

  // Breakdown of selected users
  const selectedCounts = useMemo(() => {
    let mutualCount = 0;
    let inviteCount = 0;
    selectedIds.forEach((id) => {
      const found = connections.find((c) => c.id === id);
      if (found?.isMutual) mutualCount++;
      else inviteCount++;
    });
    return { mutualCount, inviteCount, total: selectedIds.size };
  }, [selectedIds, connections]);

  // Handle Add Action
  const handleConfirmAdd = async () => {
    if (selectedIds.size === 0 || !currentUser?.id) return;

    // Check inner circle capacity
    if (workspace.type === 'inner_circle') {
      const currentActiveCount = (existingMembers || []).filter(
        (m) => m.status === 'active'
      ).length;
      if (currentActiveCount + selectedCounts.mutualCount > 25) {
        Alert.alert(
          'Capacity Exceeded',
          `Inner circle pod is limited to 25 members. Current active: ${currentActiveCount}. Cannot add ${selectedCounts.mutualCount} more.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    let directAdded = 0;
    let inviteSent = 0;
    const errors: string[] = [];

    for (const targetId of Array.from(selectedIds)) {
      const person = connections.find((c) => c.id === targetId);
      if (!person) continue;

      if (person.isMutual) {
        // Mutual follower -> Add directly to workspace
        const res = await workspaceService.addDirectMember(workspace.id, targetId, 'member');
        if (res.success) {
          directAdded++;
        } else {
          errors.push(res.error || `Could not add ${person.fullName}`);
        }
      } else {
        // Non-mutual follower -> Send invitation link on their chat
        const res = await workspaceService.sendWorkspaceInvitation(
          workspace,
          targetId,
          currentUser.id
        );
        if (res.success) {
          inviteSent++;
        } else {
          errors.push(res.error || `Could not send invite to ${person.fullName}`);
        }
      }
    }

    setIsSubmitting(false);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    // Formulate feedback summary
    const parts = [];
    if (directAdded > 0) parts.push(`Added ${directAdded} mutual follower${directAdded > 1 ? 's' : ''} directly`);
    if (inviteSent > 0) parts.push(`Sent chat invite to ${inviteSent} researcher${inviteSent > 1 ? 's' : ''}`);

    const msg = parts.join('. ') + '.';
    setStatusMessage(msg);

    // Refresh workspace details and members in store
    await loadMembers(workspace.id);
    await loadWorkspaceDetails(workspace.id);
    onMemberAdded?.();

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const renderConnectionItem = useCallback(
    ({ item }: { item: ResearcherConnection }) => {
      const isSelected = selectedIds.has(item.id);
      const isAlready = item.isAlreadyMember;

      return (
        <TouchableOpacity
          activeOpacity={isAlready ? 1 : 0.75}
          onPress={() => toggleSelect(item.id, isAlready)}
          style={[
            styles.itemRow,
            isSelected && styles.itemRowSelected,
            isAlready && styles.itemRowDisabled,
          ]}
        >
          <Avatar
            uri={item.avatarUrl || undefined}
            name={item.fullName}
            size="md"
          />

          <View style={styles.itemInfo}>
            <View style={styles.itemNameRow}>
              <Text style={styles.itemFullName} numberOfLines={1}>
                {item.fullName}
              </Text>
              {item.isAlreadyMember ? (
                <View style={[styles.badge, styles.badgeDisabled]}>
                  <Text style={styles.badgeTextDisabled}>Already Member</Text>
                </View>
              ) : item.isMutual ? (
                <View style={[styles.badge, styles.badgeMutual]}>
                  <Text style={styles.badgeTextMutual}>🤝 Mutual</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgeInvite]}>
                  <Text style={styles.badgeTextInvite}>✉️ Invite</Text>
                </View>
              )}
            </View>

            <Text style={styles.itemSub} numberOfLines={1}>
              @{item.handle}
              {item.academicTitle ? ` • ${item.academicTitle}` : ''}
              {item.institution ? ` (${item.institution})` : ''}
            </Text>
          </View>

          {/* Selection Circle / Checkbox */}
          <View
            style={[
              styles.checkboxCircle,
              isSelected && styles.checkboxCircleSelected,
              isAlready && styles.checkboxCircleDisabled,
            ]}
          >
            {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
          </View>
        </TouchableOpacity>
      );
    },
    [selectedIds]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
        pointerEvents="box-none"
      >
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Sheet Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <View style={styles.headerPillRow}>
                <UserPlus size={13} color="#064E3B" strokeWidth={2.5} />
                <Text style={styles.headerPillText}>ADD TO GROUP</Text>
              </View>
              <Text style={styles.title}>Add to {workspace.name}</Text>
              <Text style={styles.subtitle}>
                Mutual followers are added directly. Other connections receive a chat invitation.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Status / Success Banner */}
          {statusMessage ? (
            <View style={styles.statusBanner}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={styles.statusBannerText}>{statusMessage}</Text>
            </View>
          ) : null}

          {/* Search Bar at Top */}
          <View style={styles.searchBar}>
            <Search size={15} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search followers & following..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={15} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={() => setActiveFilter('all')}
              style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
                All ({connections.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('mutual')}
              style={[styles.filterPill, activeFilter === 'mutual' && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, activeFilter === 'mutual' && styles.filterPillTextActive]}>
                🤝 Mutual ({connections.filter((c) => c.isMutual).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('following')}
              style={[styles.filterPill, activeFilter === 'following' && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, activeFilter === 'following' && styles.filterPillTextActive]}>
                Following ({connections.filter((c) => c.isFollowing).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveFilter('followers')}
              style={[styles.filterPill, activeFilter === 'followers' && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, activeFilter === 'followers' && styles.filterPillTextActive]}>
                Followers ({connections.filter((c) => c.isFollower).length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Connections List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#064E3B" />
              <Text style={styles.loadingText}>Loading your connections...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredList}
              keyExtractor={(item) => item.id}
              renderItem={renderConnectionItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Users size={32} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>
                    {searchQuery ? 'No matching researchers' : 'No followers or following found'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? 'Try searching by a different name or handle.'
                      : 'Follow researchers or share research to grow your academic network.'}
                  </Text>
                </View>
              }
            />
          )}

          {/* Sticky Bottom Action Bar with Dark Green "Add" Button */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomMetaCol}>
              <Text style={styles.bottomSelectedCount}>
                {selectedCounts.total} selected
              </Text>
              <Text style={styles.bottomBreakdown}>
                {selectedCounts.mutualCount > 0 ? `${selectedCounts.mutualCount} direct add` : ''}
                {selectedCounts.mutualCount > 0 && selectedCounts.inviteCount > 0 ? ' • ' : ''}
                {selectedCounts.inviteCount > 0 ? `${selectedCounts.inviteCount} chat invite` : ''}
                {selectedCounts.total === 0 ? 'Select members to add' : ''}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={selectedCounts.total === 0 || isSubmitting}
              onPress={handleConfirmAdd}
              style={[
                styles.addSubmitBtn,
                (selectedCounts.total === 0 || isSubmitting) && styles.addSubmitBtnDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <UserPlus size={16} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.addSubmitBtnText}>
                    Add {selectedCounts.total > 0 ? `(${selectedCounts.total})` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 640,
    maxHeight: SCREEN_HEIGHT * 0.88,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 24,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: 12,
  },
  headerPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  headerPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#064E3B',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    borderRadius: 8,
  },
  statusBannerText: {
    fontSize: 12.5,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 38,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#064E3B',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  itemRowSelected: {
    backgroundColor: 'rgba(6, 78, 59, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  itemRowDisabled: {
    opacity: 0.55,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemFullName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  badgeMutual: {
    backgroundColor: '#ECFDF5',
  },
  badgeTextMutual: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#065F46',
  },
  badgeInvite: {
    backgroundColor: '#EFF6FF',
  },
  badgeTextInvite: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  badgeDisabled: {
    backgroundColor: '#F1F5F9',
  },
  badgeTextDisabled: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  itemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCircleSelected: {
    backgroundColor: '#064E3B',
    borderColor: '#064E3B',
  },
  checkboxCircleDisabled: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  bottomMetaCol: {
    flex: 1,
    paddingRight: 12,
  },
  bottomSelectedCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  bottomBreakdown: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  addSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B', // dark green option requested
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 100,
    justifyContent: 'center',
  },
  addSubmitBtnDisabled: {
    opacity: 0.5,
  },
  addSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
