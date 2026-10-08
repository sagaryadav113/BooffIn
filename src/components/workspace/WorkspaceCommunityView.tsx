import React, { useState, useEffect, useRef } from 'react';
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
  Linking,
  Image,
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
  Info,
  Play,
  Camera,
  Radio,
  Clock,
  Bookmark,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { Workspace, WorkspaceMessage, WorkspaceEvent, WorkspaceBlock, DoiMetadata } from '../../types/workspace';
import { WorkspaceDoiCard } from './WorkspaceDoiCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { resolvePaper } from '../../api/paperResolver';

export type CommunityTab = 'papers' | 'discussion' | 'podcasts' | 'live_sessions';

interface WorkspaceCommunityViewProps {
  workspace: Workspace;
}

export const WorkspaceCommunityView: React.FC<WorkspaceCommunityViewProps> = ({ workspace }) => {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<CommunityTab>('discussion');

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

  // Info modal & New Event modal
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  const flatListRef = useRef<FlatList>(null);

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
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
      startTime: `${eventDate}T19:00:00Z`,
      meetingLink: eventLink.trim() || undefined,
    });
    setShowEventModal(false);
    setEventTitle('');
    setEventLink('');
  };

  const paperMessages = messages.filter((m) => m.message_type === 'paper_doi' && m.doi_metadata);

  return (
    <View style={styles.container}>
      {/* Community Header matching reference */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#164E3F" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Avatar
            uri={workspace.avatar_url || undefined}
            name={workspace.name}
            size="sm"
          />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {workspace.name} 🌱
            </Text>
            <Text style={styles.headerTelemetry}>
              {workspace.members_count || '10k'} members • 324 online
            </Text>
          </View>
        </View>

        {/* Right Actions: Info & Settings */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={() => setShowInfoModal(true)}
            style={styles.headerIconBtn}
          >
            <Info size={19} color="#164E3F" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowInfoModal(true)}
            style={styles.headerIconBtn}
          >
            <Settings size={19} color="#164E3F" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontally Scrolling Segment Pill Strip */}
      <View style={styles.segmentStripContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentStrip}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('papers')}
            style={[styles.segmentPill, activeTab === 'papers' && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentPillText, activeTab === 'papers' && styles.segmentPillTextActive]}>
              Papers ({paperMessages.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('discussion')}
            style={[styles.segmentPill, activeTab === 'discussion' && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentPillText, activeTab === 'discussion' && styles.segmentPillTextActive]}>
              Discussion
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('podcasts')}
            style={[styles.segmentPill, activeTab === 'podcasts' && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentPillText, activeTab === 'podcasts' && styles.segmentPillTextActive]}>
              Podcasts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('live_sessions')}
            style={[styles.segmentPill, activeTab === 'live_sessions' && styles.segmentPillActive]}
          >
            <Text style={[styles.segmentPillText, activeTab === 'live_sessions' && styles.segmentPillTextActive]}>
              Live Sessions
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tab 1: Papers Feed */}
      {activeTab === 'papers' && (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={styles.tabActionBar}>
            <Text style={styles.tabActionTitle}>Community Papers</Text>
            <TouchableOpacity
              onPress={() => setShowDoiModal(true)}
              style={styles.addDoiBtn}
            >
              <Plus size={13} color="#FFFFFF" />
              <Text style={styles.addDoiBtnText}>Share Paper</Text>
            </TouchableOpacity>
          </View>

          {paperMessages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No research papers shared yet</Text>
              <Text style={styles.emptySub}>
                Share verified DOI papers and literature reviews with the community.
              </Text>
              <TouchableOpacity
                onPress={() => setShowDoiModal(true)}
                style={styles.emptyShareBtn}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.emptyShareBtnText}>Share DOI Paper</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={paperMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={{ marginBottom: 14 }}>
                  <View style={styles.senderHeader}>
                    <Avatar
                      uri={item.sender?.avatarUrl || undefined}
                      name={item.sender?.fullName || 'Sara M.'}
                      size="xs"
                    />
                    <Text style={styles.senderName}>
                      {item.sender?.fullName || 'Sara M.'}
                    </Text>
                    <Text style={styles.msgTime}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <WorkspaceDoiCard doiMeta={item.doi_metadata!} />
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Tab 2: Discussion (Main Chat Feed with Rich Academic Cards) */}
      {activeTab === 'discussion' && (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            ListHeaderComponent={
              /* Reference Embedded Demo Academic & Podcast Cards for Instant Rich Aesthetic */
              <View style={{ marginBottom: 12 }}>
                {/* Paper Review Message Row */}
                <View style={styles.communityMsgRow}>
                  <Avatar
                    uri="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
                    name="Sara M."
                    size="sm"
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <View style={styles.communityMsgBubble}>
                    <Text style={styles.communitySenderName}>Sara M.</Text>
                    <Text style={styles.communityMsgContent}>
                      Check out this newly published paper on Microplastic-Free Living! Great read for our weekly topic.
                    </Text>

                    {/* Embedded Research Paper Card */}
                    <View style={styles.embeddedPaperCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <FileText size={18} color="#164E3F" />
                        <Text style={styles.embeddedPaperTitle} numberOfLines={2}>
                          Microplastics in Household Environments: A Review
                        </Text>
                      </View>
                      <Text style={styles.embeddedPaperSub}>
                        • PDF Link • 12 comments
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Podcast Card Message Row */}
                <View style={[styles.communityMsgRow, { marginTop: 12 }]}>
                  <Avatar
                    uri="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
                    name="Alex P."
                    size="sm"
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <View style={styles.communityMsgBubble}>
                    <Text style={styles.communitySenderName}>Alex P.</Text>
                    <Text style={styles.communityMsgContent}>
                      Very interesting, Sara! It touches on the same Swedish dishcloth study we talked about 🧼
                    </Text>

                    {/* Embedded Podcast Audio Card */}
                    <View style={styles.embeddedPodcastCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Mic size={16} color="#164E3F" />
                        <Text style={styles.embeddedPodcastTitle}>
                          Group Podcast • Episode 14: Zero-Waste Kitchen Habits
                        </Text>
                      </View>
                      <Text style={styles.embeddedPodcastDuration}>
                        • Listen Now (24 mins)
                      </Text>

                      <View style={styles.podcastPlayRow}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            if (Platform.OS === 'web') window.alert('Playing Group Podcast Episode 14...');
                          }}
                          style={styles.playPillBtn}
                        >
                          <Play size={12} color="#FFFFFF" fill="#FFFFFF" />
                          <Text style={styles.playPillText}>Play</Text>
                        </TouchableOpacity>
                        <Text style={styles.podcastSpeakersText}>
                          Speakers: Maya G., Sara, Alex
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Live Session Reminder Card Message Row */}
                <View style={[styles.communityMsgRow, { marginTop: 12 }]}>
                  <Avatar
                    uri="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                    name="Maya G."
                    size="sm"
                    style={{ marginRight: 8, marginTop: 2 }}
                  />
                  <View style={styles.communityMsgBubble}>
                    <View style={styles.liveSessionCard}>
                      <View style={styles.liveBadgeRow}>
                        <View style={styles.liveIndicatorRow}>
                          <View style={styles.redLiveDot} />
                          <Text style={styles.liveSessionLabel}>Live Session Tonight</Text>
                        </View>
                        <Radio size={14} color="#DC2626" />
                      </View>
                      <Text style={styles.liveSessionTopic}>
                        "Composting Q&A" with Maya G.
                      </Text>
                      <View style={styles.liveSessionFooter}>
                        <Text style={styles.liveSessionTime}>
                          7:00 PM • Set Reminder
                        </Text>
                        <View style={styles.hostAvatarStack}>
                          <Image source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60' }} style={styles.miniHostAvatar} />
                          <Image source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60' }} style={[styles.miniHostAvatar, { marginLeft: -6 }]} />
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            }
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
              <FileText size={14} color="#164E3F" />
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

          {/* Bottom Capsule Input Dock */}
          <View style={styles.bottomDockContainer}>
            <View style={styles.inputCapsule}>
              <TouchableOpacity
                onPress={() => setShowDoiModal(true)}
                style={styles.mediaIconBtn}
              >
                <Camera size={19} color="#94A3B8" />
              </TouchableOpacity>

              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder={`Message ${workspace.name}...`}
                placeholderTextColor="#94A3B8"
                style={styles.textInput}
              />

              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web') window.alert('Voice memo ready.');
                }}
                style={styles.mediaIconBtn}
              >
                <Mic size={19} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={(!inputText.trim() && !attachedDoi) || isSending}
              style={[styles.detachedSendBtn, (!inputText.trim() && !attachedDoi) && styles.detachedSendBtnDisabled]}
            >
              {isSending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Send size={16} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tab 3: Podcasts */}
      {activeTab === 'podcasts' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.podcastHeaderCard}>
            <Mic size={28} color="#164E3F" />
            <Text style={styles.podcastHeaderTitle}>Community Podcasts & Audio Summaries</Text>
            <Text style={styles.podcastHeaderSub}>
              Listen to 15-minute paper walkthroughs and interactive Q&As.
            </Text>
          </View>

          {/* Podcast Episode Card 1 */}
          <View style={styles.podcastCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Mic size={16} color="#164E3F" />
              <Text style={styles.podcastTitle}>Episode 14: Zero-Waste Kitchen Habits</Text>
            </View>
            <Text style={styles.podcastDuration}>Duration: 24 mins • Recorded Oct 7</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (Platform.OS === 'web') window.alert('Playing Episode 14...');
              }}
              style={styles.playBtn}
            >
              <Play size={13} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.playBtnText}>Play Podcast</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Tab 4: Live Sessions */}
      {activeTab === 'live_sessions' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.tabActionBar}>
            <Text style={styles.tabActionTitle}>Live Research Sessions</Text>
            <TouchableOpacity
              onPress={() => setShowEventModal(true)}
              style={styles.addDoiBtn}
            >
              <Plus size={13} color="#FFFFFF" />
              <Text style={styles.addDoiBtnText}>Schedule Session</Text>
            </TouchableOpacity>
          </View>

          {events.filter((e) => e.event_type === 'live_session').length === 0 ? (
            <View style={styles.emptyContainer}>
              <Video size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No upcoming live sessions</Text>
              <Text style={styles.emptySub}>
                Schedule your next journal club, Q&A, or live experiment streaming.
              </Text>
            </View>
          ) : (
            events
              .filter((e) => e.event_type === 'live_session')
              .map((ev) => (
                <View key={ev.id} style={styles.liveSessionCard}>
                  <View style={styles.liveBadgeRow}>
                    <View style={styles.liveIndicatorRow}>
                      <View style={styles.redLiveDot} />
                      <Text style={styles.liveSessionLabel}>LIVE SESSION</Text>
                    </View>
                    <Text style={styles.liveSessionTime}>
                      {new Date(ev.start_time).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.liveSessionTopic}>{ev.title}</Text>
                  {ev.meeting_link && (
                    <TouchableOpacity
                      onPress={() => {
                        if (Platform.OS === 'web') window.open(ev.meeting_link!, '_blank');
                        else Linking.openURL(ev.meeting_link!);
                      }}
                      style={styles.joinMeetingBtn}
                    >
                      <Text style={styles.joinMeetingBtnText}>Join Live Meeting</Text>
                      <ExternalLink size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
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
    </View>
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerTelemetry: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    padding: 6,
  },
  segmentStripContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  segmentStrip: {
    paddingHorizontal: 16,
    gap: 8,
  },
  segmentPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  segmentPillActive: {
    backgroundColor: '#164E3F',
  },
  segmentPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tabActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  addDoiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#164E3F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addDoiBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  communityMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  communityMsgBubble: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 12,
  },
  communitySenderName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  communityMsgContent: {
    fontSize: 13,
    lineHeight: 18,
    color: '#111827',
  },
  embeddedPaperCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  embeddedPaperTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  embeddedPaperSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  embeddedPodcastCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  embeddedPodcastTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  embeddedPodcastDuration: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  podcastPlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  playPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#164E3F',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  playPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  podcastSpeakersText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  liveSessionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  redLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#DC2626',
  },
  liveSessionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  liveSessionTopic: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  liveSessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  liveSessionTime: {
    fontSize: 11,
    color: '#64748B',
  },
  hostAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniHostAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  joinMeetingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#164E3F',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  joinMeetingBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: '85%',
  },
  myMessageRow: {
    alignSelf: 'flex-end',
  },
  otherMessageRow: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: '#164E3F',
  },
  otherBubble: {
    backgroundColor: '#F3F4F6',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#111827',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: '#A7F3D0',
  },
  otherTimestamp: {
    color: '#94A3B8',
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
  podcastHeaderCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  podcastHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  podcastHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  podcastCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  podcastTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  podcastDuration: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#164E3F',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  playBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 300,
  },
  emptyShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#164E3F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 14,
  },
  emptyShareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  msgTime: {
    fontSize: 10,
    color: '#94A3B8',
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
    marginBottom: 14,
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
  confirmAttachBtn: {
    backgroundColor: '#164E3F',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmAttachBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
  attachedDoiTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#164E3F',
  },
  attachedDoiSub: {
    fontSize: 10,
    color: '#047857',
  },
});
