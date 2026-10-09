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
  Alert,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
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
  CornerUpRight,
  ClipboardList,
  Camera,
  Mic,
  Tag,
  Check,
  CheckCheck,
  Maximize2,
  Image as ImageIcon,
  Pin,
  PinOff,
  Smile,
  Reply,
  Copy,
  Pencil,
  AtSign,
  MoreVertical,
  FolderOpen,
  Paperclip,
  AlertTriangle,
  Heart,
  Vote,
  BarChart2,
  User,
  Sparkles as SparklesIcon,
  Download,
  BookOpen,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
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
  WorkspaceDocumentMetadata,
  WorkspacePostMetadata,
  WorkspaceProfileMetadata,
  WorkspaceInviteMetadata,
} from '../../types/workspace';
import { WorkspaceDoiCard } from './WorkspaceDoiCard';
import { WorkspaceInfoModal } from './WorkspaceInfoModal';
import { WorkspaceExportModal } from './WorkspaceExportModal';
import { ImageViewerModal } from '../modals/ImageViewerModal';
import { VoiceNotePlayer } from '../chat/VoiceNotePlayer';
import { VoiceNoteRecorder } from '../chat/VoiceNoteRecorder';
import { ChatDocumentCard } from '../chat/ChatDocumentCard';
import { ChatPostCard } from '../chat/ChatPostCard';
import { ChatProfileCard } from '../chat/ChatProfileCard';
import { ChatWorkspaceInviteCard } from '../chat/ChatWorkspaceInviteCard';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { resolvePaper } from '../../api/paperResolver';
import { uploadPostImage } from '../../api/storageService';
import { searchBooffInUsers } from '../../api/search/providers/userSearchProvider';

