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
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
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
import { fetchUserProfileByUsername, fetchUserProfile } from '../../api/authService';
import { searchBooffInUsers } from '../../api/search/providers/userSearchProvider';

export type InnerCircleTab = 'discussions' | 'calendar' | 'roles' | 'saved' | 'members';

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
  const isMembersLoading = useWorkspaceStore((s) => s.isMembersLoading);
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

  // Calendar State & Filters
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'lab_meeting' | 'reading_group' | 'milestone' | 'live_session'>('all');
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState<'lab_meeting' | 'reading_group' | 'milestone' | 'live_session'>('lab_meeting');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventMeetingLink, setEventMeetingLink] = useState('');

  // Opportunities State & Filters
  const [roleFilter, setRoleFilter] = useState<'all' | 'co_author' | 'research_assistant' | 'reviewer' | 'grant_partner' | 'postdoc'>('all');
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [oppTitle, setOppTitle] = useState('');
  const [oppRoleType, setOppRoleType] = useState<'co_author' | 'research_assistant' | 'reviewer' | 'grant_partner' | 'postdoc'>('co_author');
  const [oppDesc, setOppDesc] = useState('');
  const [oppComp, setOppComp] = useState('');

  // Saved Vault Filters
  const [vaultFilter, setVaultFilter] = useState<'all' | 'message' | 'doi_paper' | 'opportunity' | 'event'>('all');

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [inviteStatus, setInviteStatus] = useState<{ message: string; isError: boolean } | null>(null);

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

  const isOwnerOrAdmin = useMemo(() => {
    if (workspace.owner_id === currentUser?.id) return true;
    const me = members.find((m) => m.user_id === currentUser?.id);
    return me?.role === 'owner' || me?.role === 'admin';
  }, [workspace.owner_id, currentUser?.id, members]);

  const memberCount = members.length || workspace.members_count || 1;
  const maxMembers = workspace.max_members || 25;

  // 1. Discussions Handlers
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
    } else {
      const err = res.error || 'Failed to post to pod';
      if (Platform.OS === 'web') window.alert(err);
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
      } else {
        if (Platform.OS === 'web') window.alert('No paper found for this DOI / Link.');
      }
    } catch {
      if (Platform.OS === 'web') window.alert('Failed to resolve DOI metadata.');
    } finally {
      setIsResolvingDoi(false);
    }
  };

  // 2. Calendar Handlers
  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) return;
    const res = await createEvent({
      workspaceId: workspace.id,
      title: eventTitle.trim(),
      description: eventDesc.trim() || undefined,
      eventType,
      startTime: `${eventDate}T10:00:00Z`,
      meetingLink: eventMeetingLink.trim() || undefined,
    });
    if (res.success) {
      setShowEventModal(false);
      setEventTitle('');
      setEventDesc('');
      setEventMeetingLink('');
    } else {
      if (Platform.OS === 'web') window.alert(res.error || 'Failed to schedule event');
    }
  };

  const filteredEvents = useMemo(() => {
    if (calendarFilter === 'all') return events;
    return events.filter((e) => e.event_type === calendarFilter);
  }, [events, calendarFilter]);

  // 3. Opportunities Handlers
  const handleCreateOpportunity = async () => {
    if (!oppTitle.trim() || !oppDesc.trim()) return;
    const res = await createOpportunity({
      workspaceId: workspace.id,
      title: oppTitle.trim(),
      roleType: oppRoleType,
      description: oppDesc.trim(),
      compensation: oppComp.trim() || undefined,
    });
    if (res.success) {
      setShowOpportunityModal(false);
      setOppTitle('');
      setOppDesc('');
      setOppComp('');
    } else {
      if (Platform.OS === 'web') window.alert(res.error || 'Failed to post opportunity');
    }
  };

  const filteredOpportunities = useMemo(() => {
    if (roleFilter === 'all') return opportunities;
    return opportunities.filter((o) => o.role_type === roleFilter);
  }, [opportunities, roleFilter]);

  // 4. Saved Vault Handlers
  const filteredSavedItems = useMemo(() => {
    if (vaultFilter === 'all') return savedItems;
    return savedItems.filter((i) => i.item_type === vaultFilter);
  }, [savedItems, vaultFilter]);

  // 5. Member Search & Invite Handlers
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

  const handleInviteUser = async (targetId: string) => {
    setInviteStatus({ message: 'Adding to Pod...', isError: false });
    const res = await inviteToInnerCircle(workspace.id, targetId, 'member');
    if (res.success) {
      setInviteStatus({ message: 'Researcher successfully added to Pod!', isError: false });
      setTimeout(() => {
        setShowInviteModal(false);
        setSearchUserQuery('');
        setSearchResults([]);
        setInviteStatus(null);
      }, 1200);
    } else {
      setInviteStatus({ message: res.error || 'Failed to invite researcher', isError: true });
    }
  };

  const handleRemoveMember = async (targetId: string, name: string) => {
    if (Platform.OS === 'web') {
      const ok = window.confirm(`Remove ${name} from this Inner Circle pod?`);
      if (!ok) return;
    }
    await removeMember(workspace.id, targetId);
  };

  const handleLeavePod = async () => {
    if (Platform.OS === 'web') {
      const ok = window.confirm('Are you sure you want to leave this Inner Circle pod?');
      if (!ok) return;
    }
    const res = await leaveWorkspace(workspace.id);
    if (res.success) {
      router.replace('/workspace' as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/workspace' as any)}
          style={styles.backButton}
        >
          <ArrowLeft size={18} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {workspace.name}
            </Text>
            <View style={styles.e2eeBadge}>
              <Lock size={10} color="#064E3B" />
              <Text style={styles.e2eeBadgeText}>E2EE</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            {memberCount} / {maxMembers} Members · Private Research Pod
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowInviteModal(true)}
            style={styles.inviteHeaderBtn}
          >
            <UserPlus size={14} color="#064E3B" />
            <Text style={styles.inviteHeaderBtnText}>Invite</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 5-Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('discussions')}
          style={[styles.tabBtn, activeTab === 'discussions' && styles.tabBtnActive]}
        >
          <MessageSquare size={14} color={activeTab === 'discussions' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'discussions' && styles.tabTextActive]}>
            Discussions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('calendar')}
          style={[styles.tabBtn, activeTab === 'calendar' && styles.tabBtnActive]}
        >
          <Calendar size={14} color={activeTab === 'calendar' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'calendar' && styles.tabTextActive]}>
            Calendar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('roles')}
          style={[styles.tabBtn, activeTab === 'roles' && styles.tabBtnActive]}
        >
          <Briefcase size={14} color={activeTab === 'roles' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'roles' && styles.tabTextActive]}>
            Roles
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('saved')}
          style={[styles.tabBtn, activeTab === 'saved' && styles.tabBtnActive]}
        >
          <Bookmark size={14} color={activeTab === 'saved' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
            Vault
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('members')}
          style={[styles.tabBtn, activeTab === 'members' && styles.tabBtnActive]}
        >
          <Users size={14} color={activeTab === 'members' ? '#064E3B' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            Roster ({memberCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Tab Contents */}

      {/* TAB 1: Discussions */}
      {activeTab === 'discussions' && (
        <View style={{ flex: 1 }}>
          <View style={styles.e2eePodBanner}>
            <Lock size={12} color="#064E3B" />
            <Text style={styles.e2eePodBannerText}>
              Confidential pod discussion · End-to-end encrypted · Up to 25 verified researchers
            </Text>
          </View>

          {isMessagesLoading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color="#064E3B" />
              <Text style={styles.loadingText}>Loading encrypted pod discussions...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyMessagesContainer}>
              <View style={styles.emptyPodIconWrapper}>
                <Lock size={28} color="#064E3B" />
              </View>
              <Text style={styles.emptyPodTitle}>Welcome to your Inner Circle Pod</Text>
              <Text style={styles.emptyPodSub}>
                Share early drafts, confidential findings, and DOI references securely with your 25 pod collaborators.
              </Text>
              <TouchableOpacity
                onPress={() => setShowDoiModal(true)}
                style={styles.emptyAttachDoiBtn}
              >
                <FileText size={14} color="#064E3B" />
                <Text style={styles.emptyAttachDoiText}>Share a Paper DOI</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              renderItem={({ item }) => {
                const isMe = item.sender_id === currentUser?.id;
                const isSaved = savedItems.some((s) => s.item_id === item.id);

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
                        <View style={styles.senderHeader}>
                          <Text style={styles.senderName}>{item.sender?.fullName || 'Researcher'}</Text>
                          {item.sender?.institution && (
                            <Text style={styles.senderAffil}> · {item.sender.institution}</Text>
                          )}
                        </View>
                      )}

                      {item.doi_metadata && (
                        <View style={{ marginBottom: item.content ? 8 : 0 }}>
                          <WorkspaceDoiCard
                            doiMeta={item.doi_metadata}
                            isSaved={isSaved}
                            onSave={() => {
                              if (isSaved) {
                                removeSavedItem(workspace.id, item.id);
                              } else {
                                saveItem({
                                  workspaceId: workspace.id,
                                  itemType: 'doi_paper',
                                  itemId: item.id,
                                  note: item.doi_metadata?.title,
                                });
                              }
                            }}
                          />
                        </View>
                      )}

                      {item.content ? (
                        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                          {item.content}
                        </Text>
                      ) : null}

                      <View style={styles.msgFooter}>
                        <TouchableOpacity
                          onPress={() => {
                            if (isSaved) {
                              removeSavedItem(workspace.id, item.id);
                            } else {
                              saveItem({
                                workspaceId: workspace.id,
                                itemType: 'message',
                                itemId: item.id,
                                note: item.content ? item.content.slice(0, 60) : 'Pod Message',
                              });
                            }
                          }}
                          style={styles.saveMsgAction}
                        >
                          <Bookmark size={11} color={isMe ? 'rgba(255,255,255,0.8)' : isSaved ? '#064E3B' : '#94A3B8'} />
                        </TouchableOpacity>
                        <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Attached DOI banner if preparing to send */}
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

          {/* Input Toolbar */}
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
              placeholder="Post confidential message to pod..."
              placeholderTextColor="#94A3B8"
              multiline
              style={styles.textInput}
            />

            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={(!inputText.trim() && !attachedDoi) || isSending}
              style={[styles.sendBtn, (!inputText.trim() && !attachedDoi) && styles.sendBtnDisabled]}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={15} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* TAB 2: Calendar */}
      {activeTab === 'calendar' && (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
          <View style={styles.tabActionBar}>
            <View>
              <Text style={styles.tabActionTitle}>Lab Calendar & Milestones</Text>
              <Text style={styles.tabActionSub}>Coordinate lab meetings, deadlines, and reading groups</Text>
            </View>
            <TouchableOpacity onPress={() => setShowEventModal(true)} style={styles.addBtn}>
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Schedule</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
            {(['all', 'lab_meeting', 'reading_group', 'milestone', 'live_session'] as const).map((ft) => (
              <TouchableOpacity
                key={ft}
                onPress={() => setCalendarFilter(ft)}
                style={[styles.filterChip, calendarFilter === ft && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, calendarFilter === ft && styles.filterChipTextActive]}>
                  {ft === 'all' ? 'All Events' : ft.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredEvents.length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <Calendar size={44} color="#CBD5E1" />
              <Text style={styles.tabEmptyTitle}>No events scheduled</Text>
              <Text style={styles.tabEmptySub}>
                Schedule your next lab meeting, paper submission deadline, or journal reading group.
              </Text>
              <TouchableOpacity onPress={() => setShowEventModal(true)} style={styles.emptyAddActionBtn}>
                <Plus size={14} color="#064E3B" />
                <Text style={styles.emptyAddActionText}>Schedule First Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredEvents.map((ev) => {
              const isSaved = savedItems.some((s) => s.item_id === ev.id);
              return (
                <View key={ev.id} style={styles.eventCard}>
                  <View style={styles.eventCardHeader}>
                    <View style={styles.eventTypeTag}>
                      <Clock size={11} color="#064E3B" />
                      <Text style={styles.eventTypeText}>{ev.event_type.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.eventDate}>
                      {new Date(ev.start_time).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  {ev.description && <Text style={styles.eventDesc}>{ev.description}</Text>}

                  <View style={styles.eventFooterRow}>
                    <View style={styles.creatorRow}>
                      <Avatar
                        uri={ev.creator?.avatarUrl || undefined}
                        name={ev.creator?.fullName || 'Creator'}
                        size="xs"
                      />
                      <Text style={styles.creatorName}>
                        Scheduled by {ev.creator?.fullName || 'Pod Member'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {ev.meeting_link && (
                        <TouchableOpacity
                          onPress={() => {
                            if (Platform.OS === 'web') window.open(ev.meeting_link!, '_blank');
                            else Linking.openURL(ev.meeting_link!);
                          }}
                          style={styles.joinLinkBtn}
                        >
                          <ExternalLink size={12} color="#064E3B" />
                          <Text style={styles.joinLinkBtnText}>Join Link</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => {
                          if (isSaved) {
                            removeSavedItem(workspace.id, ev.id);
                          } else {
                            saveItem({
                              workspaceId: workspace.id,
                              itemType: 'event',
                              itemId: ev.id,
                              note: ev.title,
                            });
                          }
                        }}
                        style={[styles.saveEventBtn, isSaved && styles.saveEventBtnActive]}
                      >
                        <Bookmark size={13} color={isSaved ? '#064E3B' : '#64748B'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* TAB 3: Roles & Opportunities */}
      {activeTab === 'roles' && (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
          <View style={styles.tabActionBar}>
            <View>
              <Text style={styles.tabActionTitle}>Collaboration & Role Postings</Text>
              <Text style={styles.tabActionSub}>Find co-authors, peer reviewers, and grant partners</Text>
            </View>
            <TouchableOpacity onPress={() => setShowOpportunityModal(true)} style={styles.addBtn}>
              <Plus size={14} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Post Role</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
            {(['all', 'co_author', 'research_assistant', 'reviewer', 'grant_partner', 'postdoc'] as const).map((rt) => (
              <TouchableOpacity
                key={rt}
                onPress={() => setRoleFilter(rt)}
                style={[styles.filterChip, roleFilter === rt && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, roleFilter === rt && styles.filterChipTextActive]}>
                  {rt === 'all' ? 'All Roles' : rt.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredOpportunities.length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <Briefcase size={44} color="#CBD5E1" />
              <Text style={styles.tabEmptyTitle}>No open collaboration roles</Text>
              <Text style={styles.tabEmptySub}>
                Post a call for co-authorship, paper review, or grant partnership within this private pod.
              </Text>
              <TouchableOpacity onPress={() => setShowOpportunityModal(true)} style={styles.emptyAddActionBtn}>
                <Plus size={14} color="#064E3B" />
                <Text style={styles.emptyAddActionText}>Post First Role</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredOpportunities.map((opp) => {
              const isSaved = savedItems.some((s) => s.item_id === opp.id);
              return (
                <View key={opp.id} style={styles.oppCard}>
                  <View style={styles.oppCardHeader}>
                    <View style={styles.oppTypeTag}>
                      <Briefcase size={11} color="#064E3B" />
                      <Text style={styles.oppTypeText}>{opp.role_type.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    {opp.compensation && (
                      <View style={styles.oppCompTag}>
                        <Text style={styles.oppCompText}>{opp.compensation}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.oppTitle}>{opp.title}</Text>
                  <Text style={styles.oppDesc}>{opp.description}</Text>

                  <View style={styles.oppFooterRow}>
                    <View style={styles.creatorRow}>
                      <Avatar
                        uri={opp.creator?.avatarUrl || undefined}
                        name={opp.creator?.fullName || 'Researcher'}
                        size="xs"
                      />
                      <Text style={styles.creatorName}>
                        Posted by {opp.creator?.fullName || 'Pod Member'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          if (isSaved) {
                            removeSavedItem(workspace.id, opp.id);
                          } else {
                            saveItem({
                              workspaceId: workspace.id,
                              itemType: 'opportunity',
                              itemId: opp.id,
                              note: opp.title,
                            });
                          }
                        }}
                        style={[styles.saveEventBtn, isSaved && styles.saveEventBtnActive]}
                      >
                        <Bookmark size={13} color={isSaved ? '#064E3B' : '#64748B'} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setActiveTab('discussions');
                          setInputText(`Interested in role: "${opp.title}" - `);
                        }}
                        style={styles.applyRoleBtn}
                      >
                        <MessageSquare size={12} color="#FFFFFF" />
                        <Text style={styles.applyRoleBtnText}>Message Poster</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* TAB 4: Saved Vault */}
      {activeTab === 'saved' && (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
          <View style={styles.tabActionBar}>
            <View>
              <Text style={styles.tabActionTitle}>Pod Saved Vault</Text>
              <Text style={styles.tabActionSub}>Bookmarks, shared DOIs, and saved opportunities</Text>
            </View>
          </View>

          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
            {(['all', 'doi_paper', 'message', 'opportunity', 'event'] as const).map((vt) => (
              <TouchableOpacity
                key={vt}
                onPress={() => setVaultFilter(vt)}
                style={[styles.filterChip, vaultFilter === vt && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, vaultFilter === vt && styles.filterChipTextActive]}>
                  {vt === 'all' ? 'All Items' : vt === 'doi_paper' ? 'Papers' : vt.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredSavedItems.length === 0 ? (
            <View style={styles.tabEmptyContainer}>
              <Bookmark size={44} color="#CBD5E1" />
              <Text style={styles.tabEmptyTitle}>No saved vault items</Text>
              <Text style={styles.tabEmptySub}>
                Bookmark papers, messages, and opportunities using the bookmark icon across any tab.
              </Text>
            </View>
          ) : (
            filteredSavedItems.map((item) => (
              <View key={item.id} style={styles.savedVaultCard}>
                <View style={styles.savedVaultIconWrapper}>
                  {item.item_type === 'doi_paper' ? (
                    <FileText size={18} color="#064E3B" />
                  ) : item.item_type === 'event' ? (
                    <Calendar size={18} color="#064E3B" />
                  ) : item.item_type === 'opportunity' ? (
                    <Briefcase size={18} color="#064E3B" />
                  ) : (
                    <MessageSquare size={18} color="#064E3B" />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.savedVaultTitle} numberOfLines={2}>
                    {item.note || 'Saved Reference'}
                  </Text>
                  <Text style={styles.savedVaultMeta}>
                    {item.item_type.replace('_', ' ').toUpperCase()} · Saved on {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => removeSavedItem(workspace.id, item.item_id)}
                  style={styles.removeSavedBtn}
                >
                  <Trash2 size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* TAB 5: Members & Roster (Max 25 Capped) */}
      {activeTab === 'members' && (
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}>
          <View style={styles.tabActionBar}>
            <View>
              <Text style={styles.tabActionTitle}>Pod Members & Roster</Text>
              <Text style={styles.tabActionSub}>
                {memberCount} of {maxMembers} Member Slots Utilized ({maxMembers - memberCount} remaining)
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowInviteModal(true)} style={styles.addBtn}>
              <UserPlus size={14} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Invite</Text>
            </TouchableOpacity>
          </View>

          {/* Visual Progress Bar */}
          <View style={styles.capacityBarWrapper}>
            <View
              style={[
                styles.capacityBarFill,
                { width: `${Math.min(100, (memberCount / maxMembers) * 100)}%` },
              ]}
            />
          </View>

          {isMembersLoading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="small" color="#064E3B" />
              <Text style={styles.loadingText}>Loading pod roster...</Text>
            </View>
          ) : (
            <View style={styles.membersListContainer}>
              {members.map((mem) => {
                const isMe = mem.user_id === currentUser?.id;
                const isCreator = mem.role === 'owner';

                return (
                  <View key={mem.id} style={styles.memberCard}>
                    <Avatar
                      uri={mem.profile?.avatarUrl || undefined}
                      name={mem.profile?.fullName || 'Researcher'}
                      size="md"
                    />
                    <View style={styles.memberInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.memberFullName}>
                          {mem.profile?.fullName || (isMe ? 'You' : 'Researcher')}
                        </Text>
                        {mem.profile?.orcidVerified && (
                          <CheckCircle2 size={13} color={colors.accentGreen} />
                        )}
                        {isMe && <Text style={styles.youBadge}>(You)</Text>}
                      </View>

                      <Text style={styles.memberHandle}>
                        {mem.profile?.handle ? `@${mem.profile.handle}` : 'Researcher'}
                        {mem.profile?.institution ? ` · ${mem.profile.institution}` : ''}
                      </Text>

                      {mem.profile?.academicTitle && (
                        <Text style={styles.memberAcademicTitle} numberOfLines={1}>
                          {mem.profile.academicTitle}
                        </Text>
                      )}
                    </View>

                    <View style={styles.memberActions}>
                      <View style={[styles.roleBadge, isCreator ? styles.ownerBadge : styles.memberRoleBadge]}>
                        <Text style={[styles.roleBadgeText, isCreator ? styles.ownerBadgeText : styles.memberRoleBadgeText]}>
                          {isCreator ? 'OWNER' : mem.role.toUpperCase()}
                        </Text>
                      </View>

                      {isOwnerOrAdmin && !isMe && !isCreator && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(mem.user_id, mem.profile?.fullName || 'this member')}
                          style={styles.removeMemberBtn}
                        >
                          <Trash2 size={14} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Leave Pod Section */}
          <View style={styles.leavePodSection}>
            <TouchableOpacity onPress={handleLeavePod} style={styles.leavePodBtn}>
              <LogOut size={16} color="#DC2626" />
              <Text style={styles.leavePodBtnText}>Leave this Inner Circle Pod</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* MODAL 1: Attach Paper DOI */}
      <Modal visible={showDoiModal} transparent animationType="fade" onRequestClose={() => setShowDoiModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FileText size={18} color="#064E3B" />
                <Text style={styles.modalTitle}>Attach Research Paper DOI</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDoiModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Paste a DOI (e.g. 10.1038/s41586-021-03819-2) or paper URL to embed live research metadata.
            </Text>

            <View style={styles.doiInputWrapper}>
              <TextInput
                value={doiQuery}
                onChangeText={setDoiQuery}
                placeholder="10.1038/... or Paper URL"
                placeholderTextColor="#94A3B8"
                style={styles.modalTextInput}
              />
              <TouchableOpacity
                onPress={handleResolveDoi}
                disabled={!doiQuery.trim() || isResolvingDoi}
                style={styles.resolveDoiBtn}
              >
                {isResolvingDoi ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Search size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {resolvedDoi && (
              <View style={styles.resolvedDoiPreviewBox}>
                <Text style={styles.resolvedDoiTitle} numberOfLines={2}>
                  {resolvedDoi.title}
                </Text>
                <Text style={styles.resolvedDoiSub}>
                  {resolvedDoi.journal || 'Journal'} {resolvedDoi.publicationYear ? `(${resolvedDoi.publicationYear})` : ''} · {resolvedDoi.citationCount || 0} Citations
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                if (resolvedDoi) {
                  setAttachedDoi(resolvedDoi);
                  setShowDoiModal(false);
                  setDoiQuery('');
                  setResolvedDoi(null);
                }
              }}
              disabled={!resolvedDoi}
              style={[styles.modalSubmitBtn, !resolvedDoi && styles.modalSubmitBtnDisabled]}
            >
              <Text style={styles.modalSubmitBtnText}>Attach to Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Add Calendar Event */}
      <Modal visible={showEventModal} transparent animationType="fade" onRequestClose={() => setShowEventModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={18} color="#064E3B" />
                <Text style={styles.modalTitle}>Schedule Lab Event / Milestone</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEventModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={eventTitle}
              onChangeText={setEventTitle}
              placeholder="Event Title (e.g. Weekly Lab Progress & Brainstorming)"
              placeholderTextColor="#94A3B8"
              style={styles.modalTextInput}
            />

            {/* Event Type selector */}
            <View style={styles.typeSelectorRow}>
              {(['lab_meeting', 'reading_group', 'milestone', 'live_session'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setEventType(t)}
                  style={[styles.typeSelectChip, eventType === t && styles.typeSelectChipActive]}
                >
                  <Text style={[styles.typeSelectChipText, eventType === t && styles.typeSelectChipTextActive]}>
                    {t.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={eventDate}
              onChangeText={setEventDate}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor="#94A3B8"
              style={styles.modalTextInput}
            />

            <TextInput
              value={eventMeetingLink}
              onChangeText={setEventMeetingLink}
              placeholder="Meeting URL (e.g. Zoom, Google Meet)"
              placeholderTextColor="#94A3B8"
              style={styles.modalTextInput}
            />

            <TextInput
              value={eventDesc}
              onChangeText={setEventDesc}
              placeholder="Description & Agenda (optional)"
              placeholderTextColor="#94A3B8"
              multiline
              style={[styles.modalTextInput, { height: 60 }]}
            />

            <TouchableOpacity
              onPress={handleCreateEvent}
              disabled={!eventTitle.trim()}
              style={[styles.modalSubmitBtn, !eventTitle.trim() && styles.modalSubmitBtnDisabled]}
            >
              <Text style={styles.modalSubmitBtnText}>Publish to Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Post Role Opportunity */}
      <Modal visible={showOpportunityModal} transparent animationType="fade" onRequestClose={() => setShowOpportunityModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Briefcase size={18} color="#064E3B" />
                <Text style={styles.modalTitle}>Post Research Opportunity</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOpportunityModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              value={oppTitle}
              onChangeText={setOppTitle}
              placeholder="Title (e.g. Co-Author for Computational Modeling)"
              placeholderTextColor="#94A3B8"
              style={styles.modalTextInput}
            />

            {/* Role Type Selector */}
            <View style={styles.typeSelectorRow}>
              {(['co_author', 'research_assistant', 'reviewer', 'grant_partner', 'postdoc'] as const).map((rt) => (
                <TouchableOpacity
                  key={rt}
                  onPress={() => setOppRoleType(rt)}
                  style={[styles.typeSelectChip, oppRoleType === rt && styles.typeSelectChipActive]}
                >
                  <Text style={[styles.typeSelectChipText, oppRoleType === rt && styles.typeSelectChipTextActive]}>
                    {rt.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={oppDesc}
              onChangeText={setOppDesc}
              placeholder="Project scope, required methodology, dataset access..."
              placeholderTextColor="#94A3B8"
              multiline
              style={[styles.modalTextInput, { height: 70 }]}
            />

            <TextInput
              value={oppComp}
              onChangeText={setOppComp}
              placeholder="Authorship order / Grant funding stipend (optional)"
              placeholderTextColor="#94A3B8"
              style={styles.modalTextInput}
            />

            <TouchableOpacity
              onPress={handleCreateOpportunity}
              disabled={!oppTitle.trim() || !oppDesc.trim()}
              style={[styles.modalSubmitBtn, (!oppTitle.trim() || !oppDesc.trim()) && styles.modalSubmitBtnDisabled]}
            >
              <Text style={styles.modalSubmitBtnText}>Publish Collaboration Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: Invite Researcher Search (Max 25 Enforced) */}
      <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <UserPlus size={18} color="#064E3B" />
                <Text style={styles.modalTitle}>Invite Researcher to Pod</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Inner Circles are confidential and capped at 25 members ({memberCount} / {maxMembers} occupied).
            </Text>

            <View style={styles.searchBarWrapper}>
              <Search size={16} color="#64748B" />
              <TextInput
                value={searchUserQuery}
                onChangeText={handleSearchUsers}
                placeholder="Search by researcher name or @handle..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
              {isSearchingUsers && <ActivityIndicator size="small" color="#064E3B" />}
            </View>

            {inviteStatus && (
              <View style={[styles.statusBanner, inviteStatus.isError ? styles.statusError : styles.statusSuccess]}>
                <Text style={[styles.statusText, inviteStatus.isError ? styles.statusTextError : styles.statusTextSuccess]}>
                  {inviteStatus.message}
                </Text>
              </View>
            )}

            <ScrollView style={{ maxHeight: 220, marginTop: 8 }}>
              {searchResults.length === 0 && searchUserQuery.trim().length >= 2 && !isSearchingUsers ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748B' }}>No researchers found for "{searchUserQuery}"</Text>
                </View>
              ) : (
                searchResults.map((user) => {
                  const alreadyMember = members.some((m) => m.user_id === user.id);
                  return (
                    <View key={user.id} style={styles.searchUserRow}>
                      <Avatar uri={user.avatarUrl} name={user.name} size="sm" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.searchUserName}>{user.name}</Text>
                        <Text style={styles.searchUserAffil} numberOfLines={1}>
                          {user.institution || user.title || 'Researcher'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleInviteUser(user.id)}
                        disabled={alreadyMember || memberCount >= maxMembers}
                        style={[
                          styles.inviteUserBtn,
                          (alreadyMember || memberCount >= maxMembers) && styles.inviteUserBtnDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.inviteUserBtnText,
                            (alreadyMember || memberCount >= maxMembers) && styles.inviteUserBtnTextDisabled,
                          ]}
                        >
                          {alreadyMember ? 'Added' : memberCount >= maxMembers ? 'Full' : 'Add to Pod'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
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
    backgroundColor: '#F1F5F9',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  e2eeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  e2eeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#064E3B',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#064E3B',
    fontWeight: '600',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inviteHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
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
    paddingVertical: 10,
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#064E3B',
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  e2eePodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  e2eePodBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#064E3B',
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyMessagesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyPodIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyPodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyPodSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAttachDoiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyAttachDoiText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#064E3B',
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    maxWidth: '85%',
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
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  senderAffil: {
    fontSize: 11,
    color: '#64748B',
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
  msgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  saveMsgAction: {
    padding: 2,
  },
  timestamp: {
    fontSize: 10,
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimestamp: {
    color: '#94A3B8',
  },
  attachedDoiPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  attachedDoiTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  attachedDoiSub: {
    fontSize: 11,
    color: '#166534',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  doiAttachIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  tabActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  tabActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  tabActionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterChipScroll: {
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  tabEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: spacing.md,
  },
  tabEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 10,
    marginBottom: 4,
  },
  tabEmptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 16,
    marginBottom: 12,
  },
  emptyAddActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  emptyAddActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#064E3B',
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  eventDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  eventFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorName: {
    fontSize: 11,
    color: '#64748B',
  },
  joinLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  joinLinkBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#064E3B',
  },
  saveEventBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveEventBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  oppCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  oppCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  oppTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  oppTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#064E3B',
  },
  oppCompTag: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  oppCompText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#064E3B',
  },
  oppTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  oppDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  oppFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  applyRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  applyRoleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  savedVaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 12,
  },
  savedVaultIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedVaultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  savedVaultMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  removeSavedBtn: {
    padding: 6,
  },
  capacityBarWrapper: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  capacityBarFill: {
    height: '100%',
    backgroundColor: '#064E3B',
    borderRadius: 3,
  },
  membersListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberFullName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  youBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#064E3B',
  },
  memberHandle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  memberAcademicTitle: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  memberActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  memberRoleBadge: {
    backgroundColor: '#F1F5F9',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  ownerBadgeText: {
    color: '#064E3B',
  },
  memberRoleBadgeText: {
    color: '#64748B',
  },
  removeMemberBtn: {
    padding: 4,
  },
  leavePodSection: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  leavePodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  leavePodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  doiInputWrapper: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  resolveDoiBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  resolvedDoiPreviewBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  resolvedDoiTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  resolvedDoiSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  modalSubmitBtn: {
    backgroundColor: '#064E3B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalSubmitBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  typeSelectChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  typeSelectChipActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  typeSelectChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  typeSelectChipTextActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  statusBanner: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusSuccess: {
    backgroundColor: '#ECFDF5',
  },
  statusError: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: '#064E3B',
  },
  statusTextError: {
    color: '#DC2626',
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
  searchUserAffil: {
    fontSize: 11,
    color: '#64748B',
  },
  inviteUserBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inviteUserBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  inviteUserBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inviteUserBtnTextDisabled: {
    color: '#94A3B8',
  },
});
