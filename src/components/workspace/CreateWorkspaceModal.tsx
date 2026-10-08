import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Search,
  X,
  Link2,
  Users,
  Check,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchFollowing } from '../../api/socialService';
import { supabase } from '../../api/client';
import { UserProfile } from '../../types';
import { Avatar } from '../core/Avatar';

interface CreateWorkspaceModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  visible,
  onClose,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const createInnerCircle = useWorkspaceStore((s) => s.createInnerCircle);

  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [followingList, setFollowingList] = useState<UserProfile[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Load user followings & suggested researchers on open
  useEffect(() => {
    if (!visible) {
      // Reset state on close
      setGroupName('');
      setSearchQuery('');
      setSelectedUsers([]);
      setErrorText(null);
      return;
    }

    let isMounted = true;

    async function loadResearchers() {
      setIsLoadingList(true);
      try {
        let list: UserProfile[] = [];

        // 1. Fetch current user's followings
        if (currentUser?.id) {
          const { researchers } = await fetchFollowing(currentUser.id, currentUser.id, 50);
          if (researchers && researchers.length > 0) {
            list = [...researchers];
          }
        }

        // 2. If list has fewer than 10 researchers, supplement with active researchers from profiles
        if (list.length < 10) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, academic_title, institution, orcid_verified, created_at')
            .neq('id', currentUser?.id || '')
            .limit(25);

          if (profiles && profiles.length > 0) {
            const existingIds = new Set(list.map((u) => u.id));
            for (const p of profiles) {
              if (!existingIds.has(p.id)) {
                const uProfile: UserProfile = {
                  id: p.id,
                  handle: p.username || 'researcher',
                  fullName: p.full_name || p.username || 'Verified Researcher',
                  avatarUrl: p.avatar_url || undefined,
                  academicTitle: p.academic_title || 'Researcher',
                  institution: p.institution || 'BooffIn Research Network',
                  bio: '',
                  orcidVerified: Boolean(p.orcid_verified),
                  followingCount: 0,
                  followersCount: 0,
                  postsCount: 0,
                  savedCount: 0,
                  joinedDate: p.created_at || new Date().toISOString(),
                  isFollowing: true,
                };
                list.push(uProfile);
              }
            }
          }
        }

        if (isMounted) {
          setFollowingList(list);
        }
      } catch (err) {
        console.warn('Error loading followings for group chat:', err);
      } finally {
        if (isMounted) setIsLoadingList(false);
      }
    }

    loadResearchers();

    return () => {
      isMounted = false;
    };
  }, [visible, currentUser?.id]);

  // Filter list by search query
  const filteredResearchers = useMemo(() => {
    if (!searchQuery.trim()) return followingList;
    const q = searchQuery.toLowerCase();
    return followingList.filter(
      (u) =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.handle || '').toLowerCase().includes(q) ||
        (u.academicTitle || '').toLowerCase().includes(q) ||
        (u.institution || '').toLowerCase().includes(q)
    );
  }, [followingList, searchQuery]);

  // Toggle user selection
  const handleToggleUser = useCallback((user: UserProfile) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  // Remove a selected user from chips
  const handleRemoveUser = useCallback((userId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  // Create Group Chat / Inner Circle
  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0) {
      setErrorText('Please select at least one researcher to start a group.');
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      // Default title if left optional
      let finalName = groupName.trim();
      if (!finalName) {
        if (selectedUsers.length === 1) {
          finalName = `${selectedUsers[0].fullName || selectedUsers[0].handle}'s Pod`;
        } else {
          finalName = `${selectedUsers[0].fullName?.split(' ')[0] || 'Member'}, ${selectedUsers[1].fullName?.split(' ')[0] || 'Member'}${selectedUsers.length > 2 ? ` & ${selectedUsers.length - 2} others` : ''}`;
        }
      }

      const memberIds = selectedUsers.map((u) => u.id);

      const res = await createInnerCircle({
        name: finalName,
        description: `Private research group with ${selectedUsers.length} collaborator${selectedUsers.length > 1 ? 's' : ''}`,
        e2ee_enabled: true,
        member_ids: memberIds,
      });

      if (res.error || !res.workspace) {
        setErrorText(res.error || 'Failed to create group');
        setIsSubmitting(false);
        return;
      }

      onClose();
      router.push(`/workspace/${res.workspace.id}` as any);
    } catch (err: any) {
      setErrorText(err?.message || 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const isUserSelected = (userId: string) => selectedUsers.some((u) => u.id === userId);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New group chat</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Group Name (Optional) Input Box */}
        <View style={styles.groupNameContainer}>
          <View style={styles.groupNameInputWrap}>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name (optional)"
              placeholderTextColor="#94A3B8"
              style={styles.groupNameInput}
              autoCapitalize="words"
            />
            {groupName.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setGroupName('')}
                style={styles.clearInputBtn}
              >
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search"
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Create group with link option row */}
        <TouchableOpacity activeOpacity={0.7} style={styles.linkGroupRow}>
          <View style={styles.linkIconCircle}>
            <Link2 size={20} color="#0F172A" strokeWidth={2.2} />
          </View>
          <View style={styles.linkTextCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.linkTitle}>Create group with a link</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            </View>
            <Text style={styles.linkSubtitle}>Anyone with the link can join the group.</Text>
          </View>
        </TouchableOpacity>

        {/* Selected Members Carousel Strip */}
        {selectedUsers.length > 0 && (
          <View style={styles.selectedSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectedScrollContent}
            >
              {selectedUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  activeOpacity={0.8}
                  onPress={() => handleRemoveUser(user.id)}
                  style={styles.selectedMemberChip}
                >
                  <View style={styles.selectedAvatarWrapper}>
                    <Avatar
                      url={user.avatarUrl}
                      name={user.fullName || user.handle}
                      size="lg"
                    />
                    <View style={styles.selectedRemoveBadge}>
                      <X size={12} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.selectedMemberName}>
                    {user.fullName?.split(' ')[0] || user.handle}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Section Title */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Suggested</Text>
        </View>

        {/* Error Banner */}
        {errorText && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}

        {/* Researchers / Followings List */}
        {isLoadingList ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#164E3F" />
            <Text style={styles.loadingText}>Loading researchers...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredResearchers}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const selected = isUserSelected(item.id);
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleToggleUser(item)}
                  style={[styles.userRow, selected && styles.userRowSelected]}
                >
                  <Avatar
                    url={item.avatarUrl}
                    name={item.fullName || item.handle}
                    size="md"
                  />
                  <View style={styles.userInfoCol}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text numberOfLines={1} style={styles.userName}>
                        {item.fullName || item.handle}
                      </Text>
                      {item.orcidVerified && (
                        <CheckCircle2 size={13} color="#164E3F" strokeWidth={2.5} />
                      )}
                    </View>
                    <Text numberOfLines={1} style={styles.userHandle}>
                      {item.handle ? `@${item.handle}` : item.academicTitle || 'Researcher'}
                    </Text>
                  </View>

                  {/* Selection Indicator / Checkmark */}
                  <View
                    style={[
                      styles.selectionCircle,
                      selected && styles.selectionCircleActive,
                    ]}
                  >
                    {selected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Users size={36} color="#CBD5E1" />
                <Text style={styles.emptyListTitle}>No researchers found</Text>
                <Text style={styles.emptyListSubtitle}>
                  Try searching with a different name or keyword.
                </Text>
              </View>
            }
          />
        )}

        {/* Sticky Bottom Create Button */}
        <View style={styles.bottomDock}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isSubmitting || selectedUsers.length === 0}
            onPress={handleCreateGroup}
            style={[
              styles.createBtn,
              selectedUsers.length === 0 && styles.createBtnDisabled,
              isSubmitting && { opacity: 0.7 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.createBtnText}>
                {selectedUsers.length > 0
                  ? `Create group chat (${selectedUsers.length})`
                  : 'Create group chat'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  groupNameContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  groupNameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
  },
  groupNameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
  },
  clearInputBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4F7',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 40,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  linkGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
  },
  linkIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTextCol: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  linkSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  newBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedScrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  selectedMemberChip: {
    alignItems: 'center',
    width: 60,
  },
  selectedAvatarWrapper: {
    position: 'relative',
  },
  selectedRemoveBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMemberName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0F172A',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  listContent: {
    paddingBottom: 90,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  userRowSelected: {
    backgroundColor: '#F8FAFC',
  },
  userInfoCol: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  userHandle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectionCircleActive: {
    backgroundColor: '#164E3F',
    borderColor: '#164E3F',
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyList: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptyListSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  errorContainer: {
    marginHorizontal: 16,
    padding: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  createBtn: {
    backgroundColor: '#164E3F',
    borderRadius: 24,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  createBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
