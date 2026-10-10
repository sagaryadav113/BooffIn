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
  Users,
  Check,
  CheckCircle2,
  Sparkles,
  Globe,
  Lock,
  Info,
  Camera,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchFollowing } from '../../api/socialService';
import { uploadPostImage } from '../../api/storageService';
import { supabase } from '../../api/client';
import { UserProfile, WorkspaceSubscriptionTier } from '../../types';
import { Workspace } from '../../types/workspace';
import { Avatar } from '../core/Avatar';

interface CreateCommunityModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  visible,
  onClose,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const createCommunity = useWorkspaceStore((s) => s.createCommunity);
  const disableCommunity = useWorkspaceStore((s) => s.disableCommunity);
  const communities = useWorkspaceStore((s) => s.communities);

  const activeOwnedCommunities = useMemo(() => {
    if (!currentUser?.id) return [];
    return (communities || []).filter(
      (c) =>
        (c.owner_id === currentUser.id || c.creator_id === currentUser.id) &&
        c.type === 'community' &&
        !c.is_disabled &&
        c.status !== 'disabled' &&
        !c.settings?.is_disabled
    );
  }, [communities, currentUser?.id]);

  const ownedCommunitiesCount = activeOwnedCommunities.length;
  const hasReachedLimit = ownedCommunitiesCount >= 3;

  const [communityToDisable, setCommunityToDisable] = useState<Workspace | null>(null);
  const [showDisableConfirmModal, setShowDisableConfirmModal] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
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
      setName('');
      setAvatarUri(null);
      setDescription('');
      setIsPrivate(false);
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

        // 2. Supplement with active researchers from profiles
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
        console.warn('Error loading followings for community creation:', err);
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

  // Pick custom community avatar
  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingAvatar(true);
        const uploadRes = await uploadPostImage(
          currentUser?.id || 'community_avatar',
          result.assets[0]
        );
        const finalUrl = uploadRes.url || result.assets[0].uri;
        setAvatarUri(finalUrl);
        setIsUploadingAvatar(false);
      }
    } catch (err: any) {
      setIsUploadingAvatar(false);
      console.warn('Pick avatar error:', err);
    }
  };

  // Remove a selected user from chips
  const handleRemoveUser = useCallback((userId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  // Handle Permanent Community Disabling
  const handleConfirmDisable = async () => {
    if (!communityToDisable) return;
    setIsDisabling(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
      const res = await disableCommunity(communityToDisable.id);
      if (res.error) {
        setErrorText(res.error);
      } else {
        setShowDisableConfirmModal(false);
        setCommunityToDisable(null);
        setErrorText(null);
      }
    } catch (err: any) {
      setErrorText(err?.message || 'Failed to disable community');
    } finally {
      setIsDisabling(false);
    }
  };

  // Create Community
  const handleCreateCommunity = async () => {
    if (hasReachedLimit) {
      setErrorText('Community Limit Reached: You must disable one of your 3 active communities to create a new one.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorText('Please enter a community name.');
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      const memberIds = selectedUsers.map((u) => u.id);

      const res = await createCommunity({
        name: trimmedName,
        description: description.trim() || undefined,
        subscription_tier: 'free',
        is_private: isPrivate,
        avatar_url: avatarUri || undefined,
        member_ids: memberIds,
      });

      if (res.error || !res.workspace) {
        setErrorText(res.error || 'Failed to create community');
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
          <Text style={styles.headerTitle}>New community</Text>
          <View style={{ width: 32 }} />
        </View>

        <FlatList
          data={filteredResearchers}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {/* Capacity Limit Notice Card */}
              {hasReachedLimit ? (
                <View style={styles.limitInfoCard}>
                  <View style={styles.limitInfoHeader}>
                    <Info size={17} color="#0F172A" strokeWidth={2.2} />
                    <Text style={styles.limitInfoTitle}>Community Limit (3/3 Active)</Text>
                  </View>
                  <Text style={styles.limitInfoSub}>
                    You have reached the limit of 3 active communities. To create a new one, disable an existing community to free up a slot.
                  </Text>
                  <View style={styles.limitInfoNoteBox}>
                    <Text style={styles.limitInfoNoteText}>
                      Disabled communities remain viewable for show purpose (past chats, papers, media), but new messages cannot be sent.
                    </Text>
                  </View>

                  <Text style={styles.disableListHeader}>Select a community to disable:</Text>
                  <View style={styles.disableCommunitiesList}>
                    {activeOwnedCommunities.map((comm) => (
                      <View key={comm.id} style={styles.disableCommunityRow}>
                        <Avatar
                          url={comm.avatar_url || undefined}
                          name={comm.name}
                          size="sm"
                        />
                        <View style={styles.disableCommunityInfo}>
                          <Text numberOfLines={1} style={styles.disableCommunityName}>
                            {comm.name}
                          </Text>
                          <Text style={styles.disableCommunityMeta}>
                            {comm.members_count || 1} {comm.members_count === 1 ? 'member' : 'members'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            setCommunityToDisable(comm);
                            setShowDisableConfirmModal(true);
                          }}
                          style={styles.disableActionBtn}
                        >
                          <Text style={styles.disableActionBtnText}>Disable</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.capacityBadgeContainer}>
                  <View style={styles.capacityPill}>
                    <Text style={styles.capacityPillText}>
                      Community Capacity: {ownedCommunitiesCount}/3 Active
                    </Text>
                  </View>
                </View>
              )}

              {/* Community Avatar & Name Input Row */}
              <View style={styles.inputContainer}>
                <View style={styles.communityHeaderRow}>
                  {/* Custom Avatar Picker */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePickAvatar}
                    disabled={isUploadingAvatar}
                    style={styles.avatarPickerBtn}
                  >
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color="#164E3F" />
                    ) : avatarUri ? (
                      <Avatar uri={avatarUri} name={name || 'Community'} size={46} />
                    ) : (
                      <View style={styles.avatarPickerPlaceholder}>
                        <Camera size={20} color="#164E3F" strokeWidth={2} />
                      </View>
                    )}
                    <View style={styles.avatarCameraBadge}>
                      <Camera size={9} color="#FFFFFF" strokeWidth={2.4} />
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Community name (e.g. Synthetic Biology Hub)"
                      placeholderTextColor="#94A3B8"
                      style={styles.textInput}
                      autoCapitalize="words"
                    />
                    {name.length > 0 && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setName('')}
                        style={styles.clearInputBtn}
                      >
                        <X size={14} color="#64748B" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Description Input Box */}
              <View style={[styles.inputContainer, { paddingTop: 4 }]}>
                <View style={[styles.inputWrap, { height: 68, alignItems: 'flex-start', paddingTop: 10 }]}>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Research focus & goals (optional)"
                    placeholderTextColor="#94A3B8"
                    style={[styles.textInput, { height: 48, textAlignVertical: 'top' }]}
                    multiline
                  />
                  {description.length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setDescription('')}
                      style={styles.clearInputBtn}
                    >
                      <X size={14} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Search Bar for Inviting Collaborators */}
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Search size={18} color="#94A3B8" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search collaborators to invite"
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

              {/* Suggested Researchers Section Header */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Invite Researchers</Text>
              </View>

              {/* Error Banner */}
              {errorText && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorText}</Text>
                </View>
              )}
            </View>
          }
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
            isLoadingList ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#164E3F" />
                <Text style={styles.loadingText}>Loading researchers...</Text>
              </View>
            ) : (
              <View style={styles.emptyList}>
                <Users size={36} color="#CBD5E1" />
                <Text style={styles.emptyListTitle}>No researchers found</Text>
                <Text style={styles.emptyListSubtitle}>
                  Try searching with a different name or keyword.
                </Text>
              </View>
            )
          }
        />

        {/* Sticky Bottom Create Button */}
        <View style={styles.bottomDock}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={hasReachedLimit || isSubmitting || !name.trim()}
            onPress={handleCreateCommunity}
            style={[
              styles.createBtn,
              (hasReachedLimit || !name.trim()) && styles.createBtnDisabled,
              isSubmitting && { opacity: 0.7 },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.createBtnText}>
                {hasReachedLimit
                  ? 'Limit Reached (3/3 Communities)'
                  : selectedUsers.length > 0
                  ? `Create community (${selectedUsers.length} invited)`
                  : 'Create community'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Permanent Disable Confirmation Modal */}
        <Modal
          visible={showDisableConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!isDisabling) {
              setShowDisableConfirmModal(false);
              setCommunityToDisable(null);
            }
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.confirmDialogCard}>
              <View style={styles.confirmDialogIconWrap}>
                <Info size={24} color="#0F172A" strokeWidth={2} />
              </View>

              <Text style={styles.confirmDialogTitle}>Disable "{communityToDisable?.name}"?</Text>

              <Text style={styles.confirmDialogSubtitle}>
                Disabling frees up 1 community slot so you can create a new community.
              </Text>

              <View style={styles.confirmBulletList}>
                <View style={styles.confirmBulletItem}>
                  <Text style={styles.confirmBulletDot}>•</Text>
                  <Text style={styles.confirmBulletText}>
                    <Text style={{ fontWeight: '600', color: '#0F172A' }}>View Only:</Text> Past chats, papers, media, and profiles remain viewable for portfolio and reference.
                  </Text>
                </View>
                <View style={styles.confirmBulletItem}>
                  <Text style={styles.confirmBulletDot}>•</Text>
                  <Text style={styles.confirmBulletText}>
                    <Text style={{ fontWeight: '600', color: '#0F172A' }}>Communication Closed:</Text> Sending new messages, podcasts, and calls will be disabled.
                  </Text>
                </View>
                <View style={styles.confirmBulletItem}>
                  <Text style={styles.confirmBulletDot}>•</Text>
                  <Text style={styles.confirmBulletText}>
                    <Text style={{ fontWeight: '600', color: '#0F172A' }}>Permanent:</Text> This action cannot be undone.
                  </Text>
                </View>
              </View>

              <View style={styles.confirmDialogActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={isDisabling}
                  onPress={() => {
                    setShowDisableConfirmModal(false);
                    setCommunityToDisable(null);
                  }}
                  style={styles.confirmCancelBtn}
                >
                  <Text style={styles.confirmCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isDisabling}
                  onPress={handleConfirmDisable}
                  style={styles.confirmDangerBtn}
                >
                  {isDisabling ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmDangerBtnText}>Disable</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  limitInfoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  limitInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  limitInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  limitInfoSub: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 17,
  },
  limitInfoNoteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  limitInfoNoteText: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  disableListHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 8,
  },
  disableCommunitiesList: {
    gap: 8,
  },
  disableCommunityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  disableCommunityInfo: {
    flex: 1,
  },
  disableCommunityName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  disableCommunityMeta: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  disableActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  disableActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmDialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  confirmDialogIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmDialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  confirmDialogSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  confirmBulletList: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
    marginBottom: 18,
  },
  confirmBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  confirmBulletDot: {
    fontSize: 13,
    color: '#64748B',
    marginTop: -1,
  },
  confirmBulletText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  confirmDialogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  confirmDangerBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDangerBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  capacityBadgeContainer: {
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  capacityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  capacityPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#166534',
    letterSpacing: -0.1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  communityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPickerBtn: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPickerPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
  },
  textInput: {
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
    paddingTop: 12,
    paddingBottom: 6,
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
    paddingTop: 14,
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