const SAMPLE_POD_MANUSCRIPTS = [
  {
    name: 'Quantum_Entanglement_Macroscopic_State_2026.pdf',
    sizeBytes: 1024 * 840,
    pageCount: 14,
    fileUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
  },
  {
    name: 'CRISPR_Targeting_Efficiency_Protocol_v3.pdf',
    sizeBytes: 1024 * 1250,
    pageCount: 22,
    fileUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
  },
  {
    name: 'Deep_Brain_Stimulation_Neural_Plasticity_Dataset.pdf',
    sizeBytes: 1024 * 510,
    pageCount: 8,
    fileUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
  },
];

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
  const toggleReaction = useWorkspaceStore((s) => s.toggleReaction);
  const editMessage = useWorkspaceStore((s) => s.editMessage);
  const deleteMessage = useWorkspaceStore((s) => s.deleteMessage);
  const forwardMessage = useWorkspaceStore((s) => s.forwardMessage);

  // Workspaces for Forwarding
  const dms = useWorkspaceStore((s) => s.dms);
  const communities = useWorkspaceStore((s) => s.communities);
  const innerCircles = useWorkspaceStore((s) => s.innerCircles);

  // User Role & Permissions (Step 2: Roles & Permissions)
  const isOwner = workspace.owner_id === currentUser?.id;
  const myMembership = members.find((m) => m.user_id === currentUser?.id);
  const myRole = isOwner ? 'owner' : (myMembership?.role || 'member');
  const isAdminOrOwner = isOwner || myRole === 'owner' || myRole === 'admin';
  const isModOrAbove = isAdminOrOwner || myRole === 'moderator';

  const canPost = !workspace.settings?.only_admins_post || isAdminOrOwner;
  const canInvite = !workspace.settings?.only_admins_invite || isAdminOrOwner;
  const canPin = !workspace.settings?.only_admins_pin || isAdminOrOwner;

  // Discussions State
  const [inputText, setInputText] = useState('');
  const [showDoiModal, setShowDoiModal] = useState(false);
  const [doiQuery, setDoiQuery] = useState('');
  const [isResolvingDoi, setIsResolvingDoi] = useState(false);
  const [resolvedDoi, setResolvedDoi] = useState<DoiMetadata | null>(null);
  const [attachedDoi, setAttachedDoi] = useState<DoiMetadata | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Replying To State (Group Chat)
  const [replyingTo, setReplyingTo] = useState<WorkspaceMessage | null>(null);

  // Long-Press Message Context Menu State
  const [selectedMessage, setSelectedMessage] = useState<WorkspaceMessage | null>(null);
  const [showMessageActionMenu, setShowMessageActionMenu] = useState(false);

  // Edit Message Modal State
  const [editingMessage, setEditingMessage] = useState<WorkspaceMessage | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Forward Message Modal State
  const [forwardingMessage, setForwardingMessage] = useState<WorkspaceMessage | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [forwardingTargetId, setForwardingTargetId] = useState<string | null>(null);

  // Search & Filter State
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [activeChatFilter, setActiveChatFilter] = useState<'all' | 'papers' | 'photos' | 'polls'>('all');

  // Pinned Announcement / Message in Pod State
  const [localPinnedMessageId, setLocalPinnedMessageId] = useState<string | null>(null);

  // Mentions (@username, @everyone, @admins) State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentionPopup, setShowMentionPopup] = useState(false);

  // Full-screen Image Viewer Modal State
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Filtered & Searched Messages (with Step 4 Ephemeral Filtering)
  const displayedMessages = useMemo(() => {
    let list = messages;

    // Ephemeral message filtering if enabled by pod admin
    const timer = workspace.settings?.ephemeral_timer;
    if (timer && timer !== 'off') {
      const now = Date.now();
      let maxAgeMs = 24 * 60 * 60 * 1000;
      if (timer === '7d') maxAgeMs = 7 * 24 * 60 * 60 * 1000;
      else if (timer === '30d') maxAgeMs = 30 * 24 * 60 * 60 * 1000;

      list = list.filter((m) => {
        const msgTime = new Date(m.created_at).getTime();
        return now - msgTime < maxAgeMs;
      });
    }

    // Filter by type if active
    if (activeChatFilter === 'papers') {
      list = list.filter((m) => Boolean(m.doi_metadata) || m.message_type === 'paper_doi');
    } else if (activeChatFilter === 'photos') {
      list = list.filter(
        (m) =>
          m.message_type === 'image' ||
          Boolean(m.media_urls && m.media_urls.length > 0) ||
          m.content === '📷 Shared photo'
      );
    } else if (activeChatFilter === 'polls') {
      list = list.filter((m) => m.message_type === 'poll' || m.content.startsWith('📊 Poll:'));
    }

    // Search query
    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.toLowerCase();
      list = list.filter((m) => {
        const contentMatch = (m.content || '').toLowerCase().includes(q);
        const senderMatch = (m.sender?.fullName || '').toLowerCase().includes(q);
        const doiMatch = (m.doi_metadata?.title || '').toLowerCase().includes(q);
        return contentMatch || senderMatch || doiMatch;
      });
    }

    return list;
  }, [messages, activeChatFilter, chatSearchQuery, workspace.settings?.ephemeral_timer]);

  // Pinned Message
  const pinnedMessage = useMemo(() => {
    if (localPinnedMessageId) {
      return messages.find((m) => m.id === localPinnedMessageId) || null;
    }
    return messages.find((m) => m.is_pinned) || null;
  }, [messages, localPinnedMessageId]);

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
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  // Step 3: Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // Step 3: Attachment & Rich Card Modals
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showDocumentPickerModal, setShowDocumentPickerModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [localPollVotes, setLocalPollVotes] = useState<Record<string, string>>({});

  const [showPostPickerModal, setShowPostPickerModal] = useState(false);
  const [postTitleInput, setPostTitleInput] = useState('');
  const [postSnippetInput, setPostSnippetInput] = useState('');

  const [showProfilePickerModal, setShowProfilePickerModal] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingProfileUsers, setIsSearchingProfileUsers] = useState(false);

  const [showInvitePickerModal, setShowInvitePickerModal] = useState(false);

  // Step 3: Voice Note Send Handler
  const handleSendVoiceNote = async (audioData: { duration: number; waveform: number[]; uri?: string }) => {
    setIsRecordingVoice(false);
    const replyId = replyingTo?.id || null;

    const res = await sendMessage({
      workspace_id: workspace.id,
      content: '🎙️ Voice Note',
      message_type: 'audio',
      audio_metadata: {
        duration: audioData.duration,
        waveform: audioData.waveform,
      },
      reply_to_id: replyId,
    });

    if (res.success) {
      setReplyingTo(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Step 3: Poll Creation Handler
  const handleCreatePoll = async () => {
    const q = pollQuestion.trim();
    const validOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!q || validOpts.length < 2) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a question and at least 2 options for the poll.');
      } else {
        Alert.alert('Incomplete Poll', 'Please enter a question and at least 2 options.');
      }
      return;
    }

    setIsCreatingPoll(true);
    try {
      const res = await sendMessage({
        workspace_id: workspace.id,
        content: `📊 Poll: ${q}\n${validOpts.map((opt) => `• ${opt}`).join('\n')}`,
        message_type: 'poll',
        doi_metadata: null,
        reply_to_id: replyingTo?.id || null,
      });

      if (res.success) {
        setShowPollModal(false);
        setShowAttachMenu(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setReplyingTo(null);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err: any) {
      console.warn('Create poll error:', err);
    } finally {
      setIsCreatingPoll(false);
    }
  };

  // Step 3: Handle Poll Voting
  const handleVote = (messageId: string, optionId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setLocalPollVotes((prev) => ({
      ...prev,
      [messageId]: prev[messageId] === optionId ? '' : optionId,
    }));
  };

  // Step 3: Share Document / PDF Manuscript Handler
  const handleAttachDocument = async (doc: { name: string; sizeBytes: number; pageCount: number; fileUrl: string }) => {
    setShowDocumentPickerModal(false);
    setShowAttachMenu(false);
    const docMeta: WorkspaceDocumentMetadata = {
      name: doc.name,
      sizeBytes: doc.sizeBytes,
      fileUrl: doc.fileUrl,
      mimeType: 'application/pdf',
      pageCount: doc.pageCount,
    };

    await sendMessage({
      workspace_id: workspace.id,
      content: `📄 Manuscript: ${doc.name}`,
      message_type: 'document',
      document_metadata: docMeta,
      reply_to_id: replyingTo?.id || null,
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Step 3: Share BooffIn Post Handler
  const handleSharePost = async () => {
    const title = postTitleInput.trim();
    if (!title) return;

    setShowPostPickerModal(false);
    setShowAttachMenu(false);
    const postMeta: WorkspacePostMetadata = {
      id: `post_${Date.now()}`,
      title,
      author_name: currentUser?.fullName || currentUser?.handle || 'BooffIn Researcher',
      author_avatar: currentUser?.avatarUrl || null,
      snippet: postSnippetInput.trim() || 'New research findings, experiment data, and academic analysis shared on BooffIn.',
      upvotes: 42,
      tags: ['Biotechnology', 'PeerReview', 'Preprint'],
    };

    setPostTitleInput('');
    setPostSnippetInput('');

    await sendMessage({
      workspace_id: workspace.id,
      content: `🔬 BooffIn Post: ${title}`,
      message_type: 'post',
      post_metadata: postMeta,
      reply_to_id: replyingTo?.id || null,
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Step 3: Search Users for Profile Sharing
  const handleSearchProfileUsers = async (query: string) => {
    setUserSearchText(query);
    const clean = query.trim().replace(/^@/, '');
    if (!clean || clean.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingProfileUsers(true);
    try {
      const results = await searchBooffInUsers(clean, 5);
      setUserSearchResults(results);
    } catch {
      setUserSearchResults([]);
    } finally {
      setIsSearchingProfileUsers(false);
    }
  };

  // Step 3: Share Researcher Profile Handler
  const handleShareProfile = async (userProfile: any) => {
    setShowProfilePickerModal(false);
    setShowAttachMenu(false);
    setUserSearchText('');
    setUserSearchResults([]);

    const profileMeta: WorkspaceProfileMetadata = {
      id: userProfile.id,
      fullName: userProfile.fullName || userProfile.name || 'Researcher',
      handle: userProfile.handle || userProfile.username || 'researcher',
      avatarUrl: userProfile.avatarUrl || userProfile.avatar_url || null,
      academicTitle: userProfile.academicTitle || userProfile.title || 'Academic Researcher',
      institution: userProfile.institution || null,
      orcidVerified: Boolean(userProfile.orcidVerified || userProfile.orcid_verified),
    };

    await sendMessage({
      workspace_id: workspace.id,
      content: `👤 Researcher Profile: ${profileMeta.fullName}`,
      message_type: 'profile',
      profile_metadata: profileMeta,
      reply_to_id: replyingTo?.id || null,
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Step 3: Share Workspace / Pod Invite Handler
  const handleShareWorkspaceInvite = async (targetWs: Workspace) => {
    setShowInvitePickerModal(false);
    setShowAttachMenu(false);
    const inviteMeta: WorkspaceInviteMetadata = {
      id: targetWs.id,
      name: targetWs.name || 'Research Pod',
      type: targetWs.type === 'inner_circle' ? 'inner_circle' : 'community',
      avatarUrl: targetWs.avatar_url || null,
      description: targetWs.description || 'Join our private research pod to collaborate on active projects and papers.',
      members_count: targetWs.members_count || 5,
    };

    await sendMessage({
      workspace_id: workspace.id,
      content: `🏛️ Workspace Invite: ${inviteMeta.name}`,
      message_type: 'workspace_invite',
      workspace_invite_metadata: inviteMeta,
      reply_to_id: replyingTo?.id || null,
    });

    setReplyingTo(null);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        if (Platform.OS === 'web') window.alert('Please allow photo permissions.');
        else Alert.alert('Permission Denied', 'Please grant photo library access to upload photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      if (currentUser?.id) {
        setIsUploadingMedia(true);
        const uploadRes = await uploadPostImage(currentUser.id, asset);
        if (uploadRes.success && uploadRes.url) {
          await sendMessage({
            workspace_id: workspace.id,
            content: '📷 Shared photo',
            message_type: 'image',
            media_urls: [uploadRes.url],
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } else {
          if (Platform.OS === 'web') window.alert(uploadRes.error || 'Failed to upload photo.');
          else Alert.alert('Upload Failed', uploadRes.error || 'Failed to upload photo.');
        }
      }
    } catch (err) {
      console.warn('Pick image error:', err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

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

  // Input change & Mention detection
  const handleInputChange = (text: string) => {
    setInputText(text);
    const lastWord = text.split(/\s+/).pop() || '';
    if (lastWord.startsWith('@')) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setShowMentionPopup(true);
    } else {
      setShowMentionPopup(false);
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (tag: string) => {
    const words = inputText.split(/\s+/);
    words.pop();
    const prefix = words.length > 0 ? words.join(' ') + ' ' : '';
    const updated = `${prefix}@${tag} `;
    setInputText(updated);
    setShowMentionPopup(false);
    setMentionQuery(null);
  };

  // Mention Suggestions List
  const mentionSuggestions = useMemo(() => {
    const list: Array<{ id: string; name: string; handle: string; avatarUrl?: string | null; isSpecial?: boolean }> = [
      { id: 'everyone', name: 'Everyone in Pod', handle: 'everyone', isSpecial: true },
      { id: 'admins', name: 'Pod Admins & Leads', handle: 'admins', isSpecial: true },
    ];

    members.forEach((m) => {
      const p = m.profile;
      if (p && p.id !== currentUser?.id) {
        list.push({
          id: p.id,
          name: p.fullName || p.handle || 'Researcher',
          handle: p.handle || (p.fullName ? p.fullName.toLowerCase().replace(/\s+/g, '_') : 'user'),
          avatarUrl: p.avatarUrl,
        });
      }
    });

    if (!mentionQuery) return list;
    const q = mentionQuery.toLowerCase();
    return list.filter(
      (item) => item.name.toLowerCase().includes(q) || item.handle.toLowerCase().includes(q)
    );
  }, [members, currentUser?.id, mentionQuery]);

  // Send Message with reply_to_id
  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed && !attachedDoi) return;

    const replyId = replyingTo?.id || null;

    const res = await sendMessage({
      workspace_id: workspace.id,
      content: trimmed || (attachedDoi ? `Shared paper: ${attachedDoi.title}` : ''),
      message_type: attachedDoi ? 'paper_doi' : 'text',
      doi_metadata: attachedDoi,
      reply_to_id: replyId,
    });

    if (res.success) {
      setInputText('');
      setAttachedDoi(null);
      setReplyingTo(null);
      setShowMentionPopup(false);
      setMentionQuery(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Long-Press Message
  const handleLongPressMessage = (msg: WorkspaceMessage) => {
    if (msg.is_deleted) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSelectedMessage(msg);
    setShowMessageActionMenu(true);
  };

  // Toggle Emoji Reaction
  const handleToggleReaction = async (msgId: string, emoji: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setShowMessageActionMenu(false);
    await toggleReaction(msgId, emoji);
  };

  // Copy Message Text
  const handleCopyMessage = async () => {
    if (!selectedMessage) return;
    setShowMessageActionMenu(false);
    await Clipboard.setStringAsync(selectedMessage.content || '');
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  // Toggle Pin Message to Pod
  const handleTogglePinMessage = async () => {
    if (!selectedMessage) return;
    if (!canPin) {
      if (Platform.OS === 'web') window.alert('Only Pod Admins can pin announcements.');
      else Alert.alert('Permission Denied', 'Only Pod Admins can pin announcements in this pod.');
      return;
    }
    const msgId = selectedMessage.id;
    setShowMessageActionMenu(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setLocalPinnedMessageId((curr) => (curr === msgId ? null : msgId));
  };

  // Start Reply
  const handleStartReply = () => {
    if (!selectedMessage) return;
    setReplyingTo(selectedMessage);
    setShowMessageActionMenu(false);
  };

  // Edit Message Handlers
  const handleStartEdit = () => {
    if (!selectedMessage) return;
    setEditingMessage(selectedMessage);
    setEditInputText(selectedMessage.content || '');
    setShowMessageActionMenu(false);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editInputText.trim()) return;
    setIsSavingEdit(true);
    await editMessage(editingMessage.id, editInputText.trim());
    setIsSavingEdit(false);
    setEditingMessage(null);
    setEditInputText('');
  };

  // Delete Message Handlers
  const handleDeleteMessage = async (deleteForEveryone = true) => {
    if (!selectedMessage) return;
    const msgId = selectedMessage.id;
    setShowMessageActionMenu(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    await deleteMessage(msgId, deleteForEveryone);
  };

  // Bookmark Message
  const handleBookmarkMessage = async () => {
    if (!selectedMessage) return;
    setShowMessageActionMenu(false);
    await saveItem({
      workspaceId: workspace.id,
      itemType: 'message',
      itemId: selectedMessage.id,
      note: selectedMessage.content?.slice(0, 80),
    });
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  // Forward Handlers
  const handleStartForward = () => {
    if (!selectedMessage) return;
    setForwardingMessage(selectedMessage);
    setShowMessageActionMenu(false);
  };

  const handleSendForward = async (targetId: string) => {
    if (!forwardingMessage) return;
    setForwardingTargetId(targetId);
    await forwardMessage(targetId, forwardingMessage);
    setForwardingTargetId(null);
    setForwardingMessage(null);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
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

  // Helper to render formatted message content with highlight for @mentions
  const renderMessageContent = (content: string, isMe: boolean) => {
    if (!content) return null;
    const parts = content.split(/(@[a-zA-Z0-9_]+)/g);
    return (
      <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            const isSpecial = part === '@everyone' || part === '@admins';
            return (
              <Text
                key={i}
                style={[
                  styles.mentionHighlight,
                  isMe ? styles.mentionHighlightMe : styles.mentionHighlightOther,
                  isSpecial && styles.mentionHighlightSpecial,
                ]}
              >
                {part}
              </Text>
            );
          }
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Bar matching BooffIn academic aesthetic */}
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
          onPress={() => setShowInfoModal(true)}
          style={styles.headerCenter}
        >
          <GroupCollageAvatar size={34} name={workspace.name} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {workspace.name || "BooffIn's inner circle"}
              </Text>
              <Shield size={13} color="#164E3F" />
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'} • Confidential Pod
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          {/* Quick Export Lab Record Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowExportModal(true)}
            style={styles.headerIconBtn}
          >
            <BookOpen size={18} color="#164E3F" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowSearchBar((v) => !v)}
            style={[styles.headerIconBtn, showSearchBar && styles.headerIconBtnActive]}
          >
            <Search size={19} color={showSearchBar ? '#164E3F' : '#475569'} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!canInvite) {
                if (Platform.OS === 'web') window.alert('Only Pod Admins can invite new members to this pod.');
                else Alert.alert('Permission Denied', 'Only Pod Admins can invite new members to this pod.');
                return;
              }
              setShowInviteModal(true);
            }}
            style={styles.headerIconBtn}
          >
            <Plus size={20} color="#164E3F" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Step 4: Disappearing / Ephemeral Messages Header Pill */}
      {workspace.settings?.ephemeral_timer && workspace.settings.ephemeral_timer !== 'off' && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowInfoModal(true)}
          style={styles.ephemeralBannerStrip}
        >
          <Clock size={12} color="#164E3F" />
          <Text style={styles.ephemeralBannerText}>
            Disappearing messages: {workspace.settings.ephemeral_timer === '24h' ? '24 Hours' : workspace.settings.ephemeral_timer === '7d' ? '7 Days' : '30 Days'}
          </Text>
          <Text style={styles.ephemeralBannerSub}>• Tap to adjust</Text>
        </TouchableOpacity>
      )}

      {/* 1b. In-Pod Search & Filter Strip */}
      {showSearchBar && (
        <View style={styles.inPodSearchBarContainer}>
          <View style={styles.searchBarInputWrap}>
            <Search size={15} color="#94A3B8" />
            <TextInput
              value={chatSearchQuery}
              onChangeText={setChatSearchQuery}
              placeholder="Search pod messages, papers, members..."
              placeholderTextColor="#94A3B8"
              style={styles.searchBarInput}
              autoFocus
            />
            {chatSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setChatSearchQuery('')}>
                <X size={15} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.searchFilterChipsRow}
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'papers', label: '📄 Papers & DOIs' },
                { id: 'photos', label: '📷 Media' },
                { id: 'polls', label: '📊 Polls' },
              ] as const
            ).map((chip) => (
              <TouchableOpacity
                key={chip.id}
                onPress={() => setActiveChatFilter(chip.id)}
                style={[
                  styles.searchFilterChip,
                  activeChatFilter === chip.id && styles.searchFilterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.searchFilterChipText,
                    activeChatFilter === chip.id && styles.searchFilterChipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 2. Sub-Filter Pill Strip */}
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

      {/* 3. Main Discussions Feed */}
      {activeTab === 'discussions' && (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* Pinned Announcement / Message Banner */}
          {pinnedMessage && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const idx = displayedMessages.findIndex((m) => m.id === pinnedMessage.id);
                if (idx >= 0 && flatListRef.current) {
                  flatListRef.current.scrollToIndex({ index: idx, animated: true });
                }
              }}
              style={styles.pinnedBannerContainer}
            >
              <View style={styles.pinnedIconBadge}>
                <Pin size={13} color="#164E3F" fill="#164E3F" />
              </View>
              <View style={styles.pinnedContentWrap}>
                <View style={styles.pinnedHeaderRow}>
                  <Text style={styles.pinnedBadgeLabel}>Pinned Announcement</Text>
                  <Text style={styles.pinnedAuthorLabel}>
                    • {pinnedMessage.sender?.fullName || 'Researcher'}
                  </Text>
                </View>
                <Text style={styles.pinnedSnippetText} numberOfLines={1}>
                  {pinnedMessage.content || (pinnedMessage.doi_metadata ? `📄 ${pinnedMessage.doi_metadata.title}` : '📷 Photo Attachment')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLocalPinnedMessageId(null)}
                style={styles.pinnedCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          {/* Centered Date Capsule: Today */}
          <View style={styles.dateCapsuleContainer}>
            <View style={styles.dateCapsule}>
              <Text style={styles.dateCapsuleText}>Today</Text>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={displayedMessages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            ListEmptyComponent={
              <View style={styles.emptyMessagesContainer}>
                <View style={styles.emptyIconCircle}>
                  <MessageSquare size={32} color="#164E3F" />
                </View>
                <Text style={styles.emptyMessagesTitle}>
                  {chatSearchQuery.trim() ? 'No matching discussions' : 'Welcome to the Research Pod'}
                </Text>
                <Text style={styles.emptyMessagesSub}>
                  {chatSearchQuery.trim()
                    ? `No messages matched "${chatSearchQuery}". Try clearing filters.`
                    : 'Share preprints, discuss methodology, assign tasks, and tag collaborators.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === currentUser?.id;
              const isPinnedThis = item.is_pinned || item.id === localPinnedMessageId;
              const isDeleted = Boolean(item.is_deleted);

              const extractImageUrl = (m: WorkspaceMessage) => {
                if (m.media_urls && m.media_urls.length > 0 && typeof m.media_urls[0] === 'string' && m.media_urls[0].startsWith('http')) {
                  return m.media_urls[0];
                }
                if (Array.isArray(m.attachments)) {
                  for (const a of m.attachments) {
                    if (typeof a === 'string' && a.startsWith('http')) return a;
                    if (a?.url && typeof a.url === 'string' && a.url.startsWith('http')) return a.url;
                    if (a?.uri && typeof a.uri === 'string' && a.uri.startsWith('http')) return a.uri;
                    if (a?.imageUrl && typeof a.imageUrl === 'string' && a.imageUrl.startsWith('http')) return a.imageUrl;
                    if (a?.image_url && typeof a.image_url === 'string' && a.image_url.startsWith('http')) return a.image_url;
                  }
                } else if (m.attachments && typeof m.attachments === 'object') {
                  if (Array.isArray(m.attachments.media_urls) && m.attachments.media_urls.length > 0) {
                    const first = m.attachments.media_urls[0];
                    if (typeof first === 'string' && first.startsWith('http')) return first;
                  }
                  if (m.attachments.url && typeof m.attachments.url === 'string' && m.attachments.url.startsWith('http')) {
                    return m.attachments.url;
                  }
                  if (m.attachments.uri && typeof m.attachments.uri === 'string' && m.attachments.uri.startsWith('http')) {
                    return m.attachments.uri;
                  }
                  if (m.attachments.imageUrl && typeof m.attachments.imageUrl === 'string' && m.attachments.imageUrl.startsWith('http')) {
                    return m.attachments.imageUrl;
                  }
                  if (m.attachments.image_url && typeof m.attachments.image_url === 'string' && m.attachments.image_url.startsWith('http')) {
                    return m.attachments.image_url;
                  }
                }
                if (typeof m.content === 'string') {
                  if (m.content.startsWith('http://') || m.content.startsWith('https://')) {
                    return m.content.trim();
                  }
                  const match = m.content.match(/https?:\/\/[^\s]+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif|\/profile-media\/[^\s]+|\/storage\/v1\/object\/public\/[^\s]+|\/workspace-media\/[^\s]+)/i);
                  if (match) {
                    return match[0];
                  }
                }
                return null;
              };

              const msgImageUrl = extractImageUrl(item);
              const resolvedDocMeta = item.document_metadata || (item.attachments as any)?.document_metadata || (
                (item.message_type === 'document' || item.content?.startsWith('📄 Manuscript:')) ? {
                  name: item.content?.replace(/^📄\s*(?:Manuscript:\s*)?/, '').trim() || 'Novel_Neural_Mechanisms_Preprint.pdf',
                  sizeBytes: 1024 * 1024 * 2.4,
                  fileUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
                  mimeType: 'application/pdf',
                  pageCount: 18,
                } : null
              );

              const resolvedInviteMeta = item.workspace_invite_metadata || (item.attachments as any)?.workspace_invite_metadata || (
                (item.message_type === 'workspace_invite' || item.content?.startsWith('🤝 Pod Invite:')) ? {
                  workspaceId: workspace.id,
                  name: item.content?.replace(/^🤝\s*(?:Pod Invite:\s*)?/, '').trim() || workspace.name || 'Inner Circle Pod',
                  description: workspace.description || 'Collaborative private research pod on BoffIn',
                  role: 'member' as const,
                  memberCount: 8,
                  privacy: 'private' as const,
                } : null
              );

              const resolvedPostMeta = item.post_metadata || (item.attachments as any)?.post_metadata || null;
              const resolvedProfileMeta = item.profile_metadata || (item.attachments as any)?.profile_metadata || null;
              const resolvedCallMeta = item.call_metadata || (item.attachments as any)?.call_metadata || null;
              const resolvedAudioMeta = item.audio_metadata || (item.attachments as any)?.audio_metadata || null;
              const resolvedDoiMeta = item.doi_metadata || (item.attachments as any)?.doi_metadata || null;
              const resolvedPollData = item.poll_data || (item.attachments as any)?.poll_data || null;

              const isDocument = !isDeleted && Boolean(resolvedDocMeta);
              const isWorkspaceInvite = !isDeleted && Boolean(resolvedInviteMeta);
              const isPost = !isDeleted && Boolean(resolvedPostMeta);
              const isProfile = !isDeleted && Boolean(resolvedProfileMeta);
              const isCallLog = !isDeleted && (Boolean(resolvedCallMeta) || item.message_type === 'call_log');
              const isImage = !isDeleted && (item.message_type === 'image' || Boolean(msgImageUrl) || item.content === '📷 Shared photo');
              const isPoll = !isDeleted && (item.message_type === 'poll' || item.content.startsWith('📊 Poll:') || Boolean(resolvedPollData));
              const isAudio =
                !isDeleted &&
                (item.message_type === 'audio' ||
                  item.message_type === 'voice_note' ||
                  Boolean(resolvedAudioMeta) ||
                  item.content.startsWith('🎙️ Voice Note'));

              // Parse poll options if poll message
              let pollQuestionText = '';
              let pollOptionItems: Array<{ id: string; text: string }> = [];
              if (isPoll) {
                const lines = item.content.split('\n').filter(Boolean);
                pollQuestionText = lines[0].replace('📊 Poll:', '').trim();
                pollOptionItems = lines.slice(1).map((line: string, idx: number) => ({
                  id: `opt_${idx}`,
                  text: line.replace(/^[•\-\d\.]+\s*/, '').trim(),
                }));
                if (pollOptionItems.length === 0) {
                  pollOptionItems = [
                    { id: 'opt_0', text: 'Agree / Support' },
                    { id: 'opt_1', text: 'Needs Revision' },
                  ];
                }
              }

              const mySelectedVote = localPollVotes[item.id];

              // Reactions summary
              const reactionsMap: Record<string, string[]> = (item.reactions as Record<string, string[]>) || {};
              const reactionEntries = Object.entries(reactionsMap).filter(([_, uids]) => Array.isArray(uids) && uids.length > 0);

              // Quoted reply lookup
              const replyParent = item.reply_to_id
                ? messages.find((m) => m.id === item.reply_to_id) || item.reply_to_message
                : item.reply_to_message;

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

                  <TouchableOpacity
                    activeOpacity={0.92}
                    onLongPress={() => handleLongPressMessage(item)}
                    style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}
                  >
                    {/* Pinned Tag */}
                    {isPinnedThis && (
                      <View style={styles.bubblePinTag}>
                        <Pin size={10} color={isMe ? '#A7F3D0' : '#164E3F'} fill={isMe ? '#A7F3D0' : '#164E3F'} />
                        <Text style={[styles.bubblePinTagText, isMe && { color: '#A7F3D0' }]}>Pinned</Text>
                      </View>
                    )}

                    {!isMe && (
                      <Text style={styles.senderName}>{item.sender?.fullName || 'Researcher'}</Text>
                    )}

                    {/* Quoted Reply Box */}
                    {replyParent && (
                      <View style={[styles.quotedReplyBox, isMe ? styles.quotedReplyBoxMe : styles.quotedReplyBoxOther]}>
                        <View style={[styles.quotedReplyAccent, isMe ? styles.quotedAccentMe : styles.quotedAccentOther]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.quotedReplySender, isMe ? styles.quotedSenderMe : styles.quotedSenderOther]} numberOfLines={1}>
                            {replyParent.sender?.fullName || (replyParent as any).sender_name || 'Researcher'}
                          </Text>
                          <Text style={[styles.quotedReplySnippet, isMe ? styles.quotedSnippetMe : styles.quotedSnippetOther]} numberOfLines={2}>
                            {replyParent.content || 'Shared attachment'}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* DOI Paper Card */}
                    {resolvedDoiMeta && <WorkspaceDoiCard doiMeta={resolvedDoiMeta} />}

                    {/* Voice Note / Audio Player */}
                    {isAudio && (
                      <VoiceNotePlayer
                        audioUrl={item.media_urls?.[0]}
                        duration={resolvedAudioMeta?.duration || 18}
                        waveform={resolvedAudioMeta?.waveform}
                        isMe={isMe}
                      />
                    )}

                    {/* Shared Document / PDF Manuscript Card */}
                    {isDocument && resolvedDocMeta && (
                      <ChatDocumentCard docMeta={resolvedDocMeta} isMe={isMe} />
                    )}

                    {/* Shared BooffIn Post Card */}
                    {isPost && resolvedPostMeta && (
                      <ChatPostCard postMeta={resolvedPostMeta} isMe={isMe} />
                    )}

                    {/* Shared Researcher Profile Card */}
                    {isProfile && resolvedProfileMeta && (
                      <ChatProfileCard profileMeta={resolvedProfileMeta} isMe={isMe} />
                    )}

                    {/* Shared Workspace / Pod Invite Card */}
                    {isWorkspaceInvite && resolvedInviteMeta && (
                      <ChatWorkspaceInviteCard inviteMeta={resolvedInviteMeta} isMe={isMe} />
                    )}

                    {/* Image Attachment */}
                    {isImage && !isDeleted && (
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => {
                          if (msgImageUrl) {
                            setViewerImages([msgImageUrl]);
                            setViewerVisible(true);
                          }
                        }}
                        style={styles.imageMsgContainer}
                      >
                        {msgImageUrl ? (
                          <>
                            <ExpoImage
                              source={{ uri: msgImageUrl }}
                              style={styles.imageMsg}
                              contentFit="cover"
                              transition={200}
                            />
                            <View style={styles.imageOverlayBadge}>
                              <Maximize2 size={12} color="#FFFFFF" />
                              <Text style={styles.imageOverlayText}>View photo</Text>
                            </View>
                          </>
                        ) : (
                          <View style={styles.imagePlaceholderBox}>
                            <ImageIcon size={30} color="#94A3B8" />
                            <Text style={styles.imagePlaceholderText}>Photo attachment</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Interactive Poll / Consensus Voting */}
                    {isPoll && (
                      <View style={styles.pollMsgContainer}>
                        <View style={styles.pollHeader}>
                          <BarChart2 size={16} color="#164E3F" />
                          <Text style={styles.pollBadgeText}>RESEARCH POLL</Text>
                        </View>
                        <Text style={styles.pollQuestionTitle}>{pollQuestionText || item.content}</Text>

                        <View style={styles.pollOptionsList}>
                          {pollOptionItems.map((opt) => {
                            const isSelected = mySelectedVote === opt.id;
                            return (
                              <TouchableOpacity
                                key={opt.id}
                                activeOpacity={0.7}
                                onPress={() => handleVote(item.id, opt.id)}
                                style={[styles.pollOptionBtn, isSelected && styles.pollOptionBtnSelected]}
                              >
                                <View style={[styles.pollProgressFill, { width: isSelected ? '100%' : '0%' }]} />
                                <View style={styles.pollOptionContent}>
                                  <View style={[styles.pollRadio, isSelected && styles.pollRadioSelected]}>
                                    {isSelected && <View style={styles.pollRadioInner} />}
                                  </View>
                                  <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>
                                    {opt.text}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Deleted or Regular Message Content */}
                    {isDeleted ? (
                      <View style={styles.deletedMsgWrap}>
                        <Text style={[styles.deletedMsgText, isMe && { color: '#D1FAE5' }]}>
                          🚫 This message was deleted
                        </Text>
                      </View>
                    ) : item.content &&
                      !isImage &&
                      !isAudio &&
                      !isDocument &&
                      !isPost &&
                      !isProfile &&
                      !isWorkspaceInvite &&
                      !isPoll &&
                      item.content !== '📷 Shared photo' &&
                      item.content !== msgImageUrl ? (
                      renderMessageContent(item.content, isMe)
                    ) : null}

                    {/* Metadata: Edited, Time, Status */}
                    <View style={styles.messageFooterRow}>
                      {item.is_edited && !item.is_deleted && (
                        <Text style={[styles.editedIndicator, isMe ? styles.myEditedIndicator : styles.otherEditedIndicator]}>
                          (edited)
                        </Text>
                      )}
                      <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {isMe && (
                        <CheckCheck size={12} color="#A7F3D0" style={{ marginLeft: 3 }} />
                      )}
                    </View>

                    {/* Emoji Reactions Badges */}
                    {reactionEntries.length > 0 && (
                      <View style={styles.reactionsRow}>
                        {reactionEntries.map(([emoji, uids]) => {
                          const hasReacted = currentUser?.id ? uids.includes(currentUser.id) : false;
                          return (
                            <TouchableOpacity
                              key={emoji}
                              activeOpacity={0.7}
                              onPress={() => handleToggleReaction(item.id, emoji)}
                              style={[
                                styles.reactionBadge,
                                hasReacted && (isMe ? styles.reactionBadgeMeActive : styles.reactionBadgeOtherActive),
                              ]}
                            >
                              <Text style={styles.reactionEmojiText}>{emoji}</Text>
                              <Text
                                style={[
                                  styles.reactionCountText,
                                  hasReacted && (isMe ? styles.reactionCountMeActive : styles.reactionCountOtherActive),
                                ]}
                              >
                                {uids.length}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
          />

          {/* Mention Autocomplete Floating Popup */}
          {showMentionPopup && mentionSuggestions.length > 0 && (
            <View style={styles.mentionPopupContainer}>
              <View style={styles.mentionPopupHeader}>
                <AtSign size={13} color="#164E3F" />
                <Text style={styles.mentionPopupHeaderText}>Mention in Pod</Text>
              </View>
              <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="always">
                {mentionSuggestions.map((sug) => (
                  <TouchableOpacity
                    key={sug.id}
                    onPress={() => handleSelectMention(sug.handle)}
                    style={styles.mentionSuggestionRow}
                  >
                    {sug.isSpecial ? (
                      <View style={styles.mentionSpecialIconBadge}>
                        {sug.id === 'everyone' ? <Users size={14} color="#164E3F" /> : <Shield size={14} color="#164E3F" />}
                      </View>
                    ) : (
                      <Avatar uri={sug.avatarUrl || undefined} name={sug.name} size="xs" />
                    )}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.mentionSuggestionName}>{sug.name}</Text>
                      <Text style={styles.mentionSuggestionHandle}>@{sug.handle}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Attached DOI Preview banner if preparing to send */}
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

          {/* Docked Replying-To Bar */}
          {replyingTo && (
            <View style={styles.replyingToDock}>
              <View style={styles.replyingToAccent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyingToTitle} numberOfLines={1}>
                  Replying to {replyingTo.sender?.fullName || 'Researcher'}
                </Text>
                <Text style={styles.replyingToSnippet} numberOfLines={1}>
                  {replyingTo.content || (replyingTo.doi_metadata ? `📄 ${replyingTo.doi_metadata.title}` : 'Attachment')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                style={styles.replyingToCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Capsule Input Dock / Voice Note Recorder / Announcement Mode Dock */}
          {canPost ? (
            isRecordingVoice ? (
              <VoiceNoteRecorder
                onSendVoiceNote={handleSendVoiceNote}
                onCancel={() => setIsRecordingVoice(false)}
              />
            ) : (
              <View style={styles.bottomDockContainer}>
                <View style={styles.inputCapsule}>
                  <TouchableOpacity
                    onPress={handlePickImage}
                    style={styles.mediaIconBtn}
                    disabled={isUploadingMedia}
                  >
                    {isUploadingMedia ? <ActivityIndicator size="small" color="#164E3F" /> : <Camera size={19} color="#164E3F" />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowAttachMenu(true)}
                    style={styles.mediaIconBtn}
                  >
                    <Paperclip size={18} color="#164E3F" />
                  </TouchableOpacity>

                  <TextInput
                    value={inputText}
                    onChangeText={handleInputChange}
                    placeholder={`Message ${workspace.name || 'pod'}... (use @ to mention)`}
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                    multiline
                    maxLength={2000}
                  />

                  <TouchableOpacity
                    onPress={() => setIsRecordingVoice(true)}
                    style={styles.mediaIconBtn}
                  >
                    <Mic size={19} color="#164E3F" />
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
            )
          ) : (
            <View style={styles.announcementModeDockContainer}>
              <View style={styles.announcementModeDock}>
                <Lock size={15} color="#047857" />
                <Text style={styles.announcementModeDockText}>
                  Only Pod Admins & Leads can send messages in Announcement Mode.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Action Menu Modal (Long-Press on Message) */}
      <Modal
        visible={showMessageActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMessageActionMenu(false)}
        >
          <View style={styles.actionMenuCard}>
            {/* Quick Floating Reaction Bar */}
            <View style={styles.quickReactionsRow}>
              {['👍', '❤️', '🔬', '👏', '💡', '🔥', '🎉'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  activeOpacity={0.7}
                  onPress={() => selectedMessage && handleToggleReaction(selectedMessage.id, emoji)}
                  style={styles.quickEmojiBtn}
                >
                  <Text style={styles.quickEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionMenuDivider} />

            {/* Menu Options */}
            <TouchableOpacity onPress={handleStartReply} style={styles.actionMenuRow}>
              <Reply size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>Reply</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCopyMessage} style={styles.actionMenuRow}>
              <Copy size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>Copy Text</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleTogglePinMessage} style={styles.actionMenuRow}>
              <Pin size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>
                {selectedMessage && (selectedMessage.is_pinned || selectedMessage.id === localPinnedMessageId)
                  ? 'Unpin from Pod'
                  : 'Pin to Pod Banner'}
              </Text>
            </TouchableOpacity>

            {selectedMessage?.sender_id === currentUser?.id && (
              <TouchableOpacity onPress={handleStartEdit} style={styles.actionMenuRow}>
                <Pencil size={18} color="#0F172A" />
                <Text style={styles.actionMenuRowText}>Edit Message</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleStartForward} style={styles.actionMenuRow}>
              <CornerUpRight size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>Forward</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleBookmarkMessage} style={styles.actionMenuRow}>
              <Bookmark size={18} color="#0F172A" />
              <Text style={styles.actionMenuRowText}>Save to Vault / Bookmark</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDeleteMessage(selectedMessage?.sender_id === currentUser?.id)}
              style={styles.actionMenuRow}
            >
              <Trash2 size={18} color="#EF4444" />
              <Text style={[styles.actionMenuRowText, { color: '#EF4444' }]}>Delete Message</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: Edit Message */}
      <Modal
        visible={Boolean(editingMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Message</Text>
              <TouchableOpacity onPress={() => setEditingMessage(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={editInputText}
              onChangeText={setEditInputText}
              placeholder="Edit your message..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
              multiline
              autoFocus
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                onPress={() => setEditingMessage(null)}
                style={styles.cancelModalBtn}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={!editInputText.trim() || isSavingEdit}
                style={[styles.confirmAttachBtn, { marginTop: 0, flex: 1 }]}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmAttachBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Forward Message */}
      <Modal
        visible={Boolean(forwardingMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setForwardingMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Forward to Workspace</Text>
              <TouchableOpacity onPress={() => setForwardingMessage(null)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={forwardSearch}
              onChangeText={setForwardSearch}
              placeholder="Search chat or workspace..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 12 }]}
            />
            <ScrollView style={{ maxHeight: 220 }}>
              {[...innerCircles, ...communities, ...dms]
                .filter((ws) => ws.id !== workspace.id)
                .filter((ws) => (ws.name || '').toLowerCase().includes(forwardSearch.toLowerCase()))
                .map((ws) => (
                  <TouchableOpacity
                    key={ws.id}
                    onPress={() => handleSendForward(ws.id)}
                    disabled={forwardingTargetId === ws.id}
                    style={styles.forwardWsRow}
                  >
                    <GroupCollageAvatar size={32} name={ws.name} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.forwardWsName}>{ws.name || 'Chat'}</Text>
                      <Text style={styles.forwardWsType}>
                        {ws.type === 'inner_circle' ? 'Inner Circle Pod' : ws.type === 'community' ? 'Community' : 'Direct Message'}
                      </Text>
                    </View>
                    {forwardingTargetId === ws.id ? (
                      <ActivityIndicator size="small" color="#164E3F" />
                    ) : (
                      <Send size={15} color="#164E3F" />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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

      {/* Group Info Modal */}
      <WorkspaceInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        workspace={workspace}
      />

      {/* Step 4: Academic Lab Record Export Modal */}
      <WorkspaceExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        workspace={workspace}
        messages={messages}
        members={members}
      />

      {/* Full-Screen Image Viewer Modal */}
      <ImageViewerModal
        visible={viewerVisible}
        images={viewerImages}
        initialIndex={0}
        onClose={() => setViewerVisible(false)}
        authorName={workspace.name || 'Shared photo'}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Attachment Menu (Step 3: Media, Documents & Polls)     */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showAttachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachMenu(false)}
        >
          <View style={styles.attachMenuCard}>
            <Text style={styles.attachMenuHeaderTitle}>Share with Research Pod</Text>

            {/* 1. Research Manuscript PDF */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                setShowDocumentPickerModal(true);
              }}
              style={styles.attachMenuOptionRow}
            >
              <View style={[styles.attachOptionIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <FileText size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachOptionTitle}>Research Manuscript / PDF</Text>
                <Text style={styles.attachOptionSubtitle}>Share papers, protocols, and preprints</Text>
              </View>
            </TouchableOpacity>

            {/* 2. Photo / Lab Figure */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                handlePickImage();
              }}
              style={styles.attachMenuOptionRow}
            >
              <View style={[styles.attachOptionIconWrap, { backgroundColor: '#FDF2F8' }]}>
                <ImageIcon size={20} color="#DB2777" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachOptionTitle}>Photo / Lab Figure</Text>
                <Text style={styles.attachOptionSubtitle}>Share microscope slides, plots, and figures</Text>
              </View>
            </TouchableOpacity>

            {/* 3. Research Poll / Consensus Voting */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                setShowPollModal(true);
              }}
              style={styles.attachMenuOptionRow}
            >
              <View style={[styles.attachOptionIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Vote size={20} color="#164E3F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachOptionTitle}>Research Poll / Vote</Text>
                <Text style={styles.attachOptionSubtitle}>Ask pod members to vote on methodologies</Text>
              </View>
            </TouchableOpacity>

            {/* 4. BooffIn Post */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                setShowPostPickerModal(true);
              }}
              style={styles.attachMenuOptionRow}
            >
              <View style={[styles.attachOptionIconWrap, { backgroundColor: '#FDF4FF' }]}>
                <SparklesIcon size={20} color="#9333EA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachOptionTitle}>BooffIn Discussion Post</Text>
                <Text style={styles.attachOptionSubtitle}>Embed linked academic discussion</Text>
              </View>
            </TouchableOpacity>

            {/* 5. Researcher Profile */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                setShowProfilePickerModal(true);
              }}
              style={styles.attachMenuOptionRow}
            >
              <View style={[styles.attachOptionIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <User size={20} color="#164E3F" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachOptionTitle}>Researcher Profile</Text>
                <Text style={styles.attachOptionSubtitle}>Share contact card with ORCID badge</Text>
              </View>
            </TouchableOpacity>

            {/* 6. DOI Paper Link */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowAttachMenu(false);
                setShowDoiModal(true);
              }}
              style={styles.attachMenuOptionRow}
            >
              <View style={[styles.attachOptionIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <FileText size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachOptionTitle}>DOI Paper Citation</Text>
                <Text style={styles.attachOptionSubtitle}>Resolve paper via OpenAlex / CrossRef</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowAttachMenu(false)}
              style={styles.attachMenuCancelBtn}
            >
              <Text style={styles.attachMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Create Research Poll (Step 3)                          */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showPollModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPollModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={20} color="#164E3F" />
                <Text style={styles.modalTitle}>Create Research Poll</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPollModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Ask your pod collaborators to reach consensus on hypotheses or methods.</Text>

            <TextInput
              value={pollQuestion}
              onChangeText={setPollQuestion}
              placeholder="Question (e.g. Which reagent protocol should we use?)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 14 }]}
            />

            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>Options</Text>
            {pollOptions.map((opt, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TextInput
                  value={opt}
                  onChangeText={(txt) => {
                    const next = [...pollOptions];
                    next[idx] = txt;
                    setPollOptions(next);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  placeholderTextColor="#94A3B8"
                  style={[styles.doiInput, { flex: 1 }]}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity
                    onPress={() => {
                      setPollOptions((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    style={{ padding: 4 }}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {pollOptions.length < 6 && (
              <TouchableOpacity
                onPress={() => setPollOptions((prev) => [...prev, ''])}
                style={styles.addOptionBtn}
              >
                <Plus size={14} color="#164E3F" />
                <Text style={styles.addOptionBtnText}>Add Option</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleCreatePoll}
              disabled={isCreatingPoll || !pollQuestion.trim()}
              style={[styles.confirmAttachBtn, (!pollQuestion.trim() || isCreatingPoll) && { opacity: 0.6 }]}
            >
              {isCreatingPoll ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmAttachBtnText}>Post Poll to Pod</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Select Document / Manuscript PDF (Step 3)              */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showDocumentPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDocumentPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FileText size={20} color="#DC2626" />
                <Text style={styles.modalTitle}>Attach Manuscript / PDF</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDocumentPickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select a preprint manuscript or protocol document to share with the pod.</Text>

            {SAMPLE_POD_MANUSCRIPTS.map((doc, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() => handleAttachDocument(doc)}
                style={styles.sampleDocRow}
              >
                <View style={[styles.sampleDocIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <FileText size={20} color="#DC2626" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.sampleDocName} numberOfLines={1}>{doc.name}</Text>
                  <Text style={styles.sampleDocSub}>PDF • {doc.pageCount} pages • {(doc.sizeBytes / 1024).toFixed(0)} KB</Text>
                </View>
                <Text style={styles.invitePill}>Attach</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Share BooffIn Discussion Post (Step 3)                 */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showPostPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPostPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <SparklesIcon size={20} color="#9333EA" />
                <Text style={styles.modalTitle}>Share Discussion Post</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPostPickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Embed a scientific topic or discovery post into the pod.</Text>

            <TextInput
              value={postTitleInput}
              onChangeText={setPostTitleInput}
              placeholder="Post Title (e.g. Breakthrough in Room-Temp Superconductors)"
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />
            <TextInput
              value={postSnippetInput}
              onChangeText={setPostSnippetInput}
              placeholder="Post summary or key scientific takeaway..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 14 }]}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              onPress={handleSharePost}
              disabled={!postTitleInput.trim()}
              style={[styles.confirmAttachBtn, !postTitleInput.trim() && { opacity: 0.6 }]}
            >
              <Text style={styles.confirmAttachBtnText}>Share Post with Pod</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: Share Researcher Profile (Step 3)                      */}
      {/* ------------------------------------------------------------- */}
      <Modal
        visible={showProfilePickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfilePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <User size={20} color="#164E3F" />
                <Text style={styles.modalTitle}>Share Researcher Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProfilePickerModal(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Search and share verified researcher contact cards.</Text>

            <TextInput
              value={userSearchText}
              onChangeText={handleSearchProfileUsers}
              placeholder="Search researcher name or @handle..."
              placeholderTextColor="#94A3B8"
              style={[styles.doiInput, { marginBottom: 10 }]}
            />

            {isSearchingProfileUsers ? (
              <ActivityIndicator size="small" color="#164E3F" style={{ marginVertical: 12 }} />
            ) : (
              userSearchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  activeOpacity={0.7}
                  onPress={() => handleShareProfile(user)}
                  style={styles.searchUserRow}
                >
                  <Avatar uri={user.avatarUrl} name={user.fullName || user.handle} size="sm" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.searchUserName}>{user.fullName || `@${user.handle}`}</Text>
                    <Text style={styles.searchUserSub}>{user.academicTitle || user.institution || 'Researcher'}</Text>
                  </View>
                  <Text style={styles.invitePill}>Share</Text>
                </TouchableOpacity>
              ))
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
  imageMsgContainer: {
    width: 230,
    height: 175,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0F172A12',
    marginVertical: 4,
    position: 'relative',
  },
  imageMsg: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  imagePlaceholderBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  imagePlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtnActive: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
  },
  inPodSearchBarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  searchBarInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  searchFilterChipsRow: {
    gap: 6,
  },
  searchFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  searchFilterChipActive: {
    backgroundColor: '#164E3F',
  },
  searchFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  searchFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pinnedBannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  pinnedIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedContentWrap: {
    flex: 1,
  },
  pinnedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  pinnedAuthorLabel: {
    fontSize: 11,
    color: '#15803D',
    marginLeft: 3,
  },
  pinnedSnippetText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 1,
  },
  pinnedCloseBtn: {
    padding: 4,
  },
  emptyMessagesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyMessagesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyMessagesSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  bubblePinTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 3,
    alignSelf: 'flex-start',
  },
  bubblePinTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#164E3F',
  },
  quotedReplyBox: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  quotedReplyBoxMe: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  quotedReplyBoxOther: {
    backgroundColor: '#E2E8F0',
  },
  quotedReplyAccent: {
    width: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  quotedAccentMe: {
    backgroundColor: '#A7F3D0',
  },
  quotedAccentOther: {
    backgroundColor: '#164E3F',
  },
  quotedReplySender: {
    fontSize: 11,
    fontWeight: '700',
  },
  quotedSenderMe: {
    color: '#A7F3D0',
  },
  quotedSenderOther: {
    color: '#164E3F',
  },
  quotedReplySnippet: {
    fontSize: 11,
  },
  quotedSnippetMe: {
    color: '#E2E8F0',
  },
  quotedSnippetOther: {
    color: '#475569',
  },
  deletedMsgWrap: {
    paddingVertical: 2,
  },
  deletedMsgText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  messageFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 3,
  },
  editedIndicator: {
    fontSize: 9,
    fontStyle: 'italic',
    marginRight: 4,
  },
  myEditedIndicator: {
    color: '#A7F3D0',
  },
  otherEditedIndicator: {
    color: '#94A3B8',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  reactionBadgeMeActive: {
    backgroundColor: '#064E3B',
    borderColor: '#059669',
  },
  reactionBadgeOtherActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  reactionEmojiText: {
    fontSize: 12,
  },
  reactionCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  reactionCountMeActive: {
    color: '#A7F3D0',
  },
  reactionCountOtherActive: {
    color: '#164E3F',
  },
  mentionHighlight: {
    fontWeight: '700',
  },
  mentionHighlightMe: {
    color: '#A7F3D0',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  mentionHighlightOther: {
    color: '#164E3F',
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  mentionHighlightSpecial: {
    color: '#D97706',
    backgroundColor: '#FEF3C7',
  },
  mentionPopupContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mentionPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mentionPopupHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
    textTransform: 'uppercase',
  },
  mentionSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  mentionSpecialIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionSuggestionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  mentionSuggestionHandle: {
    fontSize: 11,
    color: '#64748B',
  },
  replyingToDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  replyingToAccent: {
    width: 3,
    height: '100%',
    backgroundColor: '#164E3F',
    borderRadius: 2,
  },
  replyingToTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  replyingToSnippet: {
    fontSize: 11,
    color: '#64748B',
  },
  replyingToCloseBtn: {
    padding: 4,
  },
  actionMenuCard: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  quickReactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  quickEmojiBtn: {
    padding: 6,
  },
  quickEmojiText: {
    fontSize: 22,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  actionMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
    borderRadius: 10,
  },
  actionMenuRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  cancelModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  forwardWsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  forwardWsName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  forwardWsType: {
    fontSize: 11,
    color: '#64748B',
  },
  announcementModeDockContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  announcementModeDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  announcementModeDockText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  attachMenuCard: {
    width: '92%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  attachMenuHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  attachMenuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  attachOptionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  attachOptionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  attachMenuCancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  attachMenuCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  pollMsgContainer: {
    width: 250,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 4,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pollBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#164E3F',
    letterSpacing: 0.6,
  },
  pollQuestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  pollOptionsList: {
    gap: 6,
  },
  pollOptionBtn: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pollOptionBtnSelected: {
    borderColor: '#164E3F',
    backgroundColor: '#F0FDF4',
  },
  pollProgressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#D1FAE5',
    opacity: 0.4,
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollRadioSelected: {
    borderColor: '#164E3F',
  },
  pollRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#164E3F',
  },
  pollOptionText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  pollOptionTextSelected: {
    fontWeight: '700',
    color: '#164E3F',
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    marginBottom: 12,
  },
  addOptionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#164E3F',
  },
  sampleDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sampleDocIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleDocName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  sampleDocSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  ephemeralBannerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  ephemeralBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#164E3F',
  },
  ephemeralBannerSub: {
    fontSize: 11,
    color: '#059669',
  },
});

