import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Mic,
  Video,
  Settings,
  Shield,
  Plus,
  Send,
  Calendar,
  ExternalLink,
  DollarSign,
  AlertTriangle,
  X,
  Sparkles,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { Workspace, WorkspaceMessage, WorkspaceEvent, WorkspaceBlock, DoiMetadata } from '../../types/workspace';
import { WorkspaceDoiCard } from './WorkspaceDoiCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { resolvePaper } from '../../api/paperResolver';

export type CommunityTab = 'papers' | 'discussions' | 'podcasts' | 'live_sessions' | 'settings';

interface WorkspaceCommunityViewProps {
  workspace: Workspace;
}

export const WorkspaceCommunityView: React.FC<WorkspaceCommunityViewProps> = ({ workspace }) => {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<CommunityTab>('papers');

  const messages = useWorkspaceStore((s) => s.messages);
  const events = useWorkspaceStore((s) => s.events);
  const blocks = useWorkspaceStore((s) => s.blocks);
  const isMessagesLoading = useWorkspaceStore((s) => s.isMessagesLoading);
  const isSending = useWorkspaceStore((s) => s.isSending);

  const loadMessages = useWorkspaceStore((s) => s.loadMessages);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const loadEvents = useWorkspaceStore((s) => s.loadEvents);
  const createEvent = useWorkspaceStore((s) => s.createEvent);
  const loadBlocks = useWorkspaceStore((s) => s.loadBlocks);
  const blockMember = useWorkspaceStore((s) => s.blockMember);
  const subscribeToWorkspaceMessages = useWorkspaceStore((s) => s.subscribeToWorkspaceMessages);

  // Chat input
  const [inputText, setInputText] = useState('');
  const [showDoiModal, setShowDoiModal] = useState(false);
  const [doiQuery, setDoiQuery] = useState('');
  const [isResolvingDoi, setIsResolvingDoi] = useState(false);
  const [resolvedDoi, setResolvedDoi] = useState<DoiMetadata | null>(null);
  const [attachedDoi, setAttachedDoi] = useState<DoiMetadata | null>(null);

  // New Event Modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  // Transparent Moderation Block Modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockTargetUserId, setBlockTargetUserId] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const isOwnerOrMod = workspace.my_role === 'owner' || workspace.my_role === 'admin' || workspace.my_role === 'moderator';

  useEffect(() => {
    loadMessages(workspace.id);
    loadEvents(workspace.id);
    loadBlocks(workspace.id);

    const unsubscribe = subscribeToWorkspaceMessages(workspace.id);
    return () => {
      unsubscribe();
    };
  }, [workspace.id]);

  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !attachedDoi) return;
    const res = await sendMessage({
      workspace_id: workspace.id,
      content: trimmed || (attachedDoi ? `Shared research paper: ${attachedDoi.title}` : ''),
      message_type: attachedDoi ? 'paper_doi' : 'text',
      doi_metadata: attachedDoi || undefined,
    });
    if (res.success) {
      setInputText('');
      setAttachedDoi(null);
    }
  };

  const handleSharePaperDoi = async () => {
    if (!resolvedDoi) return;
    const res = await sendMessage({
      workspace_id: workspace.id,
      content: `Published Research Paper: ${resolvedDoi.title}`,
      message_type: 'paper_doi',
      doi_metadata: resolvedDoi,
    });
    if (res.success) {
      setShowDoiModal(false);
      setDoiQuery('');
      setResolvedDoi(null);
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
    } catch {}
    setIsResolvingDoi(false);
  };

  const handleCreateLiveSession = async () => {
    if (!eventTitle.trim()) return;
    await createEvent({
      workspaceId: workspace.id,
      title: eventTitle.trim(),
      eventType: 'live_session',
      startTime: `${eventDate}T18:00:00Z`,
      meetingLink: eventLink.trim() || undefined,
    });
    setShowEventModal(false);
    setEventTitle('');
    setEventLink('');
  };

  const handleExecuteBlock = async () => {
    if (!blockTargetUserId.trim() || blockReason.trim().length < 5) return;
    await blockMember({
      workspaceId: workspace.id,
      targetUserId: blockTargetUserId.trim(),
      reason: blockReason.trim(),
    });
    setShowBlockModal(false);
    setBlockTargetUserId('');
    setBlockReason('');
  };

  // Filter paper messages for the Papers Tab
  const paperMessages = messages.filter((m) => m.message_type === 'paper_doi' && m.doi_metadata);

  return (
    <View style={styles.container}>
      {/* Community Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {workspace.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.headerSubtitle}>
              {workspace.members_count || 1} members ·{' '}
              {workspace.subscription_price_inr > 0 ? `₹${workspace.subscription_price_inr}/mo` : 'Free Community'}
            </Text>
          </View>
        </View>

        {isOwnerOrMod && (
          <TouchableOpacity
            onPress={() => setActiveTab('settings')}
            style={styles.settingsHeaderBtn}
          >
            <Settings size={18} color="#475569" />
          </TouchableOpacity>
        )}
      </View>

      {/* 5-Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('papers')}
          style={[styles.tabBtn, activeTab === 'papers' && styles.tabBtnActive]}
        >
          <FileText size={15} color={activeTab === 'papers' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'papers' && styles.tabTextActive]}>
            Papers ({paperMessages.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('discussions')}
          style={[styles.tabBtn, activeTab === 'discussions' && styles.tabBtnActive]}
        >
          <MessageSquare size={15} color={activeTab === 'discussions' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'discussions' && styles.tabTextActive]}>
            Discussions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('podcasts')}
          style={[styles.tabBtn, activeTab === 'podcasts' && styles.tabBtnActive]}
        >
          <Mic size={15} color={activeTab === 'podcasts' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'podcasts' && styles.tabTextActive]}>
            Podcasts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('live_sessions')}
          style={[styles.tabBtn, activeTab === 'live_sessions' && styles.tabBtnActive]}
        >
          <Video size={15} color={activeTab === 'live_sessions' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'live_sessions' && styles.tabTextActive]}>
            Live ({events.filter((e) => e.event_type === 'live_session').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('settings')}
          style={[styles.tabBtn, activeTab === 'settings' && styles.tabBtnActive]}
        >
          <Shield size={15} color={activeTab === 'settings' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
            Rules & Mod
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Papers Feed */}
      {activeTab === 'papers' && (
        <View style={{ flex: 1 }}>
          <View style={styles.tabActionBar}>
            <Text style={styles.tabActionTitle}>Repository of Research Papers</Text>
            <TouchableOpacity
              onPress={() => setShowDoiModal(true)}
              style={styles.addPaperBtn}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.addPaperBtnText}>Share DOI Paper</Text>
            </TouchableOpacity>
          </View>

          {paperMessages.length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <FileText size={40} color="#94A3B8" />
              <Text style={styles.tabEmptyTitle}>No papers shared yet</Text>
              <Text style={styles.tabEmptySub}>
                Share foundational papers, preprints, and DOI links to build your community research library.
              </Text>
              <TouchableOpacity
                onPress={() => setShowDoiModal(true)}
                style={styles.tabEmptyBtn}
              >
                <Plus size={15} color="#FFFFFF" />
                <Text style={styles.tabEmptyBtnText}>Add First Paper</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={paperMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: spacing.md }}
              renderItem={({ item }) => (
                <View style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Avatar
                      uri={item.sender?.avatarUrl || undefined}
                      name={item.sender?.fullName || 'Researcher'}
                      size="xs"
                    />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#334155', marginLeft: 6 }}>
                      {item.sender?.fullName || 'Community Member'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94A3B8', marginLeft: 6 }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <WorkspaceDoiCard doiMeta={item.doi_metadata!} />
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Tab 2: Discussions (Realtime Stream) */}
      {activeTab === 'discussions' && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            renderItem={({ item }) => {
              const isMe = item.sender_id === currentUser?.id;
              return (
                <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                  {!isMe && (
                    <Avatar
                      uri={item.sender?.avatarUrl || undefined}
                      name={item.sender?.fullName || 'Researcher'}
                      size="sm"
                      style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 }}
                    />
                  )}
                  <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
                    {!isMe && (
                      <Text style={styles.senderName}>{item.sender?.fullName || 'Researcher'}</Text>
                    )}
                    {item.doi_metadata && <WorkspaceDoiCard doiMeta={item.doi_metadata} />}
                    {item.content ? (
                      <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                        {item.content}
                      </Text>
                    ) : null}
                    <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          {/* Attached DOI banner */}
          {attachedDoi && (
            <View style={styles.attachedDoiPreview}>
              <FileText size={14} color="#064E3B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.attachedDoiTitle} numberOfLines={1}>
                  {attachedDoi.title}
                </Text>
                <Text style={styles.attachedDoiSub}>DOI: {attachedDoi.doi}</Text>
              </View>
              <TouchableOpacity onPress={() => setAttachedDoi(null)}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputBar}>
            <TouchableOpacity
              onPress={() => setShowDoiModal(true)}
              style={styles.doiAttachIconBtn}
            >
              <FileText size={18} color="#064E3B" />
            </TouchableOpacity>

            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Join the research discussion..."
              placeholderTextColor="#94A3B8"
              style={styles.textInput}
            />
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={(!inputText.trim() && !attachedDoi) || isSending}
              style={[styles.sendBtn, (!inputText.trim() && !attachedDoi) && styles.sendBtnDisabled]}
            >
              {isSending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Send size={16} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tab 3: Podcasts */}
      {activeTab === 'podcasts' && (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <View style={styles.podcastPlaceholderCard}>
            <Mic size={36} color="#064E3B" />
            <Text style={styles.podcastTitle}>Community Audio & Paper Podcasts</Text>
            <Text style={styles.podcastSub}>
              Host live audio sessions or upload audio summaries of complex research papers.
            </Text>
            <View style={styles.podcastFeatureGrid}>
              <View style={styles.featureItem}>
                <Text style={styles.featureTitle}>🎧 Paper Walkthroughs</Text>
                <Text style={styles.featureDesc}>10-minute author breakdowns of key methodologies.</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureTitle}>🎙️ Researcher Q&A</Text>
                <Text style={styles.featureDesc}>Interactive discussions with visiting professors.</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Tab 4: Live Sessions */}
      {activeTab === 'live_sessions' && (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <View style={styles.tabActionBar}>
            <Text style={styles.tabActionTitle}>Live Research Sessions</Text>
            {isOwnerOrMod && (
              <TouchableOpacity
                onPress={() => setShowEventModal(true)}
                style={styles.addPaperBtn}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.addPaperBtnText}>Schedule Session</Text>
              </TouchableOpacity>
            )}
          </View>

          {events.filter((e) => e.event_type === 'live_session').length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <Video size={40} color="#94A3B8" />
              <Text style={styles.tabEmptyTitle}>No upcoming live sessions</Text>
              <Text style={styles.tabEmptySub}>
                Schedule journal clubs, group paper reviews, or live experiment streaming.
              </Text>
            </View>
          ) : (
            events
              .filter((e) => e.event_type === 'live_session')
              .map((ev) => (
                <View key={ev.id} style={styles.eventCard}>
                  <View style={styles.eventCardHeader}>
                    <View style={styles.liveTag}>
                      <Video size={12} color="#064E3B" />
                      <Text style={styles.liveTagText}>LIVE SESSION</Text>
                    </View>
                    <Text style={styles.eventDate}>
                      {new Date(ev.start_time).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  {ev.description && <Text style={styles.eventDesc}>{ev.description}</Text>}
                  {ev.meeting_link && (
                    <TouchableOpacity
                      onPress={() => {
                        if (ev.meeting_link) {
                          if (Platform.OS === 'web') {
                            window.open(ev.meeting_link, '_blank');
                          }
                        }
                      }}
                      style={styles.joinMeetingBtn}
                    >
                      <Text style={styles.joinMeetingBtnText}>Join Meeting</Text>
                      <ExternalLink size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
          )}
        </ScrollView>
      )}

      {/* Tab 5: Settings & Transparent Moderation */}
      {activeTab === 'settings' && (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          {/* Creator Revenue Split Card */}
          <View style={styles.revenueCard}>
            <DollarSign size={24} color="#064E3B" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.revenueTitle}>Creator Revenue Share</Text>
              <Text style={styles.revenueDesc}>
                {workspace.subscription_price_inr > 0
                  ? `Active Tier: ₹${workspace.subscription_price_inr}/month · 90% Creator / 10% Platform ledger split.`
                  : 'Free Access Community (No fee required).'}
              </Text>
            </View>
          </View>

          {/* Transparent Moderation Log */}
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Shield size={18} color="#064E3B" />
              <Text style={styles.sectionHeading}>Transparent Moderation Log</Text>
            </View>
            {isOwnerOrMod && (
              <TouchableOpacity
                onPress={() => setShowBlockModal(true)}
                style={styles.blockActionBtn}
              >
                <Text style={styles.blockActionBtnText}>Moderate Member</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.sectionHelpText}>
            All moderation actions and member bans require a mandatory stated reason visible to all community members to ensure open science integrity.
          </Text>

          {blocks.length === 0 ? (
            <View style={styles.emptyBlocksBox}>
              <Text style={styles.emptyBlocksText}>No moderation bans on record.</Text>
            </View>
          ) : (
            blocks.map((b) => (
              <View key={b.id} style={styles.blockLogCard}>
                <View style={styles.blockLogHeader}>
                  <Text style={styles.blockedUserName}>
                    {b.blocked_user?.fullName || `@${b.blocked_user?.handle || 'user'}`}
                  </Text>
                  <Text style={styles.blockedDate}>
                    {new Date(b.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.blockReasonContent}>
                  Reason: "{b.reason}"
                </Text>
                <Text style={styles.moderatorTag}>
                  Moderated by {b.moderator?.fullName || 'Community Moderator'}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal: Share Paper via DOI */}
      <Modal visible={showDoiModal} transparent animationType="fade" onRequestClose={() => setShowDoiModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Research Paper</Text>
              <TouchableOpacity onPress={() => setShowDoiModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Enter paper DOI or URL to fetch and attach verified metadata.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TextInput
                value={doiQuery}
                onChangeText={setDoiQuery}
                placeholder="10.1038/s41586-..."
                placeholderTextColor="#94A3B8"
                style={styles.doiInput}
              />
              <TouchableOpacity
                onPress={handleResolveDoi}
                style={styles.doiLookupBtn}
              >
                {isResolvingDoi ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Sparkles size={16} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
            {resolvedDoi && (
              <View>
                <WorkspaceDoiCard doiMeta={resolvedDoi} />
                <TouchableOpacity onPress={handleSharePaperDoi} style={styles.confirmAttachBtn}>
                  <Text style={styles.confirmAttachBtnText}>Post Paper to Community</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Schedule Live Session */}
      <Modal visible={showEventModal} transparent animationType="fade" onRequestClose={() => setShowEventModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Live Research Session</Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Session Topic (e.g. CRISPR Gene Therapy Review)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={eventLink}
              onChangeText={setEventLink}
              placeholder="Meeting URL (Google Meet / Zoom / Jitsi)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 14 }]}
            />
            <TouchableOpacity onPress={handleCreateLiveSession} style={styles.confirmAttachBtn}>
              <Text style={styles.confirmAttachBtnText}>Schedule Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Transparent Moderation Block */}
      <Modal visible={showBlockModal} transparent animationType="fade" onRequestClose={() => setShowBlockModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Moderate & Block Member</Text>
              <TouchableOpacity onPress={() => setShowBlockModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Transparent moderation requires a mandatory reason that will be permanently logged.
            </Text>
            <TextInput
              value={blockTargetUserId}
              onChangeText={setBlockTargetUserId}
              placeholder="User ID or handle to remove"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={blockReason}
              onChangeText={setBlockReason}
              placeholder="Mandatory violation reason (min 5 chars)..."
              placeholderTextColor="#94A3B8"
              multiline
              style={[styles.doiInput, { height: 80, marginBottom: 14 }]}
            />
            <TouchableOpacity
              onPress={handleExecuteBlock}
              disabled={blockReason.trim().length < 5}
              style={[styles.confirmAttachBtn, { backgroundColor: '#DC2626' }]}
            >
              <Text style={styles.confirmAttachBtnText}>Enforce Block & Publish Reason</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, color: '#64748B' },
  settingsHeaderBtn: { padding: 8 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#064E3B',
    backgroundColor: '#FFFFFF',
  },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#064E3B', fontWeight: '700' },
  tabActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabActionTitle: { fontSize: 13, fontWeight: '600', color: '#334155' },
  addPaperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addPaperBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  tabEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  tabEmptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 12 },
  tabEmptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, maxWidth: 320 },
  tabEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  tabEmptyBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  messagesList: { padding: spacing.md, flexGrow: 1, justifyContent: 'flex-end' },
  messageRow: { flexDirection: 'row', marginBottom: spacing.sm, maxWidth: '85%' },
  myMessageRow: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  otherMessageRow: { alignSelf: 'flex-start', justifyContent: 'flex-start' },
  messageBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  myBubble: { backgroundColor: '#064E3B', borderBottomRightRadius: 2 },
  otherBubble: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 2 },
  senderName: { fontSize: 11, fontWeight: '700', color: '#064E3B', marginBottom: 2 },
  messageText: { fontSize: 14, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  otherMessageText: { color: '#0F172A' },
  timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myTimestamp: { color: 'rgba(255, 255, 255, 0.7)' },
  otherTimestamp: { color: '#94A3B8' },
  attachedDoiPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
    gap: 8,
  },
  attachedDoiTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  attachedDoiSub: {
    fontSize: 10,
    color: '#047857',
  },
  doiAttachIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
  textInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 19,
    paddingHorizontal: 14,
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
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
  podcastPlaceholderCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  podcastTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginTop: 12 },
  podcastSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4, maxWidth: 360 },
  podcastFeatureGrid: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  featureItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  featureDesc: { fontSize: 11, color: '#64748B', lineHeight: 16 },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  eventCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveTagText: { fontSize: 10, fontWeight: '700', color: '#064E3B' },
  eventDate: { fontSize: 11, color: '#64748B' },
  eventTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  eventDesc: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  joinMeetingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    paddingVertical: 6,
    borderRadius: 6,
  },
  joinMeetingBtnText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  revenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  revenueTitle: { fontSize: 14, fontWeight: '700', color: '#064E3B' },
  revenueDesc: { fontSize: 12, color: '#047857', marginTop: 2 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionHeading: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  sectionHelpText: { fontSize: 12, color: '#64748B', marginBottom: 12, lineHeight: 16 },
  blockActionBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blockActionBtnText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  emptyBlocksBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  emptyBlocksText: { fontSize: 12, color: '#94A3B8' },
  blockLogCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  blockLogHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  blockedUserName: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  blockedDate: { fontSize: 11, color: '#94A3B8' },
  blockReasonContent: { fontSize: 13, color: '#334155', fontStyle: 'italic', marginBottom: 4 },
  moderatorTag: { fontSize: 11, color: '#64748B' },
  blockedNoticeCard: {
    margin: 24,
    padding: 24,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    alignItems: 'center',
  },
  blockedTitle: { fontSize: 18, fontWeight: '700', color: '#991B1B', marginTop: 12 },
  blockedSubtitle: { fontSize: 13, color: '#7F1D1D', textAlign: 'center', marginTop: 4 },
  blockedReasonBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  blockedReasonLabel: { fontSize: 11, fontWeight: '700', color: '#991B1B', marginBottom: 2 },
  blockedReasonText: { fontSize: 13, color: '#374151', fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 480, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  modalSubtitle: { fontSize: 12, color: '#64748B', marginBottom: 14 },
  doiInput: {
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  doiLookupBtn: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#064E3B', alignItems: 'center', justifyContent: 'center' },
  confirmAttachBtn: {
    backgroundColor: '#064E3B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmAttachBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
