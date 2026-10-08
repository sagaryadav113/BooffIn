import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Shield,
  MessageSquare,
  Calendar,
  Briefcase,
  Bookmark,
  Plus,
  Send,
  Lock,
  UserPlus,
  Users,
  X,
  Clock,
  ExternalLink,
  CheckCircle2,
  Search,
  Sparkles,
  FileText,
  Trash2,
  LogOut,
  ChevronRight,
  Filter,
  CornerUpLeft,
  ClipboardList,
  Camera,
  Mic,
  Tag,
  Check,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { GroupCollageAvatar } from './GroupCollageAvatar';
import {
  Workspace,
  WorkspaceMessage,
  WorkspaceEvent,
  WorkspaceRoleOpportunity,
  WorkspaceSavedItem,
  WorkspaceMember,
  DoiMetadata,
} from '../../types/workspace';
import { WorkspaceDoiCard } from './WorkspaceDoiCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { resolvePaper } from '../../api/paperResolver';
import { searchBooffInUsers } from '../../api/search/providers/userSearchProvider';

export type InnerCircleTab = 'discussions' | 'calendar' | 'jobs' | 'bookmarked';

interface WorkspaceInnerCircleViewProps {
  workspace: Workspace;
}

export const WorkspaceInnerCircleView: React.FC<WorkspaceInnerCircleViewProps> = ({ workspace }) => {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<InnerCircleTab>('discussions');

  // Workspace Store Data & Actions
  const messages = useWorkspaceStore((s) => s.messages);
  const events = useWorkspaceStore((s) => s.events);
  const opportunities = useWorkspaceStore((s) => s.opportunities);
  const savedItems = useWorkspaceStore((s) => s.savedItems);
  const members = useWorkspaceStore((s) => s.members);
  const isMessagesLoading = useWorkspaceStore((s) => s.isMessagesLoading);
  const isSending = useWorkspaceStore((s) => s.isSending);

  const loadMessages = useWorkspaceStore((s) => s.loadMessages);
  const sendMessage = useWorkspaceStore((s) => s.sendMessage);
  const markAsRead = useWorkspaceStore((s) => s.markAsRead);
  const loadEvents = useWorkspaceStore((s) => s.loadEvents);
  const createEvent = useWorkspaceStore((s) => s.createEvent);
  const loadOpportunities = useWorkspaceStore((s) => s.loadOpportunities);
  const createOpportunity = useWorkspaceStore((s) => s.createOpportunity);
  const loadSavedItems = useWorkspaceStore((s) => s.loadSavedItems);
  const saveItem = useWorkspaceStore((s) => s.saveItem);
  const removeSavedItem = useWorkspaceStore((s) => s.removeSavedItem);
  const loadMembers = useWorkspaceStore((s) => s.loadMembers);
  const inviteToInnerCircle = useWorkspaceStore((s) => s.inviteToInnerCircle);
  const removeMember = useWorkspaceStore((s) => s.removeMember);
  const leaveWorkspace = useWorkspaceStore((s) => s.leaveWorkspace);
  const subscribeToWorkspaceMessages = useWorkspaceStore((s) => s.subscribeToWorkspaceMessages);

  // Discussions State
  const [inputText, setInputText] = useState('');
  const [showDoiModal, setShowDoiModal] = useState(false);
  const [doiQuery, setDoiQuery] = useState('');
  const [isResolvingDoi, setIsResolvingDoi] = useState(false);
  const [resolvedDoi, setResolvedDoi] = useState<DoiMetadata | null>(null);
  const [attachedDoi, setAttachedDoi] = useState<DoiMetadata | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  const [showJobModal, setShowJobModal] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobAssignee, setJobAssignee] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  useEffect(() => {
    loadMessages(workspace.id);
    loadEvents(workspace.id);
    loadOpportunities(workspace.id);
    loadSavedItems(workspace.id);
    loadMembers(workspace.id);
    markAsRead(workspace.id);

    const unsubscribe = subscribeToWorkspaceMessages(workspace.id);
    return () => {
      unsubscribe();
    };
  }, [workspace.id]);

  const memberCount = members.length || workspace.members_count || 1;

  const handleSendMessage = async () => {
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
    }
  };

  const handleResolveDoi = async () => {
    const raw = doiQuery.trim();
    if (!raw) return;
    setIsResolvingDoi(true);
    try {
      const p = await resolvePaper(raw);
      if (p) {
        setResolvedDoi({
          doi: p.doi || raw,
          title: p.title,
          authors: (p.authors || []).map((a) => ({ name: a.name, orcid: a.orcid })),
          publicationYear: p.publicationYear,
          journal: p.journal,
          url: p.openAccessUrl || p.canonicalUrl,
          citationCount: p.citationCount,
        });
      }
    } catch {}
    setIsResolvingDoi(false);
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) return;
    await createEvent({
      workspaceId: workspace.id,
      title: eventTitle.trim(),
      description: eventDesc.trim() || undefined,
      eventType: 'lab_meeting',
      startTime: `${eventDate}T14:00:00Z`,
    });
    setShowEventModal(false);
    setEventTitle('');
    setEventDesc('');
  };

  const handleCreateJob = async () => {
    if (!jobTitle.trim()) return;
    await createOpportunity({
      workspaceId: workspace.id,
      title: jobTitle.trim(),
      roleType: 'research_assistant',
      description: jobDesc.trim() || `Job Designation: '${jobTitle.trim()}' assigned to ${jobAssignee || '@Alex P.'} for the next phase of the project`,
    });
    setShowJobModal(false);
    setJobTitle('');
    setJobDesc('');
    setJobAssignee('');
  };

  const handleSearchUsers = async (text: string) => {
    setSearchUserQuery(text);
    const clean = text.trim().replace(/^@/, '');
    if (!clean || clean.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const results = await searchBooffInUsers(clean, 6);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleInvite = async (targetId: string) => {
    setInviteStatus('Adding researcher...');
    const res = await inviteToInnerCircle(workspace.id, targetId, 'member');
    if (res.success) {
      setInviteStatus('Researcher added to pod!');
      setTimeout(() => {
        setShowInviteModal(false);
        setSearchUserQuery('');
        setSearchResults([]);
        setInviteStatus(null);
      }, 1000);
    } else {
      setInviteStatus(res.error || 'Failed to add researcher');
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Bar matching reference screenshot */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#164E3F" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <GroupCollageAvatar size={34} name={workspace.name} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {workspace.name || "BooffIn's inner circle"}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowInviteModal(true)}
          style={styles.headerIconBtn}
        >
          <Plus size={22} color="#164E3F" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* 2. Sub-Filter Pill Strip matching reference */}
      <View style={styles.subFilterStripContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subFilterStrip}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('discussions')}
            style={[styles.filterPill, activeTab === 'discussions' && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, activeTab === 'discussions' && styles.filterPillTextActive]}>
              Discussions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('calendar')}
            style={[styles.filterPill, activeTab === 'calendar' && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, activeTab === 'calendar' && styles.filterPillTextActive]}>
              Calendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('jobs')}
            style={[styles.filterPill, activeTab === 'jobs' && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, activeTab === 'jobs' && styles.filterPillTextActive]}>
              Jobs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('bookmarked')}
            style={[styles.filterPill, activeTab === 'bookmarked' && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, activeTab === 'bookmarked' && styles.filterPillTextActive]}>
              Bookmarked
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 3. Main Discussions Feed matching reference screenshot */}
      {activeTab === 'discussions' && (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* Centered Date Capsule: Today */}
          <View style={styles.dateCapsuleContainer}>
            <View style={styles.dateCapsule}>
              <Text style={styles.dateCapsuleText}>Today</Text>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            ListHeaderComponent={
              /* Reference Inner Circle Collaboration Card Modules */
              <View style={styles.academicThreadPost}>
                <View style={styles.authorRow}>
                  <Avatar
                    uri="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                    name="Sara M."
                    size="md"
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.authorName}>
                        Sara M. – Postdoctoral Fellow
                      </Text>
                      <CheckCircle2 size={14} color="#164E3F" style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </View>

                <Text style={styles.postBodyText}>
                  Hey team, check out this paper on genetic sequencing. It has some really interesting methodology.
                </Text>

                {/* DOI Link Pill */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (Platform.OS === 'web') window.open('https://doi.org/10.1126/science.abc1234', '_blank');
                  }}
                  style={styles.doiPill}
                >
                  <View style={styles.doiIconCircle}>
                    <Text style={styles.doiIconText}>doi</Text>
                  </View>
                  <Text style={styles.doiPillText}>
                    DOI: 10.1126/science.abc1234 • paper link
                  </Text>
                </TouchableOpacity>

                {/* Subject Hashtags */}
                <View style={styles.hashtagsRow}>
                  <View style={styles.hashtagChip}>
                    <Text style={styles.hashtagText}>#GeneticSequencing</Text>
                  </View>
                  <View style={styles.hashtagChip}>
                    <Text style={styles.hashtagText}>#PaperDiscussion</Text>
                  </View>
                </View>

                {/* Inline Reply Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setInputText('Replying to Sara M.: ')}
                  style={styles.replyBtn}
                >
                  <CornerUpLeft size={13} color="#475569" />
                  <Text style={styles.replyBtnText}>Reply (3)</Text>
                </TouchableOpacity>

                {/* Upcoming Event Card */}
                <View style={styles.moduleCard}>
                  <Text style={styles.moduleCardHeader}>📅 Upcoming Event</Text>
                  <Text style={styles.moduleCardBody}>
                    Tagged: 'Project Review' • Next Mon, 2 PM • tagged: @Alex P., @Maya G.
                  </Text>
                </View>

                {/* Jobs Assigned Card */}
                <View style={styles.moduleCard}>
                  <Text style={styles.moduleCardHeader}>Jobs Assigned</Text>
                  <Text style={styles.moduleCardBody}>
                    📋 Task Assignment • Job Designation: 'Lead Researcher' assigned to @Alex P. for the next phase of the project • ✓ Task Assignment • Jobs Assigned
                  </Text>
                </View>

                {/* PI Bookmark Footer */}
                <View style={styles.piBookmarkFooter}>
                  <Bookmark size={12} color="#164E3F" fill="#164E3F" />
                  <Text style={styles.piBookmarkText}>Saved to Bookmarks by PI</Text>
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

          {/* Attached DOI banner if preparing to send */}
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
                placeholder="Message BooffIn's..."
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

      {/* TAB 2: Calendar */}
      {activeTab === 'calendar' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.tabActionBar}>
            <Text style={styles.tabActionTitle}>Lab Calendar & Milestones</Text>
            <TouchableOpacity onPress={() => setShowEventModal(true)} style={styles.addBtn}>
              <Plus size={13} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Schedule Event</Text>
            </TouchableOpacity>
          </View>

          {events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No scheduled events</Text>
              <Text style={styles.emptySub}>Schedule group meetings, project reviews, or milestones.</Text>
            </View>
          ) : (
            events.map((ev) => (
              <View key={ev.id} style={styles.eventCard}>
                <View style={styles.eventCardHeader}>
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(ev.start_time).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                {ev.description && <Text style={styles.eventDesc}>{ev.description}</Text>}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* TAB 3: Jobs */}
      {activeTab === 'jobs' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.tabActionBar}>
            <Text style={styles.tabActionTitle}>Jobs & Task Assignments</Text>
            <TouchableOpacity onPress={() => setShowJobModal(true)} style={styles.addBtn}>
              <Plus size={13} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Assign Task</Text>
            </TouchableOpacity>
          </View>

          {opportunities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Briefcase size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No open tasks</Text>
              <Text style={styles.emptySub}>Assign project tasks, review calls, or research roles.</Text>
            </View>
          ) : (
            opportunities.map((opp) => (
              <View key={opp.id} style={styles.jobCard}>
                <Text style={styles.jobTitle}>{opp.title}</Text>
                <Text style={styles.jobDesc}>{opp.description}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* TAB 4: Bookmarked */}
      {activeTab === 'bookmarked' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.tabActionTitle}>Saved Vault & Bookmarks</Text>
          <Text style={styles.vaultSubtitle}>Confidential items saved by your pod members.</Text>

          {savedItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Bookmark size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No bookmarked items</Text>
              <Text style={styles.emptySub}>Save important paper DOIs or discussions to access them anytime.</Text>
            </View>
          ) : (
            savedItems.map((item) => (
              <View key={item.id} style={styles.vaultItemCard}>
                <Text style={styles.vaultItemTitle}>{item.note || 'Saved Pod Reference'}</Text>
                <Text style={styles.vaultItemDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
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
            <Text style={styles.modalSubtitle}>Enter paper DOI to resolve and attach verified metadata.</Text>
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
                <TouchableOpacity
                  onPress={() => {
                    setAttachedDoi(resolvedDoi);
                    setShowDoiModal(false);
                    setDoiQuery('');
                    setResolvedDoi(null);
                  }}
                  style={styles.confirmAttachBtn}
                >
                  <Text style={styles.confirmAttachBtnText}>Attach to Pod Discussion</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Schedule Event */}
      <Modal visible={showEventModal} transparent animationType="fade" onRequestClose={() => setShowEventModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Lab Event</Text>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Event Title (e.g. Project Review)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={eventDesc}
              onChangeText={setEventDesc}
              placeholder="Tag members or specify agenda..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 14 }]}
            />
            <TouchableOpacity onPress={handleCreateEvent} style={styles.confirmAttachBtn}>
              <Text style={styles.confirmAttachBtnText}>Schedule Event</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Assign Task / Job */}
      <Modal visible={showJobModal} transparent animationType="fade" onRequestClose={() => setShowJobModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Task / Role</Text>
              <TouchableOpacity onPress={() => setShowJobModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder="Job Title (e.g. Lead Researcher)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={jobAssignee}
              onChangeText={setJobAssignee}
              placeholder="Assignee (e.g. @Alex P.)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={jobDesc}
              onChangeText={setJobDesc}
              placeholder="Task details and scope..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 14 }]}
            />
            <TouchableOpacity onPress={handleCreateJob} style={styles.confirmAttachBtn}>
              <Text style={styles.confirmAttachBtnText}>Assign to Pod</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Invite Researcher */}
      <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Researcher to Pod</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Inner Circles are capped at 25 members for confidential E2EE collaboration.
            </Text>
            <TextInput
              value={searchUserQuery}
              onChangeText={handleSearchUsers}
              placeholder="Search by name or username..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            {isSearchingUsers ? (
              <ActivityIndicator size="small" color="#164E3F" style={{ marginVertical: 10 }} />
            ) : (
              searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => handleInvite(user.id)}
                  style={styles.searchUserRow}
                >
                  <Avatar uri={user.avatarUrl} name={user.fullName || user.handle} size="sm" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.searchUserName}>{user.fullName || `@${user.handle}`}</Text>
                    <Text style={styles.searchUserSub}>{user.academicTitle || user.institution || 'Researcher'}</Text>
                  </View>
                  <Text style={styles.invitePill}>Add</Text>
                </TouchableOpacity>
              ))
            )}
            {inviteStatus && (
              <Text style={{ fontSize: 12, color: '#164E3F', marginTop: 8, fontWeight: '600' }}>
                {inviteStatus}
              </Text>
            )}
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerIconBtn: {
    padding: 6,
  },
  subFilterStripContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  subFilterStrip: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: {
    backgroundColor: '#164E3F',
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
  dateCapsuleContainer: {
    alignItems: 'center',
    marginVertical: 8,
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
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  academicThreadPost: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#164E3F',
  },
  postBodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
    marginBottom: 10,
  },
  doiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  doiIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#164E3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doiIconText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  doiPillText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  hashtagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  hashtagChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hashtagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  replyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  moduleCardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  moduleCardBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  piBookmarkFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  piBookmarkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#164E3F',
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
  tabActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tabActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  vaultSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#164E3F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  eventDate: {
    fontSize: 11,
    color: '#64748B',
  },
  eventDesc: {
    fontSize: 12,
    color: '#475569',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  jobDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  vaultItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  vaultItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  vaultItemDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
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
  searchUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchUserSub: {
    fontSize: 11,
    color: '#64748B',
  },
  invitePill: {
    backgroundColor: '#164E3F',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: '700',
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
