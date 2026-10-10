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
  ScrollView,
} from 'react-native';
import {
  X,
  Search,
  Send,
  Check,
  Users,
  MessageSquare,
  Shield,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Post } from '../../types';
import { Workspace, WorkspacePostMetadata } from '../../types/workspace';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { workspaceService } from '../../api/workspaceService';
import { searchBooffInUsers } from '../../api/search/providers/userSearchProvider';

export interface SharePostToWorkspaceModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
}

type TabType = 'all' | 'dms' | 'communities' | 'inner_circles';

interface ShareTargetItem {
  id: string;
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  type: 'dm' | 'community' | 'inner_circle' | 'user';
  rawWorkspace?: Workspace;
  userId?: string;
}

export const SharePostToWorkspaceModal: React.FC<SharePostToWorkspaceModalProps> = ({
  visible,
  onClose,
  post,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const dms = useWorkspaceStore((s) => s.dms);
  const communities = useWorkspaceStore((s) => s.communities);
  const innerCircles = useWorkspaceStore((s) => s.innerCircles);
  const loadWorkspaces = useWorkspaceStore((s) => s.loadWorkspaces);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageNote, setMessageNote] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<ShareTargetItem[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const postDisplayTitle = useMemo(() => {
    return post.article?.title || post.paper?.title || (post.content ? post.content.slice(0, 80) : 'BooffIn Post');
  }, [post]);

  // Load workspaces on modal mount/open if empty
  useEffect(() => {
    if (visible) {
      if (dms.length === 0 && communities.length === 0 && innerCircles.length === 0) {
        loadWorkspaces();
      }
      setErrorBanner(null);
    }
  }, [visible, dms.length, communities.length, innerCircles.length, loadWorkspaces]);

  // Dynamic user search when typing query in DMs or All
  useEffect(() => {
    const clean = searchQuery.trim().replace(/^@/, '');
    if ((activeTab === 'all' || activeTab === 'dms') && clean.length >= 2) {
      let isMounted = true;
      setIsSearchingUsers(true);

      const delayTimer = setTimeout(async () => {
        try {
          const results = await searchBooffInUsers(clean, 6);
          if (isMounted) {
            const mapped: ShareTargetItem[] = results
              .filter((u) => u.id !== currentUser?.id)
              .map((u) => ({
                id: `user_${u.id}`,
                userId: u.id,
                name: u.fullName || u.handle || 'BooffIn Researcher',
                subtitle: u.academicTitle || (u.institution ? `@${u.handle} · ${u.institution}` : `@${u.handle}`),
                avatarUrl: u.avatarUrl,
                type: 'user',
              }));
            setUserSearchResults(mapped);
          }
        } catch {
          if (isMounted) setUserSearchResults([]);
        } finally {
          if (isMounted) setIsSearchingUsers(false);
        }
      }, 250);

      return () => {
        isMounted = false;
        clearTimeout(delayTimer);
      };
    } else {
      setUserSearchResults([]);
      setIsSearchingUsers(false);
    }
  }, [searchQuery, activeTab, currentUser?.id]);

  // Compile combined target list
  const targets = useMemo<ShareTargetItem[]>(() => {
    const list: ShareTargetItem[] = [];
    const q = searchQuery.trim().toLowerCase();

    // 1. Direct Messages
    if (activeTab === 'all' || activeTab === 'dms') {
      (dms || []).forEach((d) => {
        const otherName = d.other_user?.fullName || d.name || 'Direct Message';
        const otherHandle = d.other_user?.handle ? `@${d.other_user.handle}` : 'Direct chat';
        if (!q || otherName.toLowerCase().includes(q) || otherHandle.toLowerCase().includes(q)) {
          list.push({
            id: d.id,
            name: otherName,
            subtitle: otherHandle,
            avatarUrl: d.other_user?.avatarUrl || d.avatar_url,
            type: 'dm',
            rawWorkspace: d,
          });
        }
      });
    }

    // 2. Communities
    if (activeTab === 'all' || activeTab === 'communities') {
      (communities || []).forEach((c) => {
        if (!c.is_disabled && c.status !== 'disabled') {
          if (!q || c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))) {
            list.push({
              id: c.id,
              name: c.name,
              subtitle: c.description || 'Community Space',
              avatarUrl: c.avatar_url,
              type: 'community',
              rawWorkspace: c,
            });
          }
        }
      });
    }

    // 3. Inner Circles
    if (activeTab === 'all' || activeTab === 'inner_circles') {
      (innerCircles || []).forEach((ic) => {
        if (!q || ic.name.toLowerCase().includes(q) || (ic.description && ic.description.toLowerCase().includes(q))) {
          list.push({
            id: ic.id,
            name: ic.name,
            subtitle: ic.description || 'Private Inner Circle',
            avatarUrl: ic.avatar_url,
            type: 'inner_circle',
            rawWorkspace: ic,
          });
        }
      });
    }

    // 4. Append external user search results if in DM or All
    if ((activeTab === 'all' || activeTab === 'dms') && userSearchResults.length > 0) {
      userSearchResults.forEach((u) => {
        // Only append if not already in existing DM list
        const alreadyInList = list.some(
          (item) =>
            item.type === 'dm' &&
            (item.rawWorkspace?.dm_participant_a === u.userId ||
              item.rawWorkspace?.dm_participant_b === u.userId ||
              item.rawWorkspace?.other_user?.id === u.userId)
        );
        if (!alreadyInList) {
          list.push(u);
        }
      });
    }

    return list;
  }, [activeTab, searchQuery, dms, communities, innerCircles, userSearchResults]);

  // Execute Send
  const handleSendToTarget = async (item: ShareTargetItem) => {
    setErrorBanner(null);
    setSendingMap((prev) => ({ ...prev, [item.id]: true }));

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    try {
      let workspaceId = item.type !== 'user' ? item.id : null;

      // If sending to a searched user, check or create DM workspace
      if (item.type === 'user' && item.userId) {
        // Check if an active DM workspace already exists
        const existing = dms.find(
          (d) =>
            d.dm_participant_a === item.userId ||
            d.dm_participant_b === item.userId ||
            d.other_user?.id === item.userId
        );

        if (existing) {
          workspaceId = existing.id;
        } else {
          const dmRes = await workspaceService.getOrCreateDMWorkspace(item.userId);
          if (dmRes.error || !dmRes.workspaceId) {
            setErrorBanner(
              dmRes.error || 'Direct message requires mutual follow between researchers.'
            );
            setSendingMap((prev) => ({ ...prev, [item.id]: false }));
            return;
          }
          workspaceId = dmRes.workspaceId;
        }
      }

      if (!workspaceId) {
        setErrorBanner('Unable to locate target workspace.');
        setSendingMap((prev) => ({ ...prev, [item.id]: false }));
        return;
      }

      // Prepare rich post metadata
      const postSnippet = post.content ? post.content.slice(0, 180) : '';
      const postMeta: WorkspacePostMetadata = {
        id: post.id,
        title: postDisplayTitle,
        author_name: post.author?.fullName || 'BooffIn Researcher',
        author_avatar: post.author?.avatarUrl || null,
        snippet: postSnippet,
        upvotes: post.likesCount || 0,
        tags: post.topics || [],
      };

      const customContent = messageNote.trim()
        ? `${messageNote.trim()}\n\nShared post: "${postDisplayTitle}"`
        : `Shared a post: "${postDisplayTitle}"`;

      const res = await sendMessage({
        workspace_id: workspaceId,
        content: customContent,
        message_type: 'post',
        post_metadata: postMeta,
      });

      if (!res.success) {
        setErrorBanner(res.error || 'Failed to share post to workspace.');
        setSendingMap((prev) => ({ ...prev, [item.id]: false }));
        return;
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      setSentMap((prev) => ({ ...prev, [item.id]: true }));
      setSendingMap((prev) => ({ ...prev, [item.id]: false }));
    } catch (err: any) {
      setErrorBanner(err?.message || 'Error occurred while sharing post.');
      setSendingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleOpenWorkspace = (item: ShareTargetItem) => {
    onClose();
    if (item.rawWorkspace) {
      useWorkspaceStore.getState().loadWorkspaceDetails(item.rawWorkspace.id);
    }
    router.push('/(tabs)/workspace' as any);
  };

  const renderTargetItem = useCallback(
    ({ item }: { item: ShareTargetItem }) => {
      const isSending = Boolean(sendingMap[item.id]);
      const isSent = Boolean(sentMap[item.id]);

      let typeBadge = { label: 'DM', bg: '#EFF6FF', text: '#2563EB' };
      if (item.type === 'community') {
        typeBadge = { label: 'Community', bg: '#ECFDF5', text: '#059669' };
      } else if (item.type === 'inner_circle') {
        typeBadge = { label: 'Inner Circle', bg: '#F5F3FF', text: '#7C3AED' };
      } else if (item.type === 'user') {
        typeBadge = { label: 'Researcher', bg: '#EFF6FF', text: '#2563EB' };
      }

      return (
        <View style={styles.targetRow}>
          <Avatar
            uri={item.avatarUrl || undefined}
            name={item.name}
            size="md"
          />

          <View style={styles.targetInfo}>
            <View style={styles.targetNameRow}>
              <Text style={styles.targetName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={[styles.typeBadge, { backgroundColor: typeBadge.bg }]}>
                <Text style={[styles.typeBadgeText, { color: typeBadge.text }]}>
                  {typeBadge.label}
                </Text>
              </View>
            </View>
            {item.subtitle ? (
              <Text style={styles.targetSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>

          {isSent ? (
            <View style={styles.sentContainer}>
              <View style={styles.sentBadge}>
                <Check size={14} color="#059669" strokeWidth={2.5} />
                <Text style={styles.sentText}>Sent</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleOpenWorkspace(item)}
                style={styles.openLinkBtn}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <ExternalLink size={13} color="#64748B" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSendToTarget(item)}
              disabled={isSending}
              style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Send size={13} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.sendBtnText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [sendingMap, sentMap, messageNote, post, postDisplayTitle]
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

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <View style={styles.headerPillRow}>
                <Sparkles size={13} color="#064E3B" />
                <Text style={styles.headerPillText}>BOOFFIN CHAT SHARE</Text>
              </View>
              <Text style={styles.title}>Share to Workspace</Text>
              <Text style={styles.subtitle}>
                Send directly to DMs, Communities, or Inner Circles
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {errorBanner ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errorBanner}</Text>
            </View>
          ) : null}

          {/* Post Preview Snippet */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
              <Avatar
                uri={post.author?.avatarUrl || undefined}
                name={post.author?.fullName || 'Researcher'}
                size="xs"
              />
              <Text style={styles.previewAuthorName} numberOfLines={1}>
                {post.author?.fullName || 'Researcher'}
              </Text>
              <Text style={styles.previewAuthorHandle} numberOfLines={1}>
                @{post.author?.handle || 'researcher'}
              </Text>
            </View>
            <Text style={styles.previewContent} numberOfLines={2}>
              {postDisplayTitle}
            </Text>
          </View>

          {/* Optional Message Note Input */}
          <View style={styles.noteInputContainer}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add an optional message..."
              placeholderTextColor="#94A3B8"
              value={messageNote}
              onChangeText={setMessageNote}
              maxLength={280}
            />
          </View>

          {/* Tabs Filter Bar (Clean single horizontal line) */}
          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              <TouchableOpacity
                onPress={() => setActiveTab('all')}
                style={[styles.tabPill, activeTab === 'all' && styles.tabPillActive]}
              >
                <Layers size={13} color={activeTab === 'all' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.tabPillText, activeTab === 'all' && styles.tabPillTextActive]}>
                  All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('dms')}
                style={[styles.tabPill, activeTab === 'dms' && styles.tabPillActive]}
              >
                <MessageSquare size={13} color={activeTab === 'dms' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.tabPillText, activeTab === 'dms' && styles.tabPillTextActive]}>
                  DMs {dms.length > 0 ? `(${dms.length})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('communities')}
                style={[styles.tabPill, activeTab === 'communities' && styles.tabPillActive]}
              >
                <Users size={13} color={activeTab === 'communities' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.tabPillText, activeTab === 'communities' && styles.tabPillTextActive]}>
                  Community {communities.length > 0 ? `(${communities.length})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('inner_circles')}
                style={[styles.tabPill, activeTab === 'inner_circles' && styles.tabPillActive]}
              >
                <Shield size={13} color={activeTab === 'inner_circles' ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.tabPillText, activeTab === 'inner_circles' && styles.tabPillTextActive]}>
                  Inner Circle {innerCircles.length > 0 ? `(${innerCircles.length})` : ''}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Search Input Bar */}
          <View style={styles.searchBar}>
            <Search size={15} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search researchers, channels, or circles..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {isSearchingUsers ? (
              <ActivityIndicator size="small" color="#064E3B" style={{ marginRight: 8 }} />
            ) : null}
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={15} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Targets List */}
          <FlatList
            data={targets}
            keyExtractor={(item) => item.id}
            renderItem={renderTargetItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={32} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No matching spaces or researchers' : 'No spaces available yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? `Try searching for another name or handle`
                    : 'Join a community channel or start a DM to share posts.'}
                </Text>
              </View>
            }
          />
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
    maxWidth: 620,
    maxHeight: SCREEN_HEIGHT * 0.88,
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
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: spacing.sm,
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
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    borderRadius: radii.sm,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  previewCard: {
    marginHorizontal: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    padding: spacing.sm + 2,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  previewAuthorName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 160,
  },
  previewAuthorHandle: {
    fontSize: 11.5,
    color: '#64748B',
    flex: 1,
  },
  previewContent: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 17,
  },
  noteInputContainer: {
    marginHorizontal: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    fontSize: 13,
    color: '#0F172A',
  },
  tabsContainer: {
    marginTop: 4,
    marginBottom: 6,
  },
  tabsScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: radii.full,
    backgroundColor: '#F1F5F9',
  },
  tabPillActive: {
    backgroundColor: '#064E3B',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    height: 38,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: spacing.xl,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  targetInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  targetNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  targetName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  targetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: radii.full,
    minWidth: 72,
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  sendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: radii.full,
  },
  sentText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  openLinkBtn: {
    padding: 6,
    borderRadius: radii.full,
    backgroundColor: '#F1F5F9',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
