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
  Image,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Send,
  FileText,
  CheckCircle2,
  Check,
  CheckCheck,
  Phone,
  Camera,
  Mic,
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
            hasDoi ? styles.doiBubble : isMe ? styles.myBubble : styles.otherBubble,
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

          {/* Timestamp & double checkmarks */}
          <View style={styles.msgFooter}>
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
            {isMe && (
              <CheckCheck size={13} color="#A7F3D0" style={{ marginLeft: 3 }} />
            )}
          </View>
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
          <ArrowLeft size={20} color="#164E3F" />
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
          <View style={styles.avatarPresenceWrapper}>
            <Avatar
              uri={partner?.avatarUrl || undefined}
              name={partner?.fullName || workspace.name || 'Researcher'}
              size="sm"
            />
            <View style={styles.presenceDot} />
          </View>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {partner?.fullName || workspace.name || 'Mike'}
          </Text>
        </TouchableOpacity>

        {/* Call / Phone Icon */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (Platform.OS === 'web') {
              window.alert(`Initiating secure audio consultation with ${partner?.fullName || 'researcher'}...`);
            }
          }}
          style={styles.callButton}
        >
          <Phone size={19} color="#164E3F" />
        </TouchableOpacity>
      </View>

      {/* Date Capsule: Today */}
      <View style={styles.dateCapsuleContainer}>
        <View style={styles.dateCapsule}>
          <Text style={styles.dateCapsuleText}>Today</Text>
        </View>
      </View>

      {/* Messages List */}
      {isMessagesLoading && messages.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color="#164E3F" />
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
                <CheckCircle2 size={13} color="#164E3F" />
                <Text style={styles.mutualFollowText}>Mutual Follow Verified</Text>
              </View>
              <Text style={styles.emptyPrompt}>
                You can now message each other directly and collaborate on research papers.
              </Text>

              {/* Quick Starter Chips */}
              <View style={styles.quickStartersRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setInputText('Hey Mike! What are you up to?')}
                  style={styles.quickStarterChip}
                >
                  <Text style={styles.quickStarterChipText}>👋 Say Hello</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setInputText('Looks awesome! Still on for discussing that project later?')}
                  style={styles.quickStarterChip}
                >
                  <Text style={styles.quickStarterChipText}>🔬 Project Review</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowDoiModal(true)}
                  style={styles.quickStarterChip}
                >
                  <Text style={styles.quickStarterChipText}>📄 Share DOI Paper</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      )}

      {/* Attached DOI Banner Preview */}
      {attachedDoi && (
        <View style={styles.attachedDoiPreview}>
          <View style={{ flex: 1 }}>
            <View style={styles.attachedDoiBadge}>
              <FileText size={11} color="#164E3F" />
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

      {/* Bottom Input Dock with Detached Circular Send Button */}
      <View style={styles.bottomDockContainer}>
        {/* Capsule Input */}
        <View style={styles.inputCapsule}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowDoiModal(true)}
            style={styles.mediaIconBtn}
          >
            <Camera size={19} color="#94A3B8" />
          </TouchableOpacity>

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message..."
            placeholderTextColor="#94A3B8"
            style={styles.textInput}
            multiline
            maxLength={2000}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.alert('Voice memo recording feature is active.');
              }
            }}
            style={styles.mediaIconBtn}
          >
            <Mic size={19} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Detached Circular Green Send Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={(!inputText.trim() && !attachedDoi) || isSending}
          onPress={handleSend}
          style={[
            styles.detachedSendBtn,
            (!inputText.trim() && !attachedDoi) && styles.detachedSendBtnDisabled,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Modal: Attach Paper via DOI */}
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
                <FileText size={18} color="#164E3F" />
                <Text style={styles.modalTitle}>Attach Research Paper</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDoiModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter a DOI (e.g. 10.1038/s41586-021-03819-2) or paste a verified paper link.
            </Text>

            <View style={styles.doiSearchRow}>
              <TextInput
                value={doiQuery}
                onChangeText={setDoiQuery}
                placeholder="Paste DOI (e.g. 10.1038/...)"
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
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 6,
    marginRight: 6,
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPresenceWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  callButton: {
    padding: 6,
  },
  dateCapsuleContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateCapsule: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateCapsuleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: Platform.OS === 'web' ? '70%' : '82%',
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
    paddingVertical: 9,
    borderRadius: 18,
    maxWidth: '100%',
  },
  myBubble: {
    backgroundColor: '#164E3F',
    borderBottomRightRadius: 3,
  },
  otherBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 3,
  },
  doiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 6,
    width: '100%',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  otherMessageText: {
    color: '#111827',
  },
  doiMessageText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#0F172A',
    marginTop: 6,
    paddingHorizontal: 6,
  },
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
  },
  myTimestamp: {
    color: '#A7F3D0',
  },
  otherTimestamp: {
    color: '#6B7280',
  },
  doiTimestamp: {
    fontSize: 10,
    color: '#94A3B8',
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
    color: '#164E3F',
  },
  attachedDoiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#164E3F',
    marginTop: 2,
  },
  removeAttachedBtn: {
    padding: 4,
  },
  bottomDockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  inputCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 44,
  },
  mediaIconBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingHorizontal: 8,
  },
  detachedSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detachedSendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
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
    color: '#164E3F',
  },
  emptyPrompt: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  quickStartersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  quickStarterChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  quickStarterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
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
    backgroundColor: '#164E3F',
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
    backgroundColor: '#164E3F',
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
