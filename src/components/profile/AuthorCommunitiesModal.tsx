import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import {
  X,
  Users,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Workspace } from '../../types/workspace';
import { workspaceService } from '../../api/workspaceService';
import { Avatar } from '../core/Avatar';
import { colors, radii, spacing } from '../../theme';

export interface AuthorCommunitiesModalProps {
  visible: boolean;
  onClose: () => void;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  isOwnProfile?: boolean;
}

export const AuthorCommunitiesModal: React.FC<AuthorCommunitiesModalProps> = ({
  visible,
  onClose,
  authorId,
  authorName,
  authorAvatarUrl,
  isOwnProfile,
}) => {
  const [communities, setCommunities] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const firstName = (authorName || 'Researcher').split(' ')[0];

  useEffect(() => {
    if (!visible || !authorId) return;

    let isMounted = true;

    // 1. Seed instantly from store if available
    const storeComms = useWorkspaceStore.getState().communities.filter(
      (c) =>
        (c.owner_id === authorId || c.creator_id === authorId) &&
        c.type === 'community' &&
        !c.is_disabled &&
        c.status !== 'disabled'
    );
    if (storeComms.length > 0) {
      setCommunities(storeComms.slice(0, 3));
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // 2. Query Supabase for author's communities (up to 3)
    (async () => {
      try {
        const res = await workspaceService.getUserCreatedCommunities(authorId);
        if (isMounted && res.communities && res.communities.length > 0) {
          setCommunities(res.communities.slice(0, 3));
        } else if (isMounted && storeComms.length === 0) {
          setCommunities(res.communities || []);
        }
      } catch {
        if (isMounted && storeComms.length === 0) {
          setCommunities([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, authorId]);

  const handleViewCommunity = (community: Workspace) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    onClose();
    // Navigate straight to the community workspace screen
    router.push(`/workspace/${community.id}` as any);
  };

  const handleCreateCommunity = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onClose();
    router.push('/(tabs)/workspace' as any);
  };

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

      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerPillRow}>
                <Sparkles size={13} color="#064E3B" />
                <Text style={styles.headerPillText}>COMMUNITY SHOWCASE</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {isOwnProfile ? 'Your Communities' : `${firstName}'s Communities`}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {isOwnProfile
                  ? 'Communities created and managed by you'
                  : `Explore and join research communities by ${authorName}`}
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

          {/* Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#064E3B" />
              <Text style={styles.loadingText}>Loading communities...</Text>
            </View>
          ) : communities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Users size={32} color="#64748B" />
              </View>
              <Text style={styles.emptyTitle}>
                {isOwnProfile ? 'No communities created yet' : `No communities yet`}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isOwnProfile
                  ? 'Create an open research community to collaborate, host live sessions, and discuss papers with peers.'
                  : `${firstName} has not created any public communities yet.`}
              </Text>

              {isOwnProfile && (
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={handleCreateCommunity}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.createBtnText}>Create a Community</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={communities.slice(0, 3)}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const memberCount = item.members_count || 1;

                return (
                  <View style={styles.communityCard}>
                    <Avatar
                      uri={item.avatar_url || undefined}
                      name={item.name}
                      size="md"
                    />

                    <View style={styles.communityInfo}>
                      <View style={styles.communityTitleRow}>
                        <Text style={styles.communityName} numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>

                      {item.description ? (
                        <Text style={styles.communityDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : (
                        <Text style={styles.communityDesc} numberOfLines={1}>
                          Open scientific community for research discussion
                        </Text>
                      )}

                      <View style={styles.memberBadgeRow}>
                        <Users size={12} color="#059669" />
                        <Text style={styles.memberBadgeText}>
                          {memberCount} member{memberCount === 1 ? '' : 's'}
                        </Text>
                      </View>
                    </View>

                    {/* Dark Green View Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleViewCommunity(item)}
                      style={styles.viewBtn}
                    >
                      <Text style={styles.viewBtnText}>View</Text>
                      <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 620,
    maxHeight: SCREEN_HEIGHT * 0.75,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii.xl || 24,
    borderTopRightRadius: radii.xl || 24,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
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
    fontSize: 10,
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
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 12,
  },
  communityInfo: {
    flex: 1,
  },
  communityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  communityName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  communityDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  memberBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  memberBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#059669',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  viewBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
