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
  DollarSign,
  Sparkles,
  Globe,
  Lock,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchFollowing } from '../../api/socialService';
import { supabase } from '../../api/client';
import { UserProfile, WorkspaceSubscriptionTier } from '../../types';
import { Avatar } from '../core/Avatar';

interface CreateCommunityModalProps {
  visible: boolean;
  onClose: () => void;
}

const COMMUNITY_TIERS: Array<{
  tier: WorkspaceSubscriptionTier;
  price: number;
  label: string;
  badge: string;
  desc: string;
}> = [
  {
    tier: 'free',
    price: 0,
    label: 'Free Open Access',
    badge: 'Open',
    desc: 'Anyone can discover, join, and participate freely',
  },
  {
    tier: 'tier_49',
    price: 49,
    label: '₹49 / mo',
    badge: 'Lab Club',
    desc: 'Accessible journal club & preprint reviews',
  },
  {
    tier: 'tier_119',
    price: 119,
    label: '₹119 / mo',
    badge: 'Research Symposia',
    desc: 'Active research domain & live paper discussions',
  },
  {
    tier: 'tier_219',
    price: 219,
    label: '₹219 / mo',
    badge: 'Podcasts & Masterclass',
    desc: 'Specialized symposium & podcast community',
  },
  {
    tier: 'tier_599',
    price: 599,
    label: '₹599 / mo',
    badge: 'Grant Lab Hub',
    desc: 'Premium masterclass & grant collaboration hub',
  },
];

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({
  visible,
  onClose,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const createCommunity = useWorkspaceStore((s) => s.createCommunity);
  const communities = useWorkspaceStore((s) => s.communities);

  const ownedCommunitiesCount = useMemo(() => {
    if (!currentUser?.id) return 0;
    return (communities || []).filter(
      (c) => (c.owner_id === currentUser.id || c.creator_id === currentUser.id) && c.type === 'community'
    ).length;
  }, [communities, currentUser?.id]);

  const hasReachedLimit = ownedCommunitiesCount >= 3;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTier, setSelectedTier] = useState<WorkspaceSubscriptionTier>('free');
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
      setDescription('');
      setSelectedTier('free');
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

  // Remove a selected user from chips
  const handleRemoveUser = useCallback((userId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  // Create Community
  const handleCreateCommunity = async () => {
    if (hasReachedLimit) {
      setErrorText('Community Limit Reached: You cannot create more than 3 communities. You currently own 3/3 communities.');
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
        subscription_tier: selectedTier,
        is_private: isPrivate,
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
              {/* Strict Capacity Limit Indicator / Warning Banner */}
              {hasReachedLimit ? (
                <View style={styles.limitWarningCard}>
                  <View style={styles.limitWarningHeader}>
                    <AlertTriangle size={17} color="#DC2626" strokeWidth={2.5} />
                    <Text style={styles.limitWarningTitle}>Creation Limit Reached (3/3)</Text>
                  </View>
                  <Text style={styles.limitWarningSub}>
                    In BooffIn Workspace, each researcher can create and manage up to 3 communities. You currently own 3/3 active communities.
                  </Text>
                </View>
              ) : (
                <View style={styles.capacityBadgeContainer}>
                  <View style={styles.capacityPill}>
                    <Text style={styles.capacityPillText}>
                      Community Capacity: {ownedCommunitiesCount}/3 Created
                    </Text>
                  </View>
                </View>
              )}

              {/* Community Name Input Box */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrap}>
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

              {/* Subscription & Access Model Strip */}
              <View style={styles.tierSection}>
                <Text style={styles.sectionHeaderTitle}>Access Model & Subscription Tier</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tierScrollContent}
                >
                  {COMMUNITY_TIERS.map((tierItem) => {
                    const isSelected = selectedTier === tierItem.tier;
                    return (
                      <TouchableOpacity
                        key={tierItem.tier}
                        activeOpacity={0.8}
                        onPress={() => setSelectedTier(tierItem.tier)}
                        style={[
                          styles.tierCard,
                          isSelected && styles.tierCardActive,
                        ]}
                      >
                        <View style={styles.tierCardHeader}>
                          <Text
                            style={[
                              styles.tierCardPrice,
                              isSelected && styles.tierCardPriceActive,
                            ]}
                          >
                            {tierItem.label}
                          </Text>
                          {isSelected && (
                            <View style={styles.tierCheckBadge}>
                              <Check size={11} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.tierCardBadge,
                            isSelected && styles.tierCardBadgeActive,
                          ]}
                        >
                          {tierItem.badge}
                        </Text>
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.tierCardDesc,
                            isSelected && styles.tierCardDescActive,
                          ]}
                        >
                          {tierItem.desc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Creator Revenue Banner */}
                <View style={styles.revenueBanner}>
                  <DollarSign size={15} color="#164E3F" strokeWidth={2.5} />
                  <Text style={styles.revenueBannerText}>
                    Creator Revenue: 90% goes directly to you / 10% platform operations.
                  </Text>
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
              hasReachedLimit && styles.createBtnLimitReached,
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
  limitWarningCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  limitWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  limitWarningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  limitWarningSub: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
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
  tierSection: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  tierScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 10,
  },
  tierCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  tierCardActive: {
    borderColor: '#164E3F',
    backgroundColor: '#F0FDF4',
  },
  tierCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tierCardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  tierCardPriceActive: {
    color: '#164E3F',
  },
  tierCheckBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierCardBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  tierCardBadgeActive: {
    color: '#164E3F',
  },
  tierCardDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 14,
  },
  tierCardDescActive: {
    color: '#475569',
  },
  revenueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  revenueBannerText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#164E3F',
    flex: 1,
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
  createBtnLimitReached: {
    backgroundColor: '#DC2626',
    opacity: 0.85,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
