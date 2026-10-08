import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Send,
  FileText,
  CheckCircle2,
  Lock,
  Search,
  X,
  Sparkles,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { Workspace, WorkspaceMessage, DoiMetadata } from '../../types/workspace';
import { WorkspaceDoiCard } from './WorkspaceDoiCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { resolvePaper } from '../../api/paperResolver';

import { supabase } from '../../api/client';
import { fetchUserProfile } from '../../api/authService';

interface WorkspaceDMViewProps {
  workspace: Workspace;
}

export const WorkspaceDMView: React.FC<WorkspaceDMViewProps> = ({ workspace }) => {
  const currentUser = useAuthStore((s) => s.user);
  const messages = useWorkspaceStore((s) => s.messages);
  const isMessagesLoading = useWorkspaceStore((s) => s.isMessagesLoading);
  const isSending = useWorkspaceStore((s) => s.isSending);
  const loadMessages = useWorkspaceStore((s) => s.loadMessages);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const subscribeToWorkspaceMessages = useWorkspaceStore((s) => s.subscribeToWorkspaceMessages);

  const [localPartner, setLocalPartner] = useState<any>(workspace.other_user || null);
  const [inputText, setInputText] = useState('');
  const [showDoiModal, setShowDoiModal] = useState(false);
  const [doiQuery, setDoiQuery] = useState('');
  const [isResolvingDoi, setIsResolvingDoi] = useState(false);
  const [resolvedDoi, setResolvedDoi] = useState<DoiMetadata | null>(null);
  const [attachedDoi, setAttachedDoi] = useState<DoiMetadata | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages(workspace.id);
    const unsubscribe = subscribeToWorkspaceMessages(workspace.id);
    return () => {
      unsubscribe();
    };
  }, [workspace.id]);

  useEffect(() => {
    if (workspace.other_user) {
      setLocalPartner(workspace.other_user);
      return;
    }

    async function resolvePartner() {
      let otherId =
        workspace.dm_participant_a === currentUser?.id
          ? workspace.dm_participant_b
          : workspace.dm_participant_a;

      if (!otherId && currentUser?.id) {
        const { data: mem } = await supabase
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspace.id)
          .neq('user_id', currentUser.id)
          .maybeSingle();
        if (mem) otherId = mem.user_id;
      }

      if (otherId) {
        const p = await fetchUserProfile(otherId);
        if (p) {
          setLocalPartner({
            id: p.id,
            fullName: p.fullName || p.handle || 'Researcher',
            handle: p.handle,
            avatarUrl: p.avatarUrl || null,
            academicTitle: p.academicTitle,
            institution: p.institution,
            orcidVerified: p.orcidVerified,
          });
        }
      }
    }

    resolvePartner();
  }, [workspace.id, workspace.other_user, workspace.dm_participant_a, workspace.dm_participant_b, currentUser?.id]);

  const partner = localPartner || workspace.other_user;

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !attachedDoi) return;

    const res = await sendMessage({
      workspace_id: workspace.id,
      content: trimmed || (attachedDoi ? `Shared paper: ${attachedDoi.title}` : ''),
      message_type: attachedDoi ? 'paper_doi' : 'text',
      doi_metadata: attachedDoi,
    });

    if (res.success) {
      setInputText('');
      setAttachedDoi(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      const err = res.error || 'Failed to send message';
      console.error('[WorkspaceDMView] Send failed:', err);
      if (Platform.OS === 'web') {
        window.alert(err);
      }
    }
  };

  const handleResolveDoi = async () => {
    if (!doiQuery.trim()) return;
    setIsResolvingDoi(true);
    setResolvedDoi(null);
    try {
      const paper = await resolvePaper(doiQuery.trim());
      if (paper) {
        setResolvedDoi({
          doi: paper.doi || doiQuery.trim(),
          title: paper.title,
          authors: (paper.authors || []).map((a) => ({ name: a.name, orcid: a.orcid })),
          publicationYear: paper.publicationYear,
          journal: paper.journal,
          url: paper.openAccessUrl || paper.canonicalUrl,
          citationCount: paper.citationCount,
        });
      }
    } catch {
      // Ignored
    } finally {
      setIsResolvingDoi(false);
    }
  };

  const handleAttachResolvedDoi = () => {
    if (resolvedDoi) {
      setAttachedDoi(resolvedDoi);
      setShowDoiModal(false);
      setDoiQuery('');
      setResolvedDoi(null);
    }
  };

  const renderMessageItem = ({ item }: { item: WorkspaceMessage }) => {
    const isMe = item.sender_id === currentUser?.id;
    const hasDoi = Boolean(item.doi_metadata);

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.myMessageRow : styles.otherMessageRow,
          hasDoi && styles.doiMessageRow,
        ]}
      >
        {!isMe && (
          <Avatar
            uri={item.sender?.avatarUrl || partner?.avatarUrl || undefined}
            name={item.sender?.fullName || partner?.fullName || 'Researcher'}
            size="sm"
            style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 }}
          />
        )}

        <View
          style={[
            styles.messageBubble,
            hasDoi ? styles.doiBubble : (isMe ? styles.myBubble : styles.otherBubble),
          ]}
        >
          {/* DOI Paper Attachment */}
          {item.doi_metadata && (
            <WorkspaceDoiCard doiMeta={item.doi_metadata} />
          )}

          {/* Text Content */}
          {item.content && (!hasDoi || !item.content.startsWith('Shared paper:')) ? (
            <Text
              style={[
                styles.messageText,
                hasDoi
                  ? styles.doiMessageText
                  : isMe
                  ? styles.myMessageText
                  : styles.otherMessageText,
              ]}
            >
              {item.content}
            </Text>
          ) : null}

          {/* Timestamp */}
          <Text
            style={[
              styles.timestamp,
              hasDoi
                ? styles.doiTimestamp
                : isMe
                ? styles.myTimestamp
                : styles.otherTimestamp,
            ]}
          >
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (partner?.id) {
              router.push(`/profile/${partner.id}`);
            }
          }}
          style={styles.headerProfile}
        >
          <Avatar
            uri={partner?.avatarUrl || undefined}
            name={partner?.fullName || workspace.name || 'Researcher'}
            size="sm"
          />
          <View style={{ marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {partner?.fullName || workspace.name || 'Researcher'}
              </Text>
              {partner?.orcidVerified && (
                <CheckCircle2 size={13} color={colors.accentGreen} style={{ marginLeft: 4 }} />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Lock size={10} color="#064E3B" />
              <Text style={styles.headerSubtitle}>Mutual Follow DM</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      {isMessagesLoading && messages.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#064E3B" />
          <Text style={styles.loaderText}>Loading conversation...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Avatar
                uri={partner?.avatarUrl || undefined}
                name={partner?.fullName || 'Researcher'}
                size="lg"
              />
              <Text style={styles.emptyTitle}>
                {partner?.fullName || 'Researcher'}
              </Text>
              <Text style={styles.emptyBio}>
                {partner?.academicTitle || 'Academic Researcher'}
                {partner?.institution ? ` · ${partner.institution}` : ''}
              </Text>
              <View style={styles.mutualFollowBadge}>
                <CheckCircle2 size={13} color="#064E3B" />
                <Text style={styles.mutualFollowText}>Mutual Follow Verified</Text>
              </View>
              <Text style={styles.emptyPrompt}>
                You can now message each other directly and collaborate on research papers.
              </Text>
            </View>
          }
        />
      )}

      {/* Attached DOI Banner Preview */}
      {attachedDoi && (
        <View style={styles.attachedDoiPreview}>
          <View style={{ flex: 1 }}>
            <View style={styles.attachedDoiBadge}>
              <FileText size={11} color="#064E3B" />
              <Text style={styles.attachedDoiBadgeText}>ATTACHED PAPER</Text>
            </View>
            <Text style={styles.attachedDoiTitle} numberOfLines={1}>
              {attachedDoi.title}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setAttachedDoi(null)} style={styles.removeAttachedBtn}>
            <X size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        {/* Attach DOI Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowDoiModal(true)}
          style={[styles.doiAttachBtn, attachedDoi && styles.doiAttachBtnActive]}
          accessibilityLabel="Attach Research Paper DOI"
        >
          <FileText size={18} color={attachedDoi ? '#064E3B' : '#64748B'} />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a research note or message..."
          placeholderTextColor="#94A3B8"
          style={styles.textInput}
          multiline
          maxLength={2000}
        />

        {/* Send Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={(!inputText.trim() && !attachedDoi) || isSending}
          onPress={handleSend}
          style={[
            styles.sendBtn,
            (!inputText.trim() && !attachedDoi) && styles.sendBtnDisabled,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Modal: Attach Paper via DOI / Title */}
      <Modal
        visible={showDoiModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDoiModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileText size={18} color="#064E3B" />
                <Text style={styles.modalTitle}>Attach Research Paper</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDoiModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter a DOI (e.g. 10.1038/s41586-021-03819-2) or paste a paper URL from Nature, Science, arXiv, bioRxiv, or PubMed.
            </Text>

            <View style={styles.doiSearchRow}>
              <TextInput
                value={doiQuery}
                onChangeText={setDoiQuery}
                placeholder="Paste DOI or paper URL..."
                placeholderTextColor="#94A3B8"
                style={styles.doiInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={handleResolveDoi}
                disabled={!doiQuery.trim() || isResolvingDoi}
                style={[styles.doiLookupBtn, !doiQuery.trim() && styles.doiLookupBtnDisabled]}
              >
                {isResolvingDoi ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Search size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {resolvedDoi && (
              <View style={{ marginTop: spacing.md }}>
                <WorkspaceDoiCard doiMeta={resolvedDoi} />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleAttachResolvedDoi}
                  style={styles.confirmAttachBtn}
                >
                  <Sparkles size={16} color="#FFFFFF" />
                  <Text style={styles.confirmAttachBtnText}>Attach to Message</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#064E3B',
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 13,
    color: '#64748B',
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptyBio: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  mutualFollowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 10,
  },
  mutualFollowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#064E3B',
  },
  emptyPrompt: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    maxWidth: Platform.OS === 'web' ? '75%' : '88%',
  },
  doiMessageRow: {
    maxWidth: Platform.OS === 'web' ? 540 : '95%',
    width: '100%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '100%',
  },
  myBubble: {
    backgroundColor: '#064E3B',
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 2,
  },
  doiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 6,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#0F172A',
  },
  doiMessageText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#0F172A',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#94A3B8',
  },
  doiTimestamp: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    alignSelf: 'flex-end',
    paddingHorizontal: 6,
  },
  attachedDoiPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  attachedDoiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attachedDoiBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#064E3B',
  },
  attachedDoiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#064E3B',
    marginTop: 2,
  },
  removeAttachedBtn: {
    padding: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  doiAttachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doiAttachBtnActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  textInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: '#F8FAFC',
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  doiSearchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  doiInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  doiLookupBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doiLookupBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  confirmAttachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#064E3B',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  confirmAttachBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
